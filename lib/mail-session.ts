import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { signPayload, verifySignedPayload } from "@/lib/cookie-crypto";
import { PNK_ID_URL } from "@/lib/id-auth";

export const MAIL_ACCESS_COOKIE = "pnk_mail_access";
export const MAIL_REFRESH_COOKIE = "pnk_mail_refresh";
export const MAIL_META_COOKIE = "pnk_mail_meta";
/** @deprecated legacy single-blob vault — still read for migration */
export const MAIL_VAULT_COOKIE = "pnk_mail_vault";

export type MailSessionUser = {
  id: string;
  login: string;
  email: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
};

export type MailAccountProfile = {
  id: string;
  name: string;
  email: string;
  color: string;
  initial: string;
  login: string;
  avatarUrl: string | null;
};

export type MailVaultAccount = {
  accessToken: string;
  refreshToken: string;
  profile: MailAccountProfile;
};

export type MailVault = {
  activeId: string;
  accounts: Record<string, MailVaultAccount>;
};

type MailMeta = {
  activeId: string;
  profiles: MailAccountProfile[];
};

type TokenPair = { accessToken: string; refreshToken: string };

/** Stable public avatar URL on pnk-id (works without userinfo / scopes). */
export function idPublicAvatarUrl(userId: string) {
  return `${PNK_ID_URL}/api/public/avatar/${encodeURIComponent(userId)}`;
}

function resolveAvatarUrl(userId: string, candidate?: string | null) {
  if (candidate && !candidate.startsWith("data:")) return candidate;
  return idPublicAvatarUrl(userId);
}

export function avatarColor(seed: string): string {
  const colors = [
    "#0066ff",
    "#21a038",
    "#7c3aed",
    "#db2777",
    "#ea580c",
    "#0891b2",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

export function avatarInitial(user: {
  displayName?: string | null;
  firstName?: string | null;
  login?: string | null;
  email?: string | null;
}): string {
  const src = (
    user.displayName ||
    user.firstName ||
    user.login ||
    user.email ||
    "?"
  ).trim();
  return (src[0] || "?").toUpperCase();
}

export function profileFromUser(user: MailSessionUser): MailAccountProfile {
  const name =
    user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.login ||
    "Пользователь";
  return {
    id: user.id,
    name,
    email: user.email || `${user.login}@pnkmail.ru`,
    color: avatarColor(user.id || user.login),
    initial: avatarInitial(user),
    login: user.login,
    avatarUrl: resolveAvatarUrl(user.id, user.avatarUrl),
  };
}

export function sessionCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSec,
  };
}

function b64encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function b64decode(raw: string) {
  return Buffer.from(raw, "base64url").toString("utf8");
}

export function tokenCookieName(accountId: string) {
  const safe = accountId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
  return `pnk_mt_${safe}`;
}

function encodeMeta(meta: MailMeta) {
  return signPayload(b64encode(JSON.stringify(meta)));
}

function decodeMeta(raw: string | undefined): MailMeta | null {
  if (!raw) return null;
  try {
    // Prefer signed; fall back to legacy unsigned base64 (one release)
    const payload = verifySignedPayload(raw) ?? (raw.includes(".") ? null : raw);
    if (!payload) return null;
    const parsed = JSON.parse(b64decode(payload)) as MailMeta;
    if (!parsed?.activeId || !Array.isArray(parsed.profiles)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Inactive account cookie: refresh only (access JWT doubles header size → nginx 502). */
function encodeRefreshOnly(refreshToken: string) {
  return signPayload(b64encode(JSON.stringify({ r: refreshToken })));
}

function decodeTokens(raw: string | undefined): TokenPair | null {
  if (!raw) return null;
  try {
    const payload = verifySignedPayload(raw) ?? (raw.includes(".") ? null : raw);
    if (!payload) return null;
    const parsed = JSON.parse(b64decode(payload)) as TokenPair & {
      r?: string;
    };
    const refresh = parsed.refreshToken || parsed.r || "";
    const access = parsed.accessToken || "";
    // Refresh-only is valid (access refreshed on demand)
    if (!access && !refresh) return null;
    return {
      accessToken: access,
      refreshToken: refresh,
    };
  } catch {
    return null;
  }
}

function decodeLegacyVault(raw: string | undefined): MailVault | null {
  if (!raw) return null;
  try {
    const payload = verifySignedPayload(raw) ?? (raw.includes(".") ? null : raw);
    if (!payload) return null;
    const parsed = JSON.parse(b64decode(payload)) as MailVault;
    if (!parsed?.activeId || !parsed.accounts) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getCookie(
  source: { get(name: string): { value: string } | undefined },
  name: string,
) {
  return source.get(name)?.value;
}

function slimProfile(p: MailAccountProfile): MailAccountProfile {
  // Drop avatar URL from cookie — regenerable from id (saves header bytes)
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    color: p.color,
    initial: p.initial,
    login: p.login,
    avatarUrl: null,
  };
}

function buildVaultFromCookies(
  source: { get(name: string): { value: string } | undefined },
): MailVault | null {
  const meta = decodeMeta(getCookie(source, MAIL_META_COOKIE));
  if (meta) {
    const accounts: Record<string, MailVaultAccount> = {};
    for (const profile of meta.profiles) {
      let tokens = decodeTokens(getCookie(source, tokenCookieName(profile.id)));
      // Active account: tokens in MAIL_ACCESS / MAIL_REFRESH (no duplicate pnk_mt_*)
      if (profile.id === meta.activeId) {
        const access = getCookie(source, MAIL_ACCESS_COOKIE) || "";
        const refresh = getCookie(source, MAIL_REFRESH_COOKIE) || "";
        // Keep session alive on refresh alone after access cookie/JWT expires
        if (access || refresh) {
          tokens = {
            accessToken: access || tokens?.accessToken || "",
            refreshToken: refresh || tokens?.refreshToken || "",
          };
        }
      }
      if (!tokens) continue;
      accounts[profile.id] = {
        profile: {
          ...profile,
          avatarUrl: resolveAvatarUrl(profile.id, profile.avatarUrl),
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    }
    if (!Object.keys(accounts).length) return null;
    const activeId = accounts[meta.activeId]
      ? meta.activeId
      : Object.keys(accounts)[0];
    return { activeId, accounts };
  }

  // Migrate legacy blob vault if present
  return decodeLegacyVault(getCookie(source, MAIL_VAULT_COOKIE));
}

export async function readVault(): Promise<MailVault | null> {
  const jar = await cookies();
  return buildVaultFromCookies(jar);
}

export function readVaultFromRequest(req: NextRequest): MailVault | null {
  return buildVaultFromCookies(req.cookies);
}

export function upsertVaultAccount(
  prev: MailVault | null,
  account: MailVaultAccount,
): MailVault {
  const accounts = { ...(prev?.accounts || {}) };
  accounts[account.profile.id] = account;
  // Keep insertion order stable: previous ids first, then new/updated
  const ordered: Record<string, MailVaultAccount> = {};
  for (const id of Object.keys(prev?.accounts || {})) {
    if (accounts[id]) ordered[id] = accounts[id];
  }
  ordered[account.profile.id] = account;
  return {
    activeId: account.profile.id,
    accounts: ordered,
  };
}

/**
 * Write auth cookies. Keep payloads small — nginx defaults ~4k proxy buffers;
 * fat Set-Cookie on callback/session → intermittent 502 and "random" logouts.
 */
export function applyActiveCookies(
  res: NextResponse,
  vault: MailVault,
  /** @deprecated cookie maxAge is always 30d; JWT lifetime handled via refresh */
  _expiresIn?: number,
) {
  void _expiresIn;
  const active = vault.accounts[vault.activeId];
  if (!active) return;

  // Cookie lifetime ≠ JWT lifetime. Persist 30d; refresh JWT via refresh_token.
  const longLived = sessionCookieOptions(30 * 24 * 60 * 60);

  res.cookies.set(MAIL_ACCESS_COOKIE, active.accessToken || "", longLived);
  res.cookies.set(
    MAIL_REFRESH_COOKIE,
    active.refreshToken || "",
    longLived,
  );

  const meta: MailMeta = {
    activeId: vault.activeId,
    profiles: Object.values(vault.accounts).map((a) => slimProfile(a.profile)),
  };
  res.cookies.set(MAIL_META_COOKIE, encodeMeta(meta), longLived);

  // Inactive: refresh token ONLY (no access JWT duplicate)
  for (const account of Object.values(vault.accounts)) {
    if (account.profile.id === vault.activeId) {
      res.cookies.set(tokenCookieName(account.profile.id), "", {
        ...sessionCookieOptions(0),
        maxAge: 0,
      });
      continue;
    }
    if (!account.refreshToken) continue;
    res.cookies.set(
      tokenCookieName(account.profile.id),
      encodeRefreshOnly(account.refreshToken),
      longLived,
    );
  }

  res.cookies.set(MAIL_VAULT_COOKIE, "", {
    ...sessionCookieOptions(0),
    maxAge: 0,
  });
}

export function clearAuthCookies(res: NextResponse, vault?: MailVault | null) {
  const gone = { ...sessionCookieOptions(0), maxAge: 0 };
  res.cookies.set(MAIL_ACCESS_COOKIE, "", gone);
  res.cookies.set(MAIL_REFRESH_COOKIE, "", gone);
  res.cookies.set(MAIL_META_COOKIE, "", gone);
  res.cookies.set(MAIL_VAULT_COOKIE, "", gone);
  if (vault) {
    for (const id of Object.keys(vault.accounts)) {
      res.cookies.set(tokenCookieName(id), "", gone);
    }
  }
}

export async function getAccessToken(): Promise<string | null> {
  const jar = await cookies();
  const fromCookie = jar.get(MAIL_ACCESS_COOKIE)?.value;
  if (fromCookie) return fromCookie;
  const vault = buildVaultFromCookies(jar);
  if (!vault) return null;
  return vault.accounts[vault.activeId]?.accessToken || null;
}

export function listAccountsFromVault(vault: MailVault) {
  return Object.values(vault.accounts).map((a) => ({
    ...a.profile,
    avatarUrl: resolveAvatarUrl(a.profile.id, a.profile.avatarUrl),
    active: a.profile.id === vault.activeId,
  }));
}
