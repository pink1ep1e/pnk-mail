import { NextResponse } from "next/server";
import { requireActiveMailbox } from "@/lib/mail-auth";
import { prisma } from "@/lib/db";
import { getVapidPublicKey } from "@/lib/web-push";

export const runtime = "nodejs";

/** Debug: VAPID + subscription count for active mailbox. */
export async function GET() {
  const auth = await requireActiveMailbox();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: { message: auth.message } },
      { status: auth.status },
    );
  }

  const key = getVapidPublicKey();
  const subs = await prisma.pushSubscription.findMany({
    where: { mailboxId: auth.ctx.mailboxId },
    select: {
      id: true,
      endpoint: true,
      createdAt: true,
      userAgent: true,
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      vapidConfigured: Boolean(key),
      vapidPublicKeyLength: key?.length ?? 0,
      vapidLooksValid: Boolean(key && key.length >= 80 && key.startsWith("B")),
      mailboxId: auth.ctx.mailboxId,
      subscriptions: subs.length,
      devices: subs.map((s) => ({
        id: s.id,
        endpointHost: (() => {
          try {
            return new URL(s.endpoint).host;
          } catch {
            return "invalid";
          }
        })(),
        createdAt: s.createdAt,
        userAgent: (s.userAgent || "").slice(0, 80),
      })),
    },
  });
}
