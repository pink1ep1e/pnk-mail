import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireActiveMailbox } from "@/lib/mail-auth";
import { toListDto } from "@/lib/mail-store";
import {
  extractLogoFromHtml,
  resolveSenderAvatarUrl,
} from "@/lib/sender-avatar";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
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

  // Prefetch uses ?read=0 so hover doesn't clear "новое"
  const markRead = req.nextUrl.searchParams.get("read") !== "0";

  const threadKey = row.threadId || row.id;
  const threadRows = await prisma.message.findMany({
    where: {
      mailboxId: auth.ctx.mailboxId,
      OR: [{ threadId: threadKey }, { id: threadKey }],
      NOT: { folder: { in: ["trash", "spam", "drafts"] } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Always include the opened message even if filtered out
  if (!threadRows.some((m) => m.id === row.id)) {
    threadRows.push(row);
    threadRows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Mark entire conversation read when opening
  if (markRead) {
    const unreadIds = threadRows.filter((m) => m.unread).map((m) => m.id);
    if (unreadIds.length) {
      await prisma.message.updateMany({
        where: { id: { in: unreadIds }, mailboxId: auth.ctx.mailboxId },
        data: { unread: false },
      });
      for (const m of threadRows) {
        if (unreadIds.includes(m.id)) m.unread = false;
      }
      row.unread = false;
    }
  }

  // Lazy-backfill logos extracted from branded HTML (old messages)
  for (const m of threadRows) {
    if (m.senderLogoUrl || !m.bodyHtml) continue;
    const logo = extractLogoFromHtml(m.bodyHtml);
    if (!logo) continue;
    m.senderLogoUrl = logo;
    void prisma.message
      .update({
        where: { id: m.id },
        data: { senderLogoUrl: logo },
      })
      .catch(() => undefined);
  }
  if (!row.senderLogoUrl && row.bodyHtml) {
    const logo = extractLogoFromHtml(row.bodyHtml);
    if (logo) row.senderLogoUrl = logo;
  }

  const toDetail = (m: (typeof row)) => {
    const base = toListDto(m);
    return {
      ...base,
      avatarUrl: resolveSenderAvatarUrl(m.fromEmail, {
        stored: m.senderLogoUrl,
        html: m.bodyHtml,
      }),
      bodyHtml: m.bodyHtml,
      bodyText: m.bodyText,
      to: m.toAddresses,
      cc: m.ccAddresses,
      createdAt: m.createdAt.toISOString(),
    };
  };

  return NextResponse.json({
    ok: true,
    data: {
      message: toDetail(row),
      thread: threadRows.map(toDetail),
    },
  });
}
