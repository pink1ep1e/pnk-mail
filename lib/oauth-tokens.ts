import { PNK_ID_CLIENT_ID, getServerPnkIdUrl } from "@/lib/id-auth";
import { getMailClientSecret } from "@/lib/mail-secrets";
import type { MailVault } from "@/lib/mail-session";

export type RefreshedTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

/** Read JWT `exp` (seconds) without verifying — used only for refresh timing. */
export function jwtExpSec(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(
      Buffer.from(part, "base64url").toString("utf8"),
    ) as { exp?: unknown };
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

/** True if access is missing or expires within skewSec. */
export function accessNeedsRefresh(
  accessToken: string | null | undefined,
  skewSec = 90,
): boolean {
  if (!accessToken) return true;
  const exp = jwtExpSec(accessToken);
  if (exp == null) return false; // opaque — use until ID rejects
  return exp * 1000 <= Date.now() + skewSec * 1000;
}

async function clientSecret(): Promise<string | null> {
  try {
    return getMailClientSecret();
  } catch {
    return null;
  }
}

/**
 * Exchange refresh_token at pnk-id (loopback). Returns null on failure.
 */
export async function refreshAccessToken(
  refreshToken: string,
  timeoutMs = 8_000,
): Promise<RefreshedTokens | null> {
  if (!refreshToken) return null;
  const secret = await clientSecret();
  if (!secret) return null;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${getServerPnkIdUrl()}/api/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: PNK_ID_CLIENT_ID,
        client_secret: secret,
      }),
      cache: "no-store",
      signal: ctrl.signal,
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      data?: {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };
    } | null;
    const access = json?.data?.access_token;
    if (!json?.ok || !access) {
      console.warn("[oauth] refresh failed", res.status);
      return null;
    }
    return {
      accessToken: access,
      refreshToken: json.data?.refresh_token || refreshToken,
      expiresIn: Number(json.data?.expires_in) || 3600,
    };
  } catch (e) {
    console.warn("[oauth] refresh error", e);
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Ensure active account has a usable access token.
 * Also refreshes inactive slots that only have refresh (noop for them until switch).
 */
export async function ensureVaultTokens(
  vault: MailVault,
): Promise<{ vault: MailVault; changed: boolean; expiresIn: number }> {
  const accounts = { ...vault.accounts };
  let changed = false;
  let expiresIn = 3600;

  const active = accounts[vault.activeId];
  if (active && accessNeedsRefresh(active.accessToken)) {
    if (!active.refreshToken) {
      return { vault, changed: false, expiresIn };
    }
    const next = await refreshAccessToken(active.refreshToken);
    if (next) {
      accounts[vault.activeId] = {
        ...active,
        accessToken: next.accessToken,
        refreshToken: next.refreshToken,
      };
      changed = true;
      expiresIn = next.expiresIn;
    }
  }

  return {
    vault: changed ? { ...vault, accounts } : vault,
    changed,
    expiresIn,
  };
}
