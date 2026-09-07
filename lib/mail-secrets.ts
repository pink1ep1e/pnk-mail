/** Shared OAuth client secret for pnk-mail ↔ pnk-id. */

export function getMailClientSecret(): string {
  const secret = process.env.PNK_ID_CLIENT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PNK_ID_CLIENT_SECRET обязателен в production");
  }
  return "pnk-mail-dev-secret";
}
