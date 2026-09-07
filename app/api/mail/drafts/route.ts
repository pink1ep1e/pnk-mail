import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireActiveMailbox } from "@/lib/mail-auth";
import {
  htmlToPreview,
  htmlToText,
  toListDto,
} from "@/lib/mail-store";
import { sanitizeMailHtml } from "@/lib/mail-template";

/** Create or update a draft. */
export async function POST(req: NextRequest) {
  const auth = await requireActiveMailbox();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: { message: auth.message } },
      { status: auth.status },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    to?: string;
    cc?: string;
    subject?: string;
    bodyHtml?: string;
  };

  const to = (body.to || "").trim();
  const cc = (body.cc || "").trim();
  const subject = (body.subject || "").trim().slice(0, 500) || "(без темы)";
  const rawHtml = (body.bodyHtml || "").trim() || "<p></p>";
  const bodyHtml = sanitizeMailHtml(rawHtml);
  const bodyText = htmlToText(bodyHtml);
  const preview = htmlToPreview(bodyHtml);

  const empty =
    !to &&
    !cc &&
    !(body.subject || "").trim() &&
    (!bodyHtml || bodyHtml === "<p></p>" || bodyHtml === "<br>" || bodyHtml === "<div><br></div>");

  if (empty) {
    if (body.id) {
      await prisma.message.deleteMany({
        where: {
          id: body.id,
          mailboxId: auth.ctx.mailboxId,
          folder: "drafts",
        },
      });
    }
    return NextResponse.json({
      ok: true,
      data: { message: null, discarded: true },
    });
  }

  const fromName = auth.ctx.name;
  const fromEmail = auth.ctx.email;

  if (body.id) {
    const existing = await prisma.message.findFirst({
      where: {
        id: body.id,
        mailboxId: auth.ctx.mailboxId,
        folder: "drafts",
      },
    });
    if (existing) {
      const updated = await prisma.message.update({
        where: { id: existing.id },
        data: {
          toAddresses: to,
          ccAddresses: cc,
          subject,
          preview,
          bodyHtml,
          bodyText,
          unread: false,
        },
      });
      return NextResponse.json({
        ok: true,
        data: { message: toListDto(updated), id: updated.id },
      });
    }
  }

  const created = await prisma.message.create({
    data: {
      mailboxId: auth.ctx.mailboxId,
      folder: "drafts",
      fromName,
      fromEmail,
      toAddresses: to,
      ccAddresses: cc,
      subject,
      preview,
      bodyHtml,
      bodyText,
      unread: false,
      hasAttachment: false,
    },
  });

  return NextResponse.json({
    ok: true,
    data: { message: toListDto(created), id: created.id },
  });
}
