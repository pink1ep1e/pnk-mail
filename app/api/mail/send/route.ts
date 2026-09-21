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
import { sendOutbound } from "@/lib/mail-transport";

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
  // Author content only — no logo / branded card for Gmail/Yandex.
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
      hasAttachment: false,
    },
  });

  const internal = [...new Set([...toList, ...ccList])].filter(isPnkMailAddress);
  const external = [...new Set([...toList, ...ccList])].filter(
    (a) => !isPnkMailAddress(a),
  );

  for (const address of internal) {
    if (address === fromEmail) continue;
    const recipient = await prisma.mailbox.findUnique({ where: { address } });
    if (!recipient) continue;

    await prisma.message.create({
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
        hasAttachment: false,
      },
    });
  }

  let transportWarning: string | null = null;
  if (external.length) {
    const externalTo = external.filter((a) => toList.includes(a));
    const externalCc = external.filter((a) => ccList.includes(a));
    // Resend/SES require at least one To — promote CC if needed
    const toSend =
      externalTo.length > 0
        ? externalTo
        : externalCc.length > 0
          ? [externalCc[0]]
          : [];
    const ccSend =
      externalTo.length > 0
        ? externalCc
        : externalCc.slice(1);

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
      });
      if (!result.ok) {
        transportWarning = result.error;
        console.error("[mail-send] outbound failed", {
          to: toSend,
          cc: ccSend,
          error: result.error,
          mode: process.env.MAIL_TRANSPORT || "console",
        });
      } else {
        console.info("[mail-send] outbound ok", {
          to: toSend,
          providerId: result.providerId,
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      message: toListDto(sent),
      deliveredInternal: internal.length,
      deliveredExternal: external.length,
      transportWarning,
    },
  });
}
