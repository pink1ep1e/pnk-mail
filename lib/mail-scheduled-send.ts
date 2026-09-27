import { prisma } from "@/lib/db";
import { parseAddressList } from "@/lib/mail-store";
import { sendMailMessage } from "@/lib/mail-outbound-send";

const PROCESS_LOCK_MS = 25_000;
let lastRunAt = 0;
let running = false;

/**
 * Send drafts marked deliveryStatus=scheduled whose remindAt has passed.
 * Safe to call often — globally throttled.
 */
export async function processDueScheduledSends(opts?: {
  force?: boolean;
  limit?: number;
}): Promise<{ processed: number; sent: number; failed: number }> {
  const now = Date.now();
  if (!opts?.force && (running || now - lastRunAt < PROCESS_LOCK_MS)) {
    return { processed: 0, sent: 0, failed: 0 };
  }
  running = true;
  lastRunAt = now;

  let processed = 0;
  let sent = 0;
  let failed = 0;

  try {
    const due = await prisma.message.findMany({
      where: {
        folder: "drafts",
        deliveryStatus: "scheduled",
        remindAt: { lte: new Date() },
      },
      orderBy: { remindAt: "asc" },
      take: opts?.limit ?? 20,
    });

    for (const draft of due) {
      processed += 1;

      // Claim row so parallel workers don't double-send
      const claimed = await prisma.message.updateMany({
        where: {
          id: draft.id,
          folder: "drafts",
          deliveryStatus: "scheduled",
        },
        data: {
          deliveryStatus: "sending",
          deliveryDetail: "scheduled-send",
        },
      });
      if (claimed.count === 0) continue;

      const toList = parseAddressList(draft.toAddresses || "");
      if (!toList.length) {
        await prisma.message.update({
          where: { id: draft.id },
          data: {
            deliveryStatus: "failed",
            deliveryDetail: "Нет получателя",
          },
        });
        failed += 1;
        continue;
      }

      let labelIds: string[] = [];
      try {
        const parsed = JSON.parse(draft.labelIds || "[]");
        if (Array.isArray(parsed)) {
          labelIds = parsed.filter((id) => typeof id === "string");
        }
      } catch {
        labelIds = [];
      }

      const result = await sendMailMessage({
        mailboxId: draft.mailboxId,
        fromName: draft.fromName,
        fromEmail: draft.fromEmail,
        to: draft.toAddresses,
        cc: draft.ccAddresses || "",
        subject: draft.subject,
        bodyHtml: draft.bodyHtml,
        threadId: draft.threadId,
        inReplyTo: draft.inReplyTo,
        labelIds,
        hasAttachment: draft.hasAttachment,
      });

      if (!result.ok) {
        await prisma.message.update({
          where: { id: draft.id },
          data: {
            deliveryStatus: "scheduled",
            deliveryDetail: result.error.slice(0, 1000),
            // Retry in ~2 minutes
            remindAt: new Date(Date.now() + 2 * 60_000),
          },
        });
        failed += 1;
        console.error("[scheduled-send] failed", {
          draftId: draft.id,
          error: result.error,
        });
        continue;
      }

      await prisma.message.delete({ where: { id: draft.id } }).catch(() =>
        prisma.message.update({
          where: { id: draft.id },
          data: {
            folder: "trash",
            deliveryStatus: "sent",
            remindAt: null,
            deliveryDetail: "",
          },
        }),
      );
      sent += 1;
      console.info("[scheduled-send] ok", {
        draftId: draft.id,
        sentId: result.sentId,
      });
    }
  } catch (e) {
    console.error("[scheduled-send] batch error", e);
  } finally {
    running = false;
  }

  return { processed, sent, failed };
}
