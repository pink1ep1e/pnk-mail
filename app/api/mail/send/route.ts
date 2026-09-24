import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireActiveMailbox } from "@/lib/mail-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-guard";
import {
  htmlToPreview,
  htmlToText,
  isPnkMailAddress,
  parseAddressList,
  toListDto,
} from "@/lib/mail-store";
import { outboundMailHtml, sanitizeMailHtml } from "@/lib/mail-template";
import {
  formatRfcMessageId,
  normalizeRfcMessageId,
} from "@/lib/mail-thread";
import { getMailFromDomain, sendOutbound } from "@/lib/mail-transport";
import { notifyMailboxNewMail } from "@/lib/web-push";

export async function POST(req: NextRequest) {
  const origin = assertSameOrigin(req);
  if (!origin.ok) {
    return NextResponse.json(
      { ok: false, error: { message: origin.message } },
      { status: 403 },
    );
  }

  const rl = rateLimit({
    key: `send:${clientIp(req)}`,
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: { message: "Слишком много отправок" } },
      { status: 429 },
    );
  }

  const auth = await requireActiveMailbox();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: { message: auth.message } },
      { status: auth.status },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    to?: string;
    cc?: string;
    subject?: string;
    bodyHtml?: string;
    replyToId?: string;
    labelIds?: string[];
    hasAttachment?: boolean;
  };

  const toList = parseAddressList(body.to || "");
  const ccList = parseAddressList(body.cc || "");
  const subject = (body.subject || "").trim().slice(0, 500) || "(без темы)";
  const rawHtml = (body.bodyHtml || "").trim() || "<p></p>";
  if (rawHtml.length > 200_000) {
    return NextResponse.json(
      { ok: false, error: { message: "Слишком большое письмо" } },
      { status: 400 },
    );
  }
  const bodyHtml = sanitizeMailHtml(rawHtml);
  const bodyText = htmlToText(bodyHtml);
  const preview = htmlToPreview(bodyHtml);
  const outboundHtml = outboundMailHtml(bodyHtml);

  if (!toList.length) {
    return NextResponse.json(
      { ok: false, error: { message: "Укажите получателя" } },
      { status: 400 },
    );
  }
  if (toList.length + ccList.length > 50) {
    return NextResponse.json(
      { ok: false, error: { message: "Слишком много получателей" } },
      { status: 400 },
    );
  }

  const fromName = auth.ctx.name;
  const fromEmail = auth.ctx.email;
  const toJoined = toList.join(", ");
  const ccJoined = ccList.join(", ");
  const domain = getMailFromDomain();

  const internal = [...new Set([...toList, ...ccList])].filter(isPnkMailAddress);
  const external = [...new Set([...toList, ...ccList])].filter(
    (a) => !isPnkMailAddress(a),
  );

  let threadId: string | null = null;
  let inReplyTo: string | null = null;
  const refIds: string[] = [];
  const replyToId = (body.replyToId || "").trim();

  if (replyToId) {
    const parent = await prisma.message.findFirst({
      where: { id: replyToId, mailboxId: auth.ctx.mailboxId },
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
          mailboxId: auth.ctx.mailboxId,
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

  const labelIds = Array.isArray(body.labelIds)
    ? body.labelIds.filter((id) => typeof id === "string" && id.length > 0).slice(0, 20)
    : [];
  const hasAttachment =
    Boolean(body.hasAttachment) ||
    /<img\b/i.test(bodyHtml) ||
    /download=/i.test(bodyHtml);

  const sent = await prisma.message.create({
    data: {
      mailboxId: auth.ctx.mailboxId,
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
    const ccSend =
      externalTo.length > 0 ? externalCc : externalCc.slice(1);

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
          pnk_mb: auth.ctx.mailboxId,
        },
        headers,
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

  const fresh = await prisma.message.findUnique({ where: { id: sent.id } });
  return NextResponse.json({
    ok: true,
    data: {
      message: toListDto(fresh || sent),
      deliveredInternal: internal.length,
      deliveredExternal: external.length,
      transportWarning,
    },
  });
}
