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
  subject: string;
  html: string | null;
  text: string | null;
  message_id?: string | null;
  attachments?: unknown[];
} | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;

  const res = await fetch(
    `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`,
    {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    console.error("resend receiving get failed", res.status, await res.text());
    return null;
  }
  return (await res.json()) as {
    from: string;
    to: string[];
    cc: string[];
    subject: string;
    html: string | null;
    text: string | null;
    message_id?: string | null;
    attachments?: unknown[];
  };
}
