import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  applyOutboundDeliveryEvent,
  RESEND_OUTBOUND_EVENTS,
} from "@/lib/mail-delivery";
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
 * Auth (any one):
 *  - ?secret=<MAIL_INBOUND_SECRET>
 *  - Authorization: Bearer <MAIL_INBOUND_SECRET>
 *  - Svix headers + RESEND_WEBHOOK_SECRET (whsec_… from Resend webhook)
 *
 * Formats:
 *  1) Resend `email.received` (body fetched via Receiving API)
 *  2) Generic JSON: { from, to, subject, html?, text?, cc?, messageId? }
 */
function authorizeInbound(
  req: NextRequest,
  rawBody: string,
): { ok: true } | { ok: false; reason: string } {
  const inboundSecret = process.env.MAIL_INBOUND_SECRET?.trim();
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();

  if (!inboundSecret && !webhookSecret) {
    return { ok: false, reason: "MAIL_INBOUND_SECRET / RESEND_WEBHOOK_SECRET не заданы" };
  }

  const bearer =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  const querySecret = (req.nextUrl.searchParams.get("secret") || "").trim();
  const headerSecret = (
    req.headers.get("x-mail-inbound-secret") ||
    req.headers.get("x-webhook-secret") ||
    ""
  ).trim();

  if (
    inboundSecret &&
    (bearer === inboundSecret ||
      querySecret === inboundSecret ||
      headerSecret === inboundSecret)
  ) {
    return { ok: true };
  }

  if (webhookSecret) {
    const svixId = req.headers.get("svix-id");
    const svixTs = req.headers.get("svix-timestamp");
    const svixSig = req.headers.get("svix-signature");
    if (svixId && svixTs && svixSig && verifySvix(webhookSecret, svixId, svixTs, svixSig, rawBody)) {
      return { ok: true };
    }
  }

  return {
    ok: false,
    reason:
      "Unauthorized — в URL webhook добавьте ?secret=MAIL_INBOUND_SECRET или задайте RESEND_WEBHOOK_SECRET (whsec_…)",
  };
}

function verifySvix(
  secret: string,
  id: string,
  timestamp: string,
  signatureHeader: string,
  body: string,
): boolean {
  try {
    const key = secret.startsWith("whsec_")
      ? Buffer.from(secret.slice("whsec_".length), "base64")
      : Buffer.from(secret, "base64");
    const signed = `${id}.${timestamp}.${body}`;
    const expected = createHmac("sha256", key).update(signed).digest("base64");
    const expBuf = Buffer.from(expected);
    const candidates = signatureHeader.split(/\s+/).flatMap((part) => {
      const [ver, sig] = part.split(",");
      if (ver === "v1" && sig) return [sig];
      return [];
    });
    return candidates.some((sig) => {
      try {
        const got = Buffer.from(sig);
        return got.length === expBuf.length && timingSafeEqual(got, expBuf);
      } catch {
        return false;
      }
    });
  } catch (e) {
    console.error("[inbound] svix verify error", e);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  console.info("[inbound] hit", {
    ip: clientIp(req),
    hasAuthHeader: Boolean(req.headers.get("authorization")),
    hasQuerySecret: Boolean(req.nextUrl.searchParams.get("secret")),
    hasSvix: Boolean(req.headers.get("svix-signature")),
    contentLength: rawBody.length,
  });

  const auth = authorizeInbound(req, rawBody);
  if (!auth.ok) {
    console.warn("[inbound] auth failed:", auth.reason);
    return NextResponse.json(
      { ok: false, error: { message: auth.reason } },
      { status: auth.reason.includes("не заданы") ? 503 : 401 },
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

  let body: Record<string, unknown> | null = null;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    body = null;
  }
  if (!body) {
    console.warn("[inbound] invalid JSON");
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON" } },
      { status: 400 },
    );
  }

  try {
    const eventType = typeof body.type === "string" ? body.type : "";

    // --- Outbound delivery: sent / delivered / bounced / failed / … ---
    if (RESEND_OUTBOUND_EVENTS.includes(eventType)) {
      const data = (body.data || {}) as Record<string, unknown>;
      console.info("[inbound] delivery event", {
        type: eventType,
        emailId: data.email_id,
        to: data.to,
        subject: data.subject,
      });
      const result = await applyOutboundDeliveryEvent({
        type: eventType,
        data,
      });
      return NextResponse.json({
        ok: true,
        data: { provider: "resend", event: eventType, ...result },
      });
    }

    // --- Resend email.received ---
    if (eventType === "email.received") {
      const data = (body.data || {}) as Record<string, unknown>;
      const emailId = String(data.email_id || data.id || "");
      console.info("[inbound] email.received", {
        emailId,
        from: data.from,
        to: data.to,
        received_for: data.received_for,
        subject: data.subject,
      });

      if (!emailId) {
        return NextResponse.json(
          { ok: false, error: { message: "email_id missing" } },
          { status: 400 },
        );
      }

      const full = await fetchResendReceivedEmail(emailId);
      if (!full) {
        console.warn(
          "[inbound] receiving API failed — delivering from webhook metadata only",
          emailId,
        );
      } else {
        console.info("[inbound] receiving API ok", {
          emailId,
          from: full.from,
          to: full.to,
          received_for: full.received_for,
          hasHtml: Boolean(full.html),
          hasText: Boolean(full.text),
        });
      }

      const from = parseInboundFrom(
        full?.from ||
          (full?.headers && typeof full.headers.from === "string"
            ? full.headers.from
            : "") ||
          String(data.from || ""),
      );

      // Merge to + received_for — Resend often puts the real mailbox in received_for
      const to = normalizeInboundAddresses([
        ...(full?.to?.length ? full.to : []),
        ...(full?.received_for?.length ? full.received_for : []),
        ...(Array.isArray(data.to) ? data.to : []),
        ...(Array.isArray(data.received_for) ? data.received_for : []),
      ]);
      const cc = normalizeInboundAddresses(
        full?.cc?.length ? full.cc : data.cc,
      );

      if (!to.length) {
        console.error("[inbound] no recipients after normalize", {
          emailId,
          dataTo: data.to,
          dataReceivedFor: data.received_for,
          fullTo: full?.to,
          fullReceivedFor: full?.received_for,
        });
        return NextResponse.json(
          { ok: false, error: { message: "no recipients" } },
          { status: 422 },
        );
      }

      const result = await deliverInbound({
        fromName: from.name,
        fromEmail: from.email,
        to,
        cc,
        subject:
          full?.subject ||
          String(data.subject || "(без темы)"),
        bodyHtml: full?.html || undefined,
        bodyText:
          full?.text ||
          (!full?.html
            ? `(письмо получено, тело недоступно)\nОт: ${from.email}\nТема: ${String(data.subject || "")}`
            : undefined),
        messageId:
          full?.message_id ||
          (typeof data.message_id === "string" ? data.message_id : null),
        hasAttachment: Array.isArray(full?.attachments)
          ? full!.attachments!.length > 0
          : Array.isArray(data.attachments)
            ? data.attachments.length > 0
            : false,
      });

      console.info("[inbound] delivered", result);
      return NextResponse.json({
        ok: true,
        data: { provider: "resend", emailId, ...result },
      });
    }

    // Ignore other Resend event types quietly (opened/clicked/scheduled…)
    if (eventType.startsWith("email.")) {
      console.info("[inbound] ignore event", eventType);
      return NextResponse.json({ ok: true, data: { ignored: eventType } });
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
    const to = normalizeInboundAddresses(
      body.to || body.recipients || body.received_for,
    );
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

    console.info("[inbound] generic delivered", result);
    return NextResponse.json({
      ok: true,
      data: { provider: "generic", ...result },
    });
  } catch (e) {
    console.error("[inbound] webhook error", e);
    return NextResponse.json(
      { ok: false, error: { message: "Inbound processing failed" } },
      { status: 500 },
    );
  }
}

/** Health / docs hint */
export async function GET() {
  const hasSecret = Boolean(process.env.MAIL_INBOUND_SECRET?.trim());
  const hasWebhookSecret = Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim());
  return NextResponse.json({
    ok: true,
    data: {
      endpoint: "/api/mail/inbound",
      authConfigured: hasSecret || hasWebhookSecret,
      auth: hasSecret
        ? "Bearer / ?secret=MAIL_INBOUND_SECRET"
        : hasWebhookSecret
          ? "Svix RESEND_WEBHOOK_SECRET"
          : "НЕ ЗАДАНО — входящие не примутся",
      webhookUrlHint:
        "https://pnkmail.ru/api/mail/inbound?secret=ВАШ_MAIL_INBOUND_SECRET",
      events: ["email.received", ...RESEND_OUTBOUND_EVENTS],
    },
  });
}
