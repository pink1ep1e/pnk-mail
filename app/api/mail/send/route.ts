import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireActiveMailbox } from "@/lib/mail-auth";
import { sendMailMessage } from "@/lib/mail-outbound-send";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-guard";
import { toListDto } from "@/lib/mail-store";

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
    attachments?: Array<{
      filename?: string;
      content?: string;
      contentType?: string;
    }>;
  };

  const result = await sendMailMessage({
    mailboxId: auth.ctx.mailboxId,
    fromName: auth.ctx.name,
    fromEmail: auth.ctx.email,
    to: body.to || "",
    cc: body.cc || "",
    subject: body.subject,
    bodyHtml: body.bodyHtml,
    replyToId: body.replyToId,
    labelIds: body.labelIds,
    hasAttachment: body.hasAttachment,
    attachments: Array.isArray(body.attachments)
      ? body.attachments
          .filter(
            (a) =>
              a &&
              typeof a.filename === "string" &&
              typeof a.content === "string",
          )
          .map((a) => ({
            filename: a.filename!,
            content: a.content!,
            contentType: a.contentType || "application/octet-stream",
          }))
      : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: { message: result.error } },
      { status: 400 },
    );
  }

  const fresh = await prisma.message.findUnique({
    where: { id: result.sentId },
  });
  return NextResponse.json({
    ok: true,
    data: {
      message: fresh ? toListDto(fresh) : { id: result.sentId },
      deliveredInternal: result.deliveredInternal,
      deliveredExternal: result.deliveredExternal,
      transportWarning: result.transportWarning,
    },
  });
}
