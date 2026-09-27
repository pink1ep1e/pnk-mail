import { NextRequest, NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE,
  verifyOAuthState,
} from "@/lib/cookie-crypto";
import {
  PNK_ID_CLIENT_ID,
  PNK_ID_URL,
  getServerPnkIdUrl,
} from "@/lib/id-auth";
import { getMailClientSecret } from "@/lib/mail-secrets";
import {
  applyActiveCookies,
  profileFromUser,
  readVaultFromRequest,
  sessionCookieOptions,
  upsertVaultAccount,
  type MailSessionUser,
} from "@/lib/mail-session";

function clientSecret(): string {
  try {
    return getMailClientSecret();
  } catch (e) {
    console.error("[auth/callback] missing PNK_ID_CLIENT_SECRET", e);
    return "";
  }
}

function redirectUri(req: NextRequest) {
  const origin =
    process.env.NEXT_PUBLIC_MAIL_URL?.replace(/\/$/, "") ||
    req.nextUrl.origin;
  return `${origin}/api/auth/callback/pnk-id`;
}

function clearStateCookie(res: NextResponse) {
  res.cookies.set(OAUTH_STATE_COOKIE, "", {
    ...sessionCookieOptions(0),
    maxAge: 0,
  });
}

async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs = 10_000,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json };
  } finally {
    clearTimeout(t);
  }
}

async function fetchUserinfo(access: string): Promise<MailSessionUser | null> {
  const base = getServerPnkIdUrl();
  const { json } = await fetchJson(`${base}/api/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${access}` },
  });
  const body = json as { ok?: boolean; data?: Record<string, unknown> } | null;
  if (!body?.ok || !body.data) return null;
  const d = body.data;
  return {
    id: String(d.sub || ""),
    login: String(d.preferred_username || ""),
    email: (d.email as string) || null,
    displayName: (d.name as string) || null,
    firstName: (d.given_name as string) || null,
    lastName: (d.family_name as string) || null,
    avatarUrl: (d.picture as string) || null,
  };
}

function stateOk(expected: string | undefined, state: string | null) {
  if (expected && state && expected === state) return true;
  // Cookie may drop on long registration — signed state still proves CSRF
  if (verifyOAuthState(state)) return true;
  return false;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const err = req.nextUrl.searchParams.get("error");
  const origin =
    process.env.NEXT_PUBLIC_MAIL_URL?.replace(/\/$/, "") ||
    req.nextUrl.origin;

  if (err || !code) {
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  // OAuth in an iframe cannot reliably read/write SameSite=lax vault cookies.
  // Bounce to the top window BEFORE exchanging the code.
  if (req.headers.get("sec-fetch-dest") === "iframe") {
    const topUrl = `${origin}${req.nextUrl.pathname}${req.nextUrl.search}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><script>try{window.top.location.replace(${JSON.stringify(topUrl)})}catch(e){location.replace(${JSON.stringify(topUrl)})}</script></head><body></body></html>`;
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const expected = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!stateOk(expected, state)) {
    const res = NextResponse.redirect(`${origin}/?error=state`);
    clearStateCookie(res);
    return res;
  }

  const secret = clientSecret();
  if (!secret) {
    const res = NextResponse.redirect(`${origin}/?error=config`);
    clearStateCookie(res);
    return res;
  }

  try {
    // Prefer loopback; fall back to public URL if local id is unreachable
    const bases = [
      getServerPnkIdUrl(),
      ...(PNK_ID_URL && getServerPnkIdUrl() !== PNK_ID_URL ? [PNK_ID_URL] : []),
    ];

    type TokenResponse = {
      ok?: boolean;
      data?: {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };
    };
    let tokenJson: TokenResponse | null = null;
    let tokenStatus = 0;
    let baseUsed = bases[0];

    for (const base of bases) {
      try {
        const r = await fetchJson(`${base}/api/oauth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri(req),
            client_id: PNK_ID_CLIENT_ID,
            client_secret: secret,
          }),
        });
        tokenStatus = r.status;
        tokenJson = r.json as TokenResponse | null;
        baseUsed = base;
        if (tokenJson?.ok && tokenJson.data?.access_token) break;
        console.warn("[auth/callback] token fail on", base, tokenStatus);
      } catch (e) {
        console.warn("[auth/callback] token fetch error on", base, e);
      }
    }

    if (!tokenJson?.ok || !tokenJson.data?.access_token) {
      console.error("token exchange failed", {
        tokenStatus,
        tokenJson,
        tried: bases,
      });
      const res = NextResponse.redirect(`${origin}/?error=token`);
      clearStateCookie(res);
      return res;
    }

    const access = tokenJson.data.access_token;
    const refresh = tokenJson.data.refresh_token || "";
    const expiresIn = Number(tokenJson.data.expires_in) || 3600;

    // userinfo against the same base that issued the token
    let user = null as Awaited<ReturnType<typeof fetchUserinfo>>;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10_000);
      const ui = await fetch(`${baseUsed}/api/oauth/userinfo`, {
        headers: { Authorization: `Bearer ${access}` },
        cache: "no-store",
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const uj = await ui.json().catch(() => null);
      if (uj?.ok && uj.data) {
        const d = uj.data as Record<string, unknown>;
        user = {
          id: String(d.sub || ""),
          login: String(d.preferred_username || ""),
          email: (d.email as string) || null,
          displayName: (d.name as string) || null,
          firstName: (d.given_name as string) || null,
          lastName: (d.family_name as string) || null,
          avatarUrl: (d.picture as string) || null,
        };
      }
    } catch (e) {
      console.warn("[auth/callback] userinfo error", e);
      user = await fetchUserinfo(access);
    }

    if (!user?.id) {
      console.error("userinfo failed after token ok", { baseUsed });
      return NextResponse.redirect(`${origin}/?error=userinfo`);
    }

    const prev = readVaultFromRequest(req);
    const vault = upsertVaultAccount(prev, {
      accessToken: access,
      refreshToken: refresh,
      profile: profileFromUser(user),
    });

    const res = NextResponse.redirect(`${origin}/mail`);
    try {
      applyActiveCookies(res, vault, expiresIn);
    } catch (cookieErr) {
      console.error("[auth/callback] applyActiveCookies failed", cookieErr);
      // Still redirect — session access cookie at minimum
      try {
        res.cookies.set(
          "pnk_mail_access",
          access,
          sessionCookieOptions(expiresIn),
        );
      } catch {
        /* ignore */
      }
    }
    clearStateCookie(res);
    return res;
  } catch (e) {
    const aborted =
      e instanceof Error &&
      (e.name === "AbortError" || /aborted/i.test(e.message));
    console.error("[auth/callback]", aborted ? "timeout talking to pnk-id" : e);
    const res = NextResponse.redirect(
      `${origin}/?error=${aborted ? "id_timeout" : "auth"}`,
    );
    clearStateCookie(res);
    return res;
  }
}
