import { NextResponse } from "next/server";
import { requireActiveMailbox } from "@/lib/mail-auth";
import { getVapidPublicKey, notifyMailboxNewMail } from "@/lib/web-push";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** Send a test push to the active mailbox subscriptions. */
export async function POST() {
  if (!getVapidPublicKey()) {
    return NextResponse.json(
      { ok: false, error: { message: "VAPID не настроен" } },
      { status: 503 },
    );
  }

  const auth = await requireActiveMailbox();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: { message: auth.message } },
      { status: auth.status },
    );
  }

  const count = await prisma.pushSubscription.count({
    where: { mailboxId: auth.ctx.mailboxId },
  });
  if (!count) {
    return NextResponse.json(
      {
        ok: false,
        error: { message: "Нет подписок — сначала включите уведомления" },
      },
      { status: 400 },
    );
  }

  const result = await notifyMailboxNewMail(auth.ctx.mailboxId, {
    id: "test",
    fromName: "pnk Почта",
    fromEmail: "noreply@pnkmail.ru",
    subject: "Тест уведомлений",
    preview: "Если вы это видите — push работает",
  });

  if (result.ok === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: result.failed
            ? "Отправка не удалась — нажмите «Включить» уведомления ещё раз"
            : "Нет активных подписок",
        },
        data: result,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: { sent: true, subscriptions: count, ...result },
  });
}
