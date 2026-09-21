import { NextRequest, NextResponse } from "next/server";
import {
  deliverResendEmailById,
  listResendReceivedEmails,
} from "@/lib/mail-inbound";
import { requireActiveMailbox } from "@/lib/mail-auth";

/**
 * Pull recent emails from Resend Receiving into local inboxes.
 *
 * Auth: same MAIL_INBOUND_SECRET (Bearer / ?secret=) OR logged-in mailbox session.
 *
 * POST /api/mail/inbound/sync
 * POST /api/mail/inbound/sync?secret=...
 * body optional: { limit?: number, emailId?: string }
 */
async function authorize(req: NextRequest): Promise<boolean> {
  const secret = process.env.MAIL_INBOUND_SECRET?.trim();
  const bearer =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  const query = (req.nextUrl.searchParams.get("secret") || "").trim();
  if (secret && (bearer === secret || query === secret)) return true;

  const auth = await requireActiveMailbox();
  return auth.ok;
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json(
      { ok: false, error: { message: "Unauthorized" } },
      { status: 401 },
    );
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    return NextResponse.json(
      { ok: false, error: { message: "RESEND_API_KEY не задан" } },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    limit?: number;
    emailId?: string;
  };

  if (body.emailId) {
    const one = await deliverResendEmailById(body.emailId);
    console.info("[inbound/sync] one", one);
    return NextResponse.json({ ok: true, data: { results: [one] } });
  }

  const limit = Math.min(50, Math.max(1, Number(body.limit) || 15));
  const list = await listResendReceivedEmails(limit);
  console.info("[inbound/sync] listed", list.length);

  const results = [];
  for (const item of list) {
    if (!item?.id) continue;
    const r = await deliverResendEmailById(item.id, item);
    results.push(r);
    console.info("[inbound/sync] item", r);
  }

  return NextResponse.json({
    ok: true,
    data: {
      listed: list.length,
      results,
    },
  });
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json(
      { ok: false, error: { message: "Unauthorized" } },
      { status: 401 },
    );
  }
  const list = await listResendReceivedEmails(10);
  return NextResponse.json({
    ok: true,
    data: {
      hint: "POST сюда чтобы затянуть письма из Resend Receiving в ящики",
      recent: list.map((e) => ({
        id: e.id,
        from: e.from,
        to: e.to,
        received_for: e.received_for,
        subject: e.subject,
      })),
    },
  });
}
