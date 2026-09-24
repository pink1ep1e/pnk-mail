import { NextRequest, NextResponse } from "next/server";
import { requireActiveMailbox } from "@/lib/mail-auth";
import { prisma } from "@/lib/db";
import { getVapidPublicKey } from "@/lib/web-push";

export const runtime = "nodejs";

type SubBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

/** Save or refresh a Web Push subscription for the active mailbox. */
export async function POST(req: NextRequest) {
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

  let body: SubBody;
  try {
    body = (await req.json()) as SubBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Некорректный JSON" } },
      { status: 400 },
    );
  }

  const endpoint = (body.endpoint || "").trim();
  const p256dh = (body.keys?.p256dh || "").trim();
  const authKey = (body.keys?.auth || "").trim();
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json(
      { ok: false, error: { message: "Нужны endpoint и keys" } },
      { status: 400 },
    );
  }

  const userAgent = (req.headers.get("user-agent") || "").slice(0, 300);

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      mailboxId: auth.ctx.mailboxId,
      endpoint,
      p256dh,
      auth: authKey,
      userAgent,
    },
    update: {
      mailboxId: auth.ctx.mailboxId,
      p256dh,
      auth: authKey,
      userAgent,
    },
  });

  return NextResponse.json({ ok: true, data: { subscribed: true } });
}

/** Remove a subscription (or all for this mailbox if no endpoint). */
export async function DELETE(req: NextRequest) {
  const auth = await requireActiveMailbox();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: { message: auth.message } },
      { status: auth.status },
    );
  }

  let endpoint = "";
  try {
    const body = (await req.json()) as { endpoint?: string };
    endpoint = (body.endpoint || "").trim();
  } catch {
    endpoint = "";
  }

  if (endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { mailboxId: auth.ctx.mailboxId, endpoint },
    });
  } else {
    await prisma.pushSubscription.deleteMany({
      where: { mailboxId: auth.ctx.mailboxId },
    });
  }

  return NextResponse.json({ ok: true, data: { unsubscribed: true } });
}
