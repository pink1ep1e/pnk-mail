import { NextRequest, NextResponse } from "next/server";
import {
  deliverInbound,
  fetchResendReceivedEmail,
  normalizeInboundAddresses,
  parseInboundFrom,
} from "@/lib/mail-inbound";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Inbound webhook for external mail (Yandex/Gmail/…).
 *
 * Auth: Authorization: Bearer <MAIL_INBOUND_SECRET>
 *    or ?secret=<MAIL_INBOUND_SECRET>
 *
 * Formats:
 * 1) Resend `email.received` webhook (fetches body via Receiving API)
 * 2) Generic JSON: { from, to, subject, html?, text?, cc?, messageId? }
 */
export async function POST(req: NextRequest) {
  const secret = process.env.MAIL_INBOUND_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: { message: "MAIL_INBOUND_SECRET не задан" } },
      { status: 503 },
    );
  }

  const auth =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.nextUrl.searchParams.get("secret") ||
    "";
  if (auth !== secret) {
    return NextResponse.json(
      { ok: false, error: { message: "Unauthorized" } },
      { status: 401 },
    );
  }

  const rl = rateLimit({
    key: `inbound:${clientIp(req)}`,
    limit: 300,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: { message: "Too many requests" } },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON" } },
      { status: 400 },
    );
  }

  try {
    // --- Resend email.received ---
    if (body.type === "email.received") {
      const data = (body.data || {}) as Record<string, unknown>;
      const emailId = String(data.email_id || "");
      if (!emailId) {
        return NextResponse.json(
          { ok: false, error: { message: "email_id missing" } },
          { status: 400 },
        );
      }

      const full = await fetchResendReceivedEmail(emailId);
      if (!full) {
        return NextResponse.json(
          { ok: false, error: { message: "Не удалось загрузить письмо из Resend" } },
          { status: 502 },
        );
      }

      const from = parseInboundFrom(full.from || String(data.from || ""));
      const to = normalizeInboundAddresses(
        full.to?.length ? full.to : data.to || data.received_for,
      );
      const cc = normalizeInboundAddresses(full.cc?.length ? full.cc : data.cc);
      const result = await deliverInbound({
        fromName: from.name,
        fromEmail: from.email,
        to,
        cc,
        subject: full.subject || String(data.subject || "(без темы)"),
        bodyHtml: full.html || undefined,
        bodyText: full.text || undefined,
        messageId:
          full.message_id ||
          (typeof data.message_id === "string" ? data.message_id : null),
        hasAttachment: Array.isArray(full.attachments)
          ? full.attachments.length > 0
          : Array.isArray(data.attachments)
            ? data.attachments.length > 0
            : false,
      });

      return NextResponse.json({ ok: true, data: { provider: "resend", ...result } });
    }

    // --- Generic JSON ---
    const fromRaw = String(body.from || body.fromEmail || "");
    if (!fromRaw) {
      return NextResponse.json(
        { ok: false, error: { message: "from required" } },
        { status: 400 },
      );
    }
    const from = parseInboundFrom(fromRaw);
    const to = normalizeInboundAddresses(body.to || body.recipients);
    if (!to.length) {
      return NextResponse.json(
        { ok: false, error: { message: "to required" } },
        { status: 400 },
      );
    }

    const result = await deliverInbound({
      fromName:
        typeof body.fromName === "string" && body.fromName
          ? body.fromName
          : from.name,
      fromEmail: from.email,
      to,
      cc: normalizeInboundAddresses(body.cc),
      subject: String(body.subject || "(без темы)"),
      bodyHtml:
        typeof body.html === "string"
          ? body.html
          : typeof body.bodyHtml === "string"
            ? body.bodyHtml
            : undefined,
      bodyText:
        typeof body.text === "string"
          ? body.text
          : typeof body.bodyText === "string"
            ? body.bodyText
            : undefined,
      messageId:
        typeof body.messageId === "string"
          ? body.messageId
          : typeof body.message_id === "string"
            ? body.message_id
            : null,
      hasAttachment: Boolean(body.hasAttachment),
    });

    return NextResponse.json({ ok: true, data: { provider: "generic", ...result } });
  } catch (e) {
    console.error("inbound webhook error", e);
    return NextResponse.json(
      { ok: false, error: { message: "Inbound processing failed" } },
      { status: 500 },
    );
  }
}

/** Health / docs hint */
export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      endpoint: "/api/mail/inbound",
      auth: "Bearer MAIL_INBOUND_SECRET",
      events: ["email.received (Resend)", "generic JSON"],
    },
  });
}
