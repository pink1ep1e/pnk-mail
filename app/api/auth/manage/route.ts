import { NextRequest, NextResponse } from "next/server";
import { PNK_ID_CLIENT_ID, PNK_ID_URL, mailAuthStartUrl } from "@/lib/id-auth";
import { getMailClientSecret } from "@/lib/mail-secrets";
import {
  applyActiveCookies,
  readVault,
  readVaultFromRequest,
} from "@/lib/mail-session";

const CLIENT_SECRET = getMailClientSecret();

async function buildResumeUrl(req: NextRequest): Promise<
  | { ok: true; url: string }
  | { ok: false; loginUrl: string }
> {
  const vault = readVaultFromRequest(req) || (await readVault());
  const active = vault?.accounts[vault.activeId];
  const startLogin = new URL(mailAuthStartUrl("login"), req.nextUrl.origin);

  if (!active) {
    return { ok: false, loginUrl: startLogin.toString() };
  }

  const handoffRes = await fetch(`${PNK_ID_URL}/api/auth/handoff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: PNK_ID_CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: active.refreshToken || undefined,
      access_token: active.accessToken || undefined,
    }),
    cache: "no-store",
  });

  const handoffJson = await handoffRes.json().catch(() => null);
  if (!handoffJson?.ok || !handoffJson.data?.code) {
    return { ok: false, loginUrl: startLogin.toString() };
  }

  const code = String(handoffJson.data.code);
  const resume = new URL(`${PNK_ID_URL}/api/auth/resume`);
  resume.searchParams.set("code", code);
  // embed=1 hints ID to avoid breaking out of iframe / chrome
  resume.searchParams.set("next", "/cabinet?embed=1&from=mail");

  return { ok: true, url: resume.toString() };
}

/**
 * Open pnk ID cabinet for the *active* mail account.
 * Uses refresh_token (server-side) → one-time handoff code → ID session.
 *
 * ?embed=1 → JSON { url } for in-app iframe (keeps PWA, no Safari chrome)
 * default → 303 redirect (legacy)
 */
export async function GET(req: NextRequest) {
  const embed = req.nextUrl.searchParams.get("embed") === "1";
  const result = await buildResumeUrl(req);
  const vault = readVaultFromRequest(req) || (await readVault());

  if (embed) {
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: "auth_required", loginUrl: result.loginUrl },
        { status: 401 },
      );
    }
    const res = NextResponse.json({ ok: true, data: { url: result.url } });
    if (vault) applyActiveCookies(res, vault);
    return res;
  }

  if (!result.ok) {
    return NextResponse.redirect(result.loginUrl, 303);
  }

  const res = NextResponse.redirect(result.url, 303);
  if (vault) applyActiveCookies(res, vault);
  return res;
}
