import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireActiveMailbox } from "@/lib/mail-auth";
import { toListDto } from "@/lib/mail-store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireActiveMailbox();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: { message: auth.message } },
      { status: auth.status },
    );
  }

  const { id } = await params;
  const row = await prisma.message.findFirst({
    where: { id, mailboxId: auth.ctx.mailboxId },
  });

  if (!row) {
    return NextResponse.json(
      { ok: false, error: { message: "Письмо не найдено" } },
      { status: 404 },
    );
  }

  if (row.unread) {
    row.unread = false;
    void prisma.message.update({
      where: { id: row.id },
      data: { unread: false },
    });
  }

  return NextResponse.json({
    ok: true,
    data: {
      message: {
        ...toListDto(row),
        // Already sanitized on write — don't re-sanitize (it strips styles → white box)
        bodyHtml: row.bodyHtml,
        bodyText: row.bodyText,
        to: row.toAddresses,
        cc: row.ccAddresses,
        createdAt: row.createdAt.toISOString(),
      },
    },
  });
}
