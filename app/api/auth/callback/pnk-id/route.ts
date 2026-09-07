import { NextRequest, NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE } from "@/lib/cookie-crypto";
import { PNK_ID_CLIENT_ID, PNK_ID_URL } from "@/lib/id-auth";
import { getMailClientSecret } from "@/lib/mail-secrets";
import {
  applyActiveCookies,
  profileFromUser,
  readVaultFromRequest,
  sessionCookieOptions,
  upsertVaultAccount,
  type MailSessionUser,
} from "@/lib/mail-session";

const CLIENT_SECRET = getMailClientSecret();

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

async function fetchUserinfo(access: string): Promise<MailSessionUser | null> {
  const res = await fetch(`${PNK_ID_URL}/api/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${access}` },
    cache: "no-store",
  });
  const json = await res.json();
  if (!json.ok || !json.data) return null;
  const d = json.data as Record<string, unknown>;
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

  const expected = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (
    process.env.NODE_ENV === "production" ||
    expected ||
    state
  ) {
    if (!expected || !state || expected !== state) {
      const res = NextResponse.redirect(`${origin}/?error=state`);
      clearStateCookie(res);
      return res;
    }
  }

  try {
    const tokenRes = await fetch(`${PNK_ID_URL}/api/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri(req),
        client_id: PNK_ID_CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      cache: "no-store",
    });
    const tokenJson = await tokenRes.json();
    if (!tokenJson.ok || !tokenJson.data?.access_token) {
      console.error("token exchange failed", tokenJson);
      const res = NextResponse.redirect(`${origin}/?error=token`);
      clearStateCookie(res);
      return res;
    }

    const access = tokenJson.data.access_token as string;
    const refresh = (tokenJson.data.refresh_token as string) || "";
    const expiresIn = Number(tokenJson.data.expires_in) || 3600;

    const user = await fetchUserinfo(access);
    if (!user?.id) {
      return NextResponse.redirect(`${origin}/?error=userinfo`);
    }

    const prev = readVaultFromRequest(req);
    const vault = upsertVaultAccount(prev, {
      accessToken: access,
      refreshToken: refresh,
      profile: profileFromUser(user),
    });

    const res = NextResponse.redirect(`${origin}/mail`);
    applyActiveCookies(res, vault, expiresIn);
    clearStateCookie(res);
    return res;
  } catch (e) {
    console.error(e);
    const res = NextResponse.redirect(`${origin}/?error=auth`);
    clearStateCookie(res);
    return res;
  }
}
