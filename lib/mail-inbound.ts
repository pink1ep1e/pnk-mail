import { prisma } from "@/lib/db";
import {
  htmlToPreview,
  htmlToText,
  isPnkMailAddress,
  parseAddressList,
} from "@/lib/mail-store";
import { sanitizeMailHtml } from "@/lib/mail-template";
import { extractLogoFromHtml } from "@/lib/sender-avatar";
import {
  headerValue,
  normalizeRfcMessageId,
  parseMessageIdList,
} from "@/lib/mail-thread";
import { getMailFromDomain } from "@/lib/mail-transport";
import { notifyMailboxNewMail } from "@/lib/web-push";

export type InboundPayload = {
  fromName: string;
  fromEmail: string;
  to: string[];
  cc?: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  /** External Message-ID for dedup */
  messageId?: string | null;
  inReplyTo?: string | null;
  references?: string | null;
  hasAttachment?: boolean;
};

export type InboundResult = {
  delivered: string[];
  skipped: string[];
  unknown: string[];
};

function parseFromHeader(raw: string): { name: string; email: string } {
  const s = (raw || "").trim();
  const m = s.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (m) {
    const email = m[2].trim().toLowerCase();
    const name = m[1].replace(/^["']|["']$/g, "").trim() || email.split("@")[0];
    return { name, email };
  }
  const email = s.toLowerCase();
  return { name: email.split("@")[0] || email, email };
}

export function normalizeInboundAddresses(list: unknown): string[] {
  if (!Array.isArray(list)) {
    if (typeof list === "string") return parseAddressList(list);
    return [];
  }
  return [
    ...new Set(
      list
        .flatMap((item) => {
          if (typeof item === "string") return parseAddressList(item);
          if (item && typeof item === "object" && "email" in item) {
            return parseAddressList(String((item as { email: string }).email));
          }
          return [];
        })
        .map((a) => a.toLowerCase()),
    ),
  ];
}

export function parseInboundFrom(raw: string): { name: string; email: string } {
  return parseFromHeader(raw);
}

/** Deliver one inbound message into matching @domain mailboxes. */
export async function deliverInbound(
  payload: InboundPayload,
): Promise<InboundResult> {
  const domain = getMailFromDomain();
  const recipients = [...new Set([...(payload.to || []), ...(payload.cc || [])])]
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);

  const ours = recipients.filter(
    (a) => a.endsWith(`@${domain}`) || isPnkMailAddress(a),
  );
  if (!ours.length) {
    console.warn("[inbound] no matching @domain recipients", {
      domain,
      recipients,
    });
  }
  const unknown: string[] = [];
  const delivered: string[] = [];
  const skipped: string[] = [];

  const rawHtml = (payload.bodyHtml || "").trim();
  const bodyHtml = rawHtml
    ? sanitizeMailHtml(rawHtml)
    : `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(payload.bodyText || "")}</pre>`;
  const bodyText = (payload.bodyText || "").trim() || htmlToText(bodyHtml);
  const preview = htmlToPreview(bodyHtml || bodyText);
  const subject = (payload.subject || "(без темы)").slice(0, 500);
  const toJoined = (payload.to || []).join(", ");
  const ccJoined = (payload.cc || []).join(", ");
  const rfcMessageId = normalizeRfcMessageId(payload.messageId);
  const replyIds = [
    ...parseMessageIdList(payload.inReplyTo),
    ...parseMessageIdList(payload.references),
  ];
  const inReplyTo = replyIds[0] || null;
  const senderLogoUrl = extractLogoFromHtml(bodyHtml);

  for (const address of ours) {
    const mailbox = await prisma.mailbox.findUnique({ where: { address } });
    if (!mailbox) {
      unknown.push(address);
      continue;
    }

    if (rfcMessageId) {
      const dup = await prisma.message.findFirst({
        where: {
          mailboxId: mailbox.id,
          OR: [
            { rfcMessageId },
            { threadId: `ext:${rfcMessageId.slice(0, 200)}` },
          ],
        },
        select: { id: true, bodyHtml: true, hasAttachment: true },
      });
      if (dup) {
        // Backfill attachments if sync/webhook previously skipped them
        const incomingAttach = /data-pnk-attachments/i.test(bodyHtml);
        const existingAttach = /data-pnk-attachments/i.test(dup.bodyHtml || "");
        if (incomingAttach && !existingAttach) {
          const wrap =
            bodyHtml.match(
              /<div[^>]*data-pnk-attachments-wrap[\s\S]*?<\/div>/i,
            )?.[0] || "";
          if (wrap) {
            await prisma.message.update({
              where: { id: dup.id },
              data: {
                bodyHtml: `${dup.bodyHtml || ""}${wrap}`,
                hasAttachment: true,
              },
            });
          }
        } else if (payload.hasAttachment && !dup.hasAttachment) {
          await prisma.message.update({
            where: { id: dup.id },
            data: { hasAttachment: true },
          });
        }
        skipped.push(address);
        continue;
      }
    }

    const threadId = await resolveInboundThreadId({
      mailboxId: mailbox.id,
      replyIds,
      subject,
      fromEmail: payload.fromEmail.toLowerCase(),
    });

    const created = await prisma.message.create({
      data: {
        mailboxId: mailbox.id,
        folder: "inbox",
        fromName: payload.fromName || payload.fromEmail.split("@")[0],
        fromEmail: payload.fromEmail.toLowerCase(),
        toAddresses: toJoined || address,
        ccAddresses: ccJoined,
        subject,
        preview,
        bodyHtml,
        bodyText,
        senderLogoUrl: senderLogoUrl || undefined,
        unread: true,
        hasAttachment:
          Boolean(payload.hasAttachment) ||
          /data-pnk-attachments/i.test(bodyHtml) ||
          /download=/i.test(bodyHtml),
        threadId: threadId || undefined,
        rfcMessageId: rfcMessageId || undefined,
        inReplyTo: inReplyTo || undefined,
      },
    });

    if (!threadId) {
      await prisma.message.update({
        where: { id: created.id },
        data: { threadId: created.id },
      });
    }
    delivered.push(address);

    try {
      await notifyMailboxNewMail(mailbox.id, {
        id: created.id,
        fromName: created.fromName,
        fromEmail: created.fromEmail,
        subject: created.subject,
        preview: created.preview,
      });
    } catch (e) {
      console.warn("[inbound] push notify failed", e);
    }
  }

  return { delivered, skipped, unknown };
}

async function resolveInboundThreadId(params: {
  mailboxId: string;
  replyIds: string[];
  subject: string;
  fromEmail: string;
}): Promise<string | null> {
  const { mailboxId, replyIds } = params;

  // Only RFC threading — never merge by subject alone (Gmail "привет" spam)
  if (!replyIds.length) return null;

  const byRfc = await prisma.message.findFirst({
    where: {
      mailboxId,
      OR: [
        { rfcMessageId: { in: replyIds } },
        { threadId: { in: replyIds.map((id) => `ext:${id.slice(0, 200)}`) } },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, threadId: true, rfcMessageId: true },
  });
  if (!byRfc) return null;

  const key = byRfc.threadId || byRfc.id;
  if (!byRfc.threadId) {
    await prisma.message.update({
      where: { id: byRfc.id },
      data: { threadId: byRfc.id },
    });
  }
  return key;
}

/**
 * Undo false merges from the old "same subject → one thread" heuristic.
 * Root/new messages have no In-Reply-To but share a foreign threadId.
 */
const lastThreadRepairAt = new Map<string, number>();

export async function repairFalseSubjectThreads(
  mailboxId: string,
): Promise<number> {
  const now = Date.now();
  const prev = lastThreadRepairAt.get(mailboxId) || 0;
  if (now - prev < 60_000) return 0;
  lastThreadRepairAt.set(mailboxId, now);

  const rows = await prisma.message.findMany({
    where: {
      mailboxId,
      OR: [{ inReplyTo: null }, { inReplyTo: "" }],
      NOT: { threadId: null },
    },
    select: { id: true, threadId: true },
    take: 500,
  });
  let fixed = 0;
  for (const row of rows) {
    if (!row.threadId || row.threadId === row.id) continue;
    // Keep ext: keys that are this message's own external id form
    if (row.threadId.startsWith("ext:")) continue;
    await prisma.message.update({
      where: { id: row.id },
      data: { threadId: row.id },
    });
    fixed += 1;
  }
  if (fixed > 0) {
    console.info("[inbound] repaired false subject threads", mailboxId, fixed);
  }
  return fixed;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** List attachments for a received Resend email and build embeddable HTML. */
export async function fetchResendAttachmentHtml(
  emailId: string,
): Promise<{ html: string; count: number }> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !emailId) return { html: "", count: 0 };

  try {
    const res = await fetch(
      `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments`,
      {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
      },
    );
    if (!res.ok) {
      console.error(
        "[inbound] list attachments failed",
        res.status,
        await res.text(),
      );
      return { html: "", count: 0 };
    }
    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        filename?: string;
        size?: number;
        content_type?: string;
        content_disposition?: string;
        content_id?: string;
        download_url?: string;
      }>;
    };
    const list = Array.isArray(json.data) ? json.data : [];
    // Real files only — skip CID inline images used in HTML bodies
    const files = list.filter((a) => {
      const disp = (a.content_disposition || "").toLowerCase();
      const type = (a.content_type || "").toLowerCase();
      if (disp === "inline" && type.startsWith("image/")) return false;
      return Boolean(a.id || a.download_url || a.filename);
    });
    if (!files.length) return { html: "", count: 0 };

    const { buildAttachmentsHtml } = await import("@/lib/mail-attachments");
    const items: Array<{
      name: string;
      size: number;
      type: string;
      dataUrl: string;
    }> = [];

    for (const a of files.slice(0, 10)) {
      const name = (a.filename || "файл").slice(0, 200);
      const type = a.content_type || "application/octet-stream";
      let downloadUrl = a.download_url || "";

      // Refresh signed URL via single-attachment endpoint when missing/stale
      if (!downloadUrl && a.id) {
        try {
          const one = await fetch(
            `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(a.id)}`,
            {
              headers: { Authorization: `Bearer ${key}` },
              cache: "no-store",
            },
          );
          if (one.ok) {
            const meta = (await one.json()) as { download_url?: string };
            downloadUrl = meta.download_url || "";
          }
        } catch (e) {
          console.warn("[inbound] attachment meta refresh failed", name, e);
        }
      }

      if (!downloadUrl) {
        console.warn("[inbound] attachment has no download_url", name, a.id);
        continue;
      }

      try {
        const fileRes = await fetch(downloadUrl, { cache: "no-store" });
        if (!fileRes.ok) {
          console.warn(
            "[inbound] attachment download HTTP",
            fileRes.status,
            name,
          );
          continue;
        }
        const buf = Buffer.from(await fileRes.arrayBuffer());
        // Over ~7MB keep remote URL (still downloadable until URL expires —
        // prefer embedding when possible)
        if (buf.length > 7_000_000) {
          items.push({
            name,
            size: buf.length,
            type,
            dataUrl: downloadUrl,
          });
          continue;
        }
        items.push({
          name,
          size: buf.length,
          type,
          dataUrl: `data:${type};base64,${buf.toString("base64")}`,
        });
      } catch (e) {
        console.warn("[inbound] attachment download failed", name, e);
      }
    }

    if (!items.length) return { html: "", count: files.length };
    return { html: buildAttachmentsHtml(items), count: items.length };
  } catch (e) {
    console.error("[inbound] attachments error", e);
    return { html: "", count: 0 };
  }
}

/** Fetch full received email from Resend Receiving API. */
export async function fetchResendReceivedEmail(emailId: string): Promise<{
  from: string;
  to: string[];
  cc: string[];
  received_for?: string[];
  subject: string;
  html: string | null;
  text: string | null;
  message_id?: string | null;
  headers?: Record<string, string>;
  attachments?: unknown[];
} | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[inbound] RESEND_API_KEY не задан — нельзя скачать тело письма");
    return null;
  }

  const res = await fetch(
    `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`,
    {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    console.error(
      "[inbound] resend receiving get failed",
      res.status,
      await res.text(),
    );
    return null;
  }
  return (await res.json()) as {
    from: string;
    to: string[];
    cc: string[];
    received_for?: string[];
    subject: string;
    html: string | null;
    text: string | null;
    message_id?: string | null;
    headers?: Record<string, string>;
    attachments?: unknown[];
  };
}

export type ResendReceivedMeta = {
  id: string;
  from?: string;
  to?: string[];
  cc?: string[];
  received_for?: string[];
  subject?: string;
  message_id?: string | null;
  attachments?: unknown[];
};

/** List recent received emails from Resend. */
export async function listResendReceivedEmails(
  limit = 20,
): Promise<ResendReceivedMeta[]> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return [];
  const res = await fetch(
    `https://api.resend.com/emails/receiving?limit=${Math.min(100, Math.max(1, limit))}`,
    {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    console.error(
      "[inbound] list receiving failed",
      res.status,
      await res.text(),
    );
    return [];
  }
  const json = (await res.json()) as { data?: ResendReceivedMeta[] };
  return Array.isArray(json.data) ? json.data : [];
}

/** Fetch + deliver one Resend received email into local mailboxes. */
export async function deliverResendEmailById(
  emailId: string,
  meta?: ResendReceivedMeta,
): Promise<InboundResult & { emailId: string; from?: string; to?: string[] }> {
  const full = await fetchResendReceivedEmail(emailId);
  const from = parseInboundFrom(
    full?.from ||
      (full?.headers && typeof full.headers.from === "string"
        ? full.headers.from
        : "") ||
      meta?.from ||
      "",
  );
  const to = normalizeInboundAddresses([
    ...(full?.to?.length ? full.to : []),
    ...(full?.received_for?.length ? full.received_for : []),
    ...(meta?.to?.length ? meta.to : []),
    ...(meta?.received_for?.length ? meta.received_for : []),
  ]);
  const cc = normalizeInboundAddresses(
    full?.cc?.length ? full.cc : meta?.cc || [],
  );

  if (!from.email || !to.length) {
    console.warn("[inbound] deliverById missing from/to", {
      emailId,
      from: from.email,
      to,
      fullTo: full?.to,
      fullReceivedFor: full?.received_for,
      metaTo: meta?.to,
    });
    return {
      emailId,
      from: from.email,
      to,
      delivered: [],
      skipped: [],
      unknown: to,
    };
  }

  let bodyHtml = full?.html || undefined;

  // Always ask Attachments API — Gmail files often missing from email.attachments meta
  const att = await fetchResendAttachmentHtml(emailId);
  if (att.html) {
    bodyHtml = `${bodyHtml || ""}${att.html}`;
  }

  const result = await deliverInbound({
    fromName: from.name,
    fromEmail: from.email,
    to,
    cc,
    subject: full?.subject || meta?.subject || "(без темы)",
    bodyHtml,
    bodyText:
      full?.text ||
      (!full?.html
        ? `(письмо из Resend)\nОт: ${from.email}\nТема: ${full?.subject || meta?.subject || ""}`
        : undefined),
    messageId: full?.message_id || meta?.message_id || `resend:${emailId}`,
    inReplyTo:
      headerValue(full?.headers, "in-reply-to") ||
      headerValue(full?.headers, "In-Reply-To") ||
      null,
    references:
      headerValue(full?.headers, "references") ||
      headerValue(full?.headers, "References") ||
      null,
    hasAttachment: Boolean(att.html),
  });

  return { emailId, from: from.email, to, ...result };
}

let lastAutoSyncAt = 0;
let autoSyncInFlight: Promise<number> | null = null;

/**
 * Pull recent Resend Receiving mail into local DB.
 * Throttled — safe to call on every inbox refresh (webhook fallback).
 */
export async function maybeSyncResendInbound(opts?: {
  limit?: number;
  minIntervalMs?: number;
}): Promise<number> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return 0;

  const minInterval = opts?.minIntervalMs ?? 45_000;
  const now = Date.now();
  if (now - lastAutoSyncAt < minInterval) return 0;
  if (autoSyncInFlight) return autoSyncInFlight;

  autoSyncInFlight = (async () => {
    lastAutoSyncAt = Date.now();
    let delivered = 0;
    try {
      const list = await listResendReceivedEmails(opts?.limit ?? 15);
      const items = list.filter((item) => item?.id);
      // Parallel pull with small concurrency — much faster than sequential
      const concurrency = 3;
      let cursor = 0;
      const workers = Array.from(
        { length: Math.min(concurrency, items.length) },
        async () => {
          while (cursor < items.length) {
            const idx = cursor++;
            const item = items[idx];
            try {
              const r = await deliverResendEmailById(item.id, item);
              delivered += r.delivered.length;
            } catch (e) {
              console.error("[inbound/auto-sync] item failed", item.id, e);
            }
          }
        },
      );
      await Promise.all(workers);
      if (delivered > 0) {
        console.info("[inbound/auto-sync] delivered", delivered);
      }
    } catch (e) {
      console.error("[inbound/auto-sync] failed", e);
    } finally {
      autoSyncInFlight = null;
    }
    return delivered;
  })();

  return autoSyncInFlight;
}
