/** CSRF-ish: require same-origin for cookie-authenticated POSTs. */

export function assertSameOrigin(req: {
  headers: Headers;
  nextUrl?: { origin: string };
}): { ok: true } | { ok: false; message: string } {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const expected =
    process.env.NEXT_PUBLIC_MAIL_URL?.replace(/\/$/, "") ||
    req.nextUrl?.origin ||
    "";

  if (!expected) return { ok: true }; // misconfigured — don't hard-fail locally

  if (origin) {
    if (origin.replace(/\/$/, "") !== expected) {
      return { ok: false, message: "Недопустимый Origin" };
    }
    return { ok: true };
  }

  if (referer) {
    try {
      const ref = new URL(referer).origin;
      if (ref !== expected) {
        return { ok: false, message: "Недопустимый Referer" };
      }
      return { ok: true };
    } catch {
      return { ok: false, message: "Недопустимый Referer" };
    }
  }

  // Non-browser clients (curl/tests) without Origin — allow in non-production
  if (process.env.NODE_ENV === "production") {
    return { ok: false, message: "Origin обязателен" };
  }
  return { ok: true };
}
