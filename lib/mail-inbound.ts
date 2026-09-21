import { prisma } from "@/lib/db";
import {
  htmlToPreview,
  htmlToText,
  isPnkMailAddress,
  parseAddressList,
} from "@/lib/mail-store";
import { sanitizeMailHtml } from "@/lib/mail-template";
import { getMailFromDomain } from "@/lib/mail-transport";

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
  const externalKey = payload.messageId
    ? `ext:${payload.messageId.slice(0, 200)}`
    : null;

  for (const address of ours) {
    const mailbox = await prisma.mailbox.findUnique({ where: { address } });
    if (!mailbox) {
      unknown.push(address);
      continue;
    }

    if (externalKey) {
      const dup = await prisma.message.findFirst({
        where: { mailboxId: mailbox.id, threadId: externalKey },
        select: { id: true },
      });
      if (dup) {
        skipped.push(address);
        continue;
      }
    }

    await prisma.message.create({
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
        unread: true,
        hasAttachment: Boolean(payload.hasAttachment),
        threadId: externalKey,
      },
    });
    delivered.push(address);
  }

  return { delivered, skipped, unknown };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

  const result = await deliverInbound({
    fromName: from.name,
    fromEmail: from.email,
    to,
    cc,
    subject: full?.subject || meta?.subject || "(без темы)",
    bodyHtml: full?.html || undefined,
    bodyText:
      full?.text ||
      (!full?.html
        ? `(письмо из Resend)\nОт: ${from.email}\nТема: ${full?.subject || meta?.subject || ""}`
        : undefined),
    messageId: full?.message_id || meta?.message_id || `resend:${emailId}`,
    hasAttachment: Array.isArray(full?.attachments)
      ? full!.attachments!.length > 0
      : Array.isArray(meta?.attachments)
        ? meta!.attachments!.length > 0
        : false,
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
      for (const item of list) {
        if (!item?.id) continue;
        const r = await deliverResendEmailById(item.id, item);
        delivered += r.delivered.length;
      }
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
