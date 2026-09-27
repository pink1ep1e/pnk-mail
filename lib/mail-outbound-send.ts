import { prisma } from "@/lib/db";
import {
  htmlToPreview,
  htmlToText,
  isPnkMailAddress,
  parseAddressList,
} from "@/lib/mail-store";
import { outboundMailHtml, sanitizeMailHtml } from "@/lib/mail-template";
import {
  formatRfcMessageId,
  normalizeRfcMessageId,
} from "@/lib/mail-thread";
import { getMailFromDomain, sendOutbound } from "@/lib/mail-transport";
import { notifyMailboxNewMail } from "@/lib/web-push";

export type OutboundAttachment = {
  filename: string;
  content: string;
  contentType: string;
};

export type SendMailInput = {
  mailboxId: string;
  fromName: string;
  fromEmail: string;
  to: string;
  cc?: string;
  subject?: string;
  bodyHtml?: string;
  replyToId?: string | null;
  /** Pre-resolved thread / In-Reply-To (e.g. from a scheduled draft) */
  threadId?: string | null;
  inReplyTo?: string | null;
  labelIds?: string[];
  hasAttachment?: boolean;
  attachments?: OutboundAttachment[];
};

export type SendMailResult =
  | {
      ok: true;
      sentId: string;
      deliveredInternal: number;
      deliveredExternal: number;
      transportWarning: string | null;
    }
  | { ok: false; error: string };

function normalizeAttachments(
  raw: OutboundAttachment[] | undefined,
): OutboundAttachment[] {
  return (Array.isArray(raw) ? raw : [])
    .filter(
      (a) =>
        a &&
        typeof a.filename === "string" &&
        a.filename.trim() &&
        typeof a.content === "string" &&
        a.content.length > 0 &&
        a.content.length < 12_000_000,
    )
    .slice(0, 8)
    .map((a) => ({
      filename: String(a.filename).slice(0, 200),
      content: String(a.content),
      contentType:
        typeof a.contentType === "string" && a.contentType
          ? a.contentType.slice(0, 120)
          : "application/octet-stream",
    }));
}

/** Core outbound send used by /api/mail/send and scheduled drafts. */
export async function sendMailMessage(
  input: SendMailInput,
): Promise<SendMailResult> {
  const toList = parseAddressList(input.to || "");
  const ccList = parseAddressList(input.cc || "");
  const subject = (input.subject || "").trim().slice(0, 500) || "(без темы)";
  const rawHtml = (input.bodyHtml || "").trim() || "<p></p>";
  if (rawHtml.length > 6_000_000) {
    return { ok: false, error: "Слишком большое письмо" };
  }
  if (!toList.length) {
    return { ok: false, error: "Укажите получателя" };
  }
  if (toList.length + ccList.length > 50) {
    return { ok: false, error: "Слишком много получателей" };
  }

  const bodyHtml = sanitizeMailHtml(rawHtml);
  const bodyText = htmlToText(bodyHtml);
  const preview = htmlToPreview(bodyHtml);
  const outboundHtml = outboundMailHtml(bodyHtml);
  const fileAttachments = normalizeAttachments(input.attachments);

  const fromName = input.fromName;
  const fromEmail = input.fromEmail.trim().toLowerCase();
  const toJoined = toList.join(", ");
  const ccJoined = ccList.join(", ");
  const domain = getMailFromDomain();

  const internal = [...new Set([...toList, ...ccList])].filter(isPnkMailAddress);
  const external = [...new Set([...toList, ...ccList])].filter(
    (a) => !isPnkMailAddress(a),
  );

  let threadId: string | null = input.threadId || null;
  let inReplyTo: string | null = input.inReplyTo || null;
  const refIds: string[] = [];
  const replyToId = (input.replyToId || "").trim();

  if (replyToId) {
    const parent = await prisma.message.findFirst({
      where: { id: replyToId, mailboxId: input.mailboxId },
    });
    if (parent) {
      threadId = parent.threadId || parent.id;
      if (!parent.threadId) {
        await prisma.message.update({
          where: { id: parent.id },
          data: { threadId: parent.id },
        });
        threadId = parent.id;
      }

      inReplyTo =
        normalizeRfcMessageId(parent.rfcMessageId) ||
        (parent.threadId?.startsWith("ext:")
          ? normalizeRfcMessageId(parent.threadId.slice(4))
          : null);

      const threadMsgs = await prisma.message.findMany({
        where: {
          mailboxId: input.mailboxId,
          OR: [{ threadId }, { id: threadId }],
        },
        orderBy: { createdAt: "asc" },
        select: { rfcMessageId: true, threadId: true },
      });
      for (const m of threadMsgs) {
        const id =
          normalizeRfcMessageId(m.rfcMessageId) ||
          (m.threadId?.startsWith("ext:")
            ? normalizeRfcMessageId(m.threadId.slice(4))
            : null);
        if (id && !refIds.includes(id)) refIds.push(id);
      }
      if (inReplyTo && !refIds.includes(inReplyTo)) refIds.push(inReplyTo);
    }
  }

  const labelIds = Array.isArray(input.labelIds)
    ? input.labelIds
        .filter((id) => typeof id === "string" && id.length > 0)
        .slice(0, 20)
    : [];
  const hasAttachment =
    Boolean(input.hasAttachment) ||
    fileAttachments.length > 0 ||
    /<img\b/i.test(bodyHtml) ||
    /download=/i.test(bodyHtml) ||
    /data-pnk-attachments/i.test(bodyHtml);

  const sent = await prisma.message.create({
    data: {
      mailboxId: input.mailboxId,
      folder: "sent",
      fromName,
      fromEmail,
      toAddresses: toJoined,
      ccAddresses: ccJoined,
      subject,
      preview,
      bodyHtml,
      bodyText,
      unread: false,
      hasAttachment,
      labelIds: JSON.stringify(labelIds),
      deliveryStatus: external.length ? "queued" : "delivered",
      deliveryDetail: external.length ? "" : "internal",
      threadId: threadId || undefined,
      inReplyTo: inReplyTo || undefined,
    },
  });

  const finalThreadId = threadId || sent.id;
  const rfcMessageId = `${sent.id}.${Date.now()}@${domain}`;
  await prisma.message.update({
    where: { id: sent.id },
    data: {
      threadId: finalThreadId,
      rfcMessageId,
    },
  });

  const headers: Record<string, string> = {
    "Message-ID": formatRfcMessageId(rfcMessageId),
  };
  if (inReplyTo) {
    headers["In-Reply-To"] = formatRfcMessageId(inReplyTo);
    headers.References = (refIds.length ? refIds : [inReplyTo])
      .map((id) => formatRfcMessageId(id))
      .join(" ");
  }

  for (const address of internal) {
    if (address === fromEmail) continue;
    const recipient = await prisma.mailbox.findUnique({ where: { address } });
    if (!recipient) continue;

    const created = await prisma.message.create({
      data: {
        mailboxId: recipient.id,
        folder: "inbox",
        fromName,
        fromEmail,
        toAddresses: toJoined,
        ccAddresses: ccJoined,
        subject,
        preview,
        bodyHtml,
        bodyText,
        unread: true,
        hasAttachment,
        threadId: finalThreadId,
        rfcMessageId,
        inReplyTo: inReplyTo || undefined,
      },
    });

    try {
      await notifyMailboxNewMail(recipient.id, {
        id: created.id,
        fromName: created.fromName,
        fromEmail: created.fromEmail,
        subject: created.subject,
        preview: created.preview,
      });
    } catch (e) {
      console.warn("[mail-send] push notify failed", e);
    }
  }

  let transportWarning: string | null = null;
  if (external.length) {
    const externalTo = external.filter((a) => toList.includes(a));
    const externalCc = external.filter((a) => ccList.includes(a));
    const toSend =
      externalTo.length > 0
        ? externalTo
        : externalCc.length > 0
          ? [externalCc[0]]
          : [];
    const ccSend = externalTo.length > 0 ? externalCc : externalCc.slice(1);

    if (!toSend.length) {
      transportWarning = "Нет внешнего адреса получателя";
    } else {
      const result = await sendOutbound({
        fromName,
        fromEmail,
        to: toSend,
        cc: ccSend.length ? ccSend : undefined,
        subject,
        bodyHtml: outboundHtml,
        bodyText,
        tags: {
          pnk_msg: sent.id,
          pnk_mb: input.mailboxId,
        },
        headers,
        attachments: fileAttachments.length ? fileAttachments : undefined,
      });
      if (!result.ok) {
        transportWarning = result.error;
        await prisma.message.update({
          where: { id: sent.id },
          data: {
            deliveryStatus: "failed",
            deliveryDetail: result.error.slice(0, 1000),
          },
        });
        console.error("[mail-send] outbound failed", {
          to: toSend,
          error: result.error,
        });
      } else {
        await prisma.message.update({
          where: { id: sent.id },
          data: {
            providerId: result.providerId || null,
            deliveryStatus: "sent",
            deliveryDetail: "",
          },
        });
        console.info("[mail-send] outbound ok", {
          to: toSend,
          providerId: result.providerId,
          threadId: finalThreadId,
        });
      }
    }
  }

  return {
    ok: true,
    sentId: sent.id,
    deliveredInternal: internal.length,
    deliveredExternal: external.length,
    transportWarning,
  };
}
