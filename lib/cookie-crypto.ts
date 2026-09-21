import { createHmac, timingSafeEqual } from "crypto";
import { getMailClientSecret } from "@/lib/mail-secrets";

/** HMAC key for signing vault cookie payloads. */
function vaultKey() {
  const fromEnv = process.env.MAIL_VAULT_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  try {
    return `vault:${getMailClientSecret()}`;
  } catch {
    return "vault:dev-only-insecure";
  }
}

export function signPayload(payload: string): string {
  const sig = createHmac("sha256", vaultKey()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySignedPayload(raw: string | undefined): string | null {
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  if (i <= 0) return null;
  const payload = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  const expected = createHmac("sha256", vaultKey())
    .update(payload)
    .digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createOAuthState(): string {
  const nonce = `${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 12)}`;
  return signPayload(nonce);
}

/** Accept state if HMAC-valid and not older than maxAgeMs (default 2h). */
export function verifyOAuthState(
  state: string | null | undefined,
  maxAgeMs = 2 * 60 * 60 * 1000,
): boolean {
  if (!state) return false;
  const payload = verifySignedPayload(state);
  if (!payload) return false;
  const tsPart = payload.split(".")[0];
  const t = parseInt(tsPart, 36);
  if (!Number.isFinite(t)) return false;
  const age = Date.now() - t;
  return age >= 0 && age <= maxAgeMs;
}

export const OAUTH_STATE_COOKIE = "pnk_mail_oauth_state";

