import webpush from "web-push";
import { prisma } from "@/lib/db";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

function vapidConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim(),
  );
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

function ensureVapid(): boolean {
  if (!vapidConfigured()) return false;
  const subject =
    process.env.VAPID_SUBJECT?.trim() || "mailto:support@pnkmail.ru";
  webpush.setVapidDetails(
    subject,
    process.env.VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim(),
  );
  return true;
}

/** Notify all devices subscribed for a mailbox about a new message. */
export async function notifyMailboxNewMail(
  mailboxId: string,
  msg: {
    id: string;
    fromName: string;
    fromEmail: string;
    subject: string;
    preview: string;
  },
): Promise<void> {
  if (!ensureVapid()) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { mailboxId },
  });
  if (!subs.length) return;

  const title = (msg.fromName || msg.fromEmail || "Новое письмо").slice(0, 80);
  const body = [msg.subject, msg.preview]
    .filter(Boolean)
    .join(" — ")
    .slice(0, 160);
  const payload: PushPayload = {
    title,
    body: body || "Новое письмо",
    url: `/mail?open=${encodeURIComponent(msg.id)}`,
    tag: `mail-${msg.id}`,
  };
  const json = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          json,
          { TTL: 60 * 60 * 12, urgency: "high" },
        );
      } catch (err: unknown) {
        const status =
          err && typeof err === "object" && "statusCode" in err
            ? Number((err as { statusCode: number }).statusCode)
            : 0;
        // Gone / expired subscription
        if (status === 404 || status === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => undefined);
          return;
        }
        console.warn("[push] send failed", status || err);
      }
    }),
  );
}
