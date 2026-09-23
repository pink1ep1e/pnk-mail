import { NextRequest, NextResponse } from "next/server";
import { createOAuthState, OAUTH_STATE_COOKIE } from "@/lib/cookie-crypto";
import { idLoginUrl, idRegisterUrl } from "@/lib/id-auth";
import { sessionCookieOptions } from "@/lib/mail-session";

/**
 * Sets OAuth state cookie then redirects to pnk-id login/register.
 * Use instead of bare idLoginUrl() so callback can validate state.
 *
 * ?embed=1 → JSON { url } for in-app iframe (keeps PWA, no Safari chrome)
 */
export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind") === "register" ? "register" : "login";
  const mode = req.nextUrl.searchParams.get("mode");
  const next = req.nextUrl.searchParams.get("next") || undefined;
  const embed = req.nextUrl.searchParams.get("embed") === "1";
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
  if (embed) {
    u.searchParams.set("embed", "1");
    u.searchParams.set("from", "mail");
  }

  const setState = (res: NextResponse) => {
    res.cookies.set(OAUTH_STATE_COOKIE, state, {
      ...sessionCookieOptions(2 * 60 * 60),
      sameSite: "lax",
    });
    return res;
  };

  if (embed) {
    return setState(
      NextResponse.json({ ok: true, data: { url: u.toString() } }),
    );
  }

  return setState(NextResponse.redirect(u.toString(), 302));
}
