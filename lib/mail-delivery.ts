import { prisma } from "@/lib/db";

export type OutboundDeliveryStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "delayed"
  | "bounced"
  | "failed"
  | "complained"
  | "suppressed";

const EVENT_STATUS: Record<string, OutboundDeliveryStatus> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.bounced": "bounced",
  "email.failed": "failed",
  "email.complained": "complained",
  "email.suppressed": "suppressed",
};

export const RESEND_OUTBOUND_EVENTS = Object.keys(EVENT_STATUS);

export function statusFromResendEvent(type: string): OutboundDeliveryStatus | null {
  return EVENT_STATUS[type] || null;
}

function detailFromEvent(
  type: string,
  data: Record<string, unknown>,
): string {
  if (type === "email.bounced") {
    const bounce = (data.bounce || {}) as Record<string, unknown>;
    return String(
      bounce.message ||
        bounce.type ||
        (Array.isArray(bounce.diagnosticCode)
          ? bounce.diagnosticCode.join("; ")
          : "") ||
        "bounce",
    ).slice(0, 1000);
  }
  if (type === "email.failed") {
    const failed = (data.failed || {}) as Record<string, unknown>;
    return String(failed.reason || "failed").slice(0, 1000);
  }
  if (type === "email.complained") return "Получатель отметил письмо как спам";
  if (type === "email.suppressed") return "Адрес в suppression list Resend";
  if (type === "email.delivery_delayed") return "Временная задержка доставки";
  return "";
}

function ruStatusLabel(status: OutboundDeliveryStatus): string {
  switch (status) {
    case "delivered":
      return "доставлено";
    case "sent":
      return "отправлено провайдеру";
    case "delayed":
      return "задержка доставки";
    case "bounced":
      return "отклонено (bounce)";
    case "failed":
      return "ошибка отправки";
    case "complained":
      return "помечено как спам";
    case "suppressed":
      return "подавлено";
    default:
      return status;
  }
}

/**
 * Apply Resend outbound delivery webhook to a stored sent message.
 * Matches by providerId (Resend email_id) or tag pnk_msg.
 */
export async function applyOutboundDeliveryEvent(params: {
  type: string;
  data: Record<string, unknown>;
}): Promise<{
  ok: boolean;
  status?: OutboundDeliveryStatus;
  messageId?: string;
  notified?: boolean;
}> {
  const status = statusFromResendEvent(params.type);
  if (!status) return { ok: false };

  const data = params.data;
  const providerId = String(data.email_id || data.id || "");
  const tags = (data.tags || {}) as Record<string, string>;
  const tagMsgId = tags.pnk_msg || tags.pnk_message_id || "";

  let row = providerId
    ? await prisma.message.findFirst({
        where: { providerId, folder: "sent" },
      })
    : null;

  if (!row && tagMsgId) {
    row = await prisma.message.findFirst({
      where: { id: tagMsgId, folder: "sent" },
    });
  }

  // Fallback: match by subject + to + recent (weak)
  if (!row) {
    const subject = String(data.subject || "");
    const toList = Array.isArray(data.to)
      ? (data.to as string[]).map((t) => String(t).toLowerCase())
      : [];
    if (subject && toList.length) {
      row = await prisma.message.findFirst({
        where: {
          folder: "sent",
          subject,
          toAddresses: { contains: toList[0] },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
      });
    }
  }

  if (!row) {
    console.warn("[delivery] no matching sent message", {
      type: params.type,
      providerId,
      tagMsgId,
      subject: data.subject,
    });
    return { ok: false };
  }

  const detail = detailFromEvent(params.type, data);
  const rawMsgId =
    typeof data.message_id === "string" ? data.message_id.trim() : "";
  const rfcMessageId = rawMsgId
    ? rawMsgId.replace(/^<|>$/g, "").slice(0, 500)
    : null;

  await prisma.message.update({
    where: { id: row.id },
    data: {
      providerId: providerId || row.providerId,
      deliveryStatus: status,
      deliveryDetail: detail || row.deliveryDetail,
      ...(rfcMessageId ? { rfcMessageId } : {}),
    },
  });

  let notified = false;
  if (
    status === "bounced" ||
    status === "failed" ||
    status === "complained" ||
    status === "suppressed"
  ) {
    notified = await notifyDeliveryFailure({
      mailboxId: row.mailboxId,
      original: row,
      status,
      detail,
      to: String(data.to || row.toAddresses),
    });
  }

  console.info("[delivery] updated", {
    messageId: row.id,
    status,
    providerId,
  });

  return { ok: true, status, messageId: row.id, notified };
}

async function notifyDeliveryFailure(params: {
  mailboxId: string;
  original: {
    id: string;
    subject: string;
    toAddresses: string;
  };
  status: OutboundDeliveryStatus;
  detail: string;
  to: string;
}): Promise<boolean> {
  const threadId = `delivery:${params.original.id}:${params.status}`;
  const exists = await prisma.message.findFirst({
    where: { mailboxId: params.mailboxId, threadId },
    select: { id: true },
  });
  if (exists) return false;

  const label = ruStatusLabel(params.status);
  const subject = `Не доставлено: ${params.original.subject || "(без темы)"}`;
  const bodyText = [
    `Письмо не удалось доставить (${label}).`,
    `Кому: ${params.to || params.original.toAddresses}`,
    `Тема: ${params.original.subject || "(без темы)"}`,
    params.detail ? `Причина: ${params.detail}` : "",
    "",
    "Проверьте адрес, SPF/DKIM домена и папку «Спам» у получателя.",
  ]
    .filter(Boolean)
    .join("\n");

  const bodyHtml = `<p><strong>Письмо не удалось доставить</strong> (${label}).</p>
<p>Кому: ${escapeHtml(params.to || params.original.toAddresses)}<br/>
Тема: ${escapeHtml(params.original.subject || "(без темы)")}</p>
${params.detail ? `<p>Причина: ${escapeHtml(params.detail)}</p>` : ""}
<p style="color:rgba(255,255,255,0.55);font-size:13px;">Проверьте адрес, SPF/DKIM и папку «Спам» у получателя.</p>`;

  await prisma.message.create({
    data: {
      mailboxId: params.mailboxId,
      folder: "inbox",
      fromName: "pnk почта",
      fromEmail: "mailer-daemon@pnkmail.ru",
      toAddresses: "",
      subject,
      preview: bodyText.slice(0, 160),
      bodyHtml,
      bodyText,
      unread: true,
      hasAttachment: false,
      threadId,
      deliveryStatus: params.status,
      deliveryDetail: params.detail,
    },
  });
  return true;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function deliveryStatusLabel(status: string | null | undefined): string {
  if (!status) return "";
  return ruStatusLabel(status as OutboundDeliveryStatus);
}
