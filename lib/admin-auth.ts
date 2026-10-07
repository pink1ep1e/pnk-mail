import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

function hashToken(value: string) {
  return createHash("sha256").update(value).digest();
}

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: { message: "Unauthorized", code: "unauthorized" } },
    { status: 401 },
  );
}

/** Bearer ADMIN_API_TOKEN — for pnk-pmp and other internal callers. */
export function requireAdmin(req: NextRequest) {
  const expected = process.env.ADMIN_API_TOKEN?.trim();
  if (!expected) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          error: { message: "ADMIN_API_TOKEN not configured", code: "not_configured" },
        },
        { status: 503 },
      ),
    };
  }

  const header = req.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const query = new URL(req.url).searchParams.get("secret") || "";
  const got = bearer || query;

  if (!got) {
    return { ok: false as const, response: unauthorized() };
  }

  const a = hashToken(got);
  const b = hashToken(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false as const, response: unauthorized() };
  }

  return { ok: true as const };
}
