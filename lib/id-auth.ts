/** Links from pnk-mail into pnk ID auth, with service branding. */

export const PNK_ID_URL =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_PNK_ID_URL?.replace(/\/$/, "")) ||
  "http://localhost:3100";

export const PNK_ID_CLIENT_ID = "pnk-mail";

export const MAIL_OAUTH_REDIRECT =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_MAIL_URL?.replace(/\/$/, "")) ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

export function idLoginUrl(next?: string): string {
  const u = new URL(`${PNK_ID_URL}/login`);
  u.searchParams.set("service", "mail");
  if (next) u.searchParams.set("next", next);
  return u.toString();
}

export function idRegisterUrl(next?: string): string {
  const u = new URL(`${PNK_ID_URL}/register`);
  u.searchParams.set("service", "mail");
  if (next) u.searchParams.set("next", next);
  return u.toString();
}

/** Prefer this from browsers — sets CSRF oauth state cookie first. */
export function mailAuthStartUrl(kind: "login" | "register" = "login") {
  return `/api/auth/start?kind=${kind}`;
}

export function mailAuthAddAccountUrl() {
  return `/api/auth/start?kind=login&mode=add`;
}

/** pnk ID cabinet (account management) — via mail handoff for active account */
export function idCabinetUrl(): string {
  return "/api/auth/manage";
}

export function idAddAccountUrl(): string {
  const u = new URL(`${PNK_ID_URL}/login`);
  u.searchParams.set("service", "mail");
  u.searchParams.set("mode", "add");
  return u.toString();
}

/** Clear ID session then open login (real logout only). */
export function idLogoutThenLoginUrl(): string {
  const u = new URL(`${PNK_ID_URL}/api/auth/logout`);
  u.searchParams.set("next", "/login");
  u.searchParams.set("service", "mail");
  return u.toString();
}

export function mailCallbackPath(): string {
  return "/api/auth/callback/pnk-id";
}
