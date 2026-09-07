import { NextRequest, NextResponse } from "next/server";
import { createOAuthState, OAUTH_STATE_COOKIE } from "@/lib/cookie-crypto";
import { idLoginUrl, idRegisterUrl } from "@/lib/id-auth";
import { sessionCookieOptions } from "@/lib/mail-session";

/**
 * Sets OAuth state cookie then redirects to pnk-id login/register.
 * Use instead of bare idLoginUrl() so callback can validate state.
 */
export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind") === "register" ? "register" : "login";
  const mode = req.nextUrl.searchParams.get("mode");
  const next = req.nextUrl.searchParams.get("next") || undefined;
  const state = createOAuthState();

  let target =
    kind === "register" ? idRegisterUrl(next) : idLoginUrl(next);
  if (mode === "add") {
    const u = new URL(target);
    u.searchParams.set("mode", "add");
    target = u.toString();
  }
  const u = new URL(target);
  u.searchParams.set("state", state);

  const res = NextResponse.redirect(u.toString(), 302);
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    ...sessionCookieOptions(10 * 60),
    sameSite: "lax",
  });
  return res;
}
