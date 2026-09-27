import { NextRequest, NextResponse } from "next/server";
import { processDueScheduledSends } from "@/lib/mail-scheduled-send";

/**
 * Process due scheduled (deferred) sends.
 * Call from system cron every 1–2 min, or rely on opportunistic runs from /api/mail/messages.
 *
 * Auth: Authorization: Bearer $CRON_SECRET  (or ?secret=)
 * If CRON_SECRET is unset, endpoint is open only on localhost.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "";
  const auth =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.nextUrl.searchParams.get("secret") ||
    "";
  const host = req.headers.get("host") || "";
  const local =
    host.startsWith("127.0.0.1") ||
    host.startsWith("localhost") ||
    host.startsWith("[::1]");

  if (secret) {
    if (auth !== secret) {
      return NextResponse.json(
        { ok: false, error: { message: "Unauthorized" } },
        { status: 401 },
      );
    }
  } else if (!local) {
    return NextResponse.json(
      { ok: false, error: { message: "CRON_SECRET not configured" } },
      { status: 403 },
    );
  }

  const result = await processDueScheduledSends({ force: true, limit: 40 });
  return NextResponse.json({ ok: true, data: result });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
