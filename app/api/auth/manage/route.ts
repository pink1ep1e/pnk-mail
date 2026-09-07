import { NextRequest, NextResponse } from "next/server";
import { PNK_ID_CLIENT_ID, PNK_ID_URL, mailAuthStartUrl } from "@/lib/id-auth";
import { getMailClientSecret } from "@/lib/mail-secrets";
import {
  applyActiveCookies,
  readVault,
  readVaultFromRequest,
} from "@/lib/mail-session";

const CLIENT_SECRET = getMailClientSecret();

/**
 * Open pnk ID cabinet for the *active* mail account.
 * Uses refresh_token (server-side) → one-time handoff code → ID session.
 */
export async function GET(req: NextRequest) {
  const vault = readVaultFromRequest(req) || (await readVault());
  const active = vault?.accounts[vault.activeId];
  const startLogin = new URL(mailAuthStartUrl("login"), req.nextUrl.origin);

  if (!active) {
    return NextResponse.redirect(startLogin, 303);
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
    return NextResponse.redirect(startLogin, 303);
  }

  const code = String(handoffJson.data.code);
  const resume = new URL(`${PNK_ID_URL}/api/auth/resume`);
  resume.searchParams.set("code", code);
  resume.searchParams.set("next", "/cabinet");

  const res = NextResponse.redirect(resume, 303);
  if (vault) applyActiveCookies(res, vault);
  return res;
}
