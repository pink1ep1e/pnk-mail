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
  if (!vapidConfigured()) {
    console.warn("[push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY не заданы");
    return false;
  }
  const pub = process.env.VAPID_PUBLIC_KEY!.trim();
  const priv = process.env.VAPID_PRIVATE_KEY!.trim();
  // Typical VAPID public key is ~87 chars URL-safe base64; truncated keys break subscribe/send
  if (pub.length < 80 || !pub.startsWith("B")) {
    console.warn(
      "[push] VAPID_PUBLIC_KEY похоже обрезан (должен начинаться с B и быть ~87 символов)",
      { length: pub.length },
    );
  }
  const subject =
    process.env.VAPID_SUBJECT?.trim() || "mailto:support@pnkmail.ru";
  webpush.setVapidDetails(subject, pub, priv);
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
): Promise<{ ok: number; failed: number }> {
  if (!ensureVapid()) return { ok: 0, failed: 0 };

  const subs = await prisma.pushSubscription.findMany({
    where: { mailboxId },
  });
  if (!subs.length) {
    console.info("[push] no subscriptions for mailbox", mailboxId);
    return { ok: 0, failed: 0 };
  }
  console.info("[push] sending", {
    mailboxId,
    devices: subs.length,
    tag: `mail-${msg.id}`,
  });

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

  let ok = 0;
  let failed = 0;
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
        ok += 1;
      } catch (err: unknown) {
        failed += 1;
        const status =
          err && typeof err === "object" && "statusCode" in err
            ? Number((err as { statusCode: number }).statusCode)
            : 0;
        const errBody =
          err && typeof err === "object" && "body" in err
            ? String((err as { body: unknown }).body)
            : "";
        if (status === 404 || status === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => undefined);
          return;
        }
        console.warn("[push] send failed", {
          status,
          body: errBody.slice(0, 200),
          err,
        });
      }
    }),
  );
  console.info("[push] done", { mailboxId, ok, failed });
  return { ok, failed };
}
