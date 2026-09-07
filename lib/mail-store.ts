import { prisma } from "@/lib/db";
import { avatarColor } from "@/lib/mail-session";
import type { FolderId, MailMessage } from "@/lib/mail-data";
import { welcomeMailHtml } from "@/lib/mail-template";

export type MailFolder = Exclude<FolderId, "all">;

export async function ensureMailbox(ownerUserId: string, address: string) {
  const normalized = address.trim().toLowerCase();
  const existing = await prisma.mailbox.findUnique({
    where: { address: normalized },
  });
  if (existing) {
    // Never reassign mailbox ownership — prevents takeover of historical mail
    if (existing.ownerUserId !== ownerUserId) {
      throw new Error("MAILBOX_OWNERSHIP_CONFLICT");
    }
    await refreshWelcomeMessage(existing.id, normalized);
    return existing;
  }

  const mailbox = await prisma.mailbox.create({
    data: {
      ownerUserId,
      address: normalized,
    },
  });

  await createWelcomeMessage(mailbox.id, normalized);
  return mailbox;
}

const WELCOME_SUBJECT = "Добро пожаловать в pnk почту";
const WELCOME_FROM = "hello@pnkmail.ru";

async function createWelcomeMessage(mailboxId: string, address: string) {
  const bodyHtml = welcomeMailHtml(address);
  await prisma.message.create({
    data: {
      mailboxId,
      folder: "inbox",
      fromName: "pnk Почта",
      fromEmail: WELCOME_FROM,
      toAddresses: address,
      subject: WELCOME_SUBJECT,
      preview:
        "Ваш ящик готов. Пишите на @pnkmail.ru — письма между аккаунтами доставляются сразу.",
      bodyHtml,
      bodyText: htmlToText(bodyHtml),
      unread: true,
      hasAttachment: false,
    },
  });
}

/** Upgrade old plain welcome letters to the card HTML template. */
async function refreshWelcomeMessage(mailboxId: string, address: string) {
  const welcome = await prisma.message.findFirst({
    where: {
      mailboxId,
      fromEmail: WELCOME_FROM,
      subject: WELCOME_SUBJECT,
    },
    orderBy: { createdAt: "asc" },
  });
  if (!welcome) return;
  if (welcome.bodyHtml.includes("data-pnk-welcome=\"v3\"")) return;

  const bodyHtml = welcomeMailHtml(address);
  await prisma.message.update({
    where: { id: welcome.id },
    data: {
      bodyHtml,
      bodyText: htmlToText(bodyHtml),
      preview:
        "Ваш ящик готов. Пишите на @pnkmail.ru — письма между аккаунтами доставляются сразу.",
    },
  });
}

export function formatMessageTime(date: Date): string {
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return "вчера";
  }
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export function htmlToPreview(html: string, max = 160): string {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseAddressList(raw: string): string[] {
  return raw
    .split(/[,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/<([^>]+)>/);
      return (m ? m[1] : s).trim().toLowerCase();
    });
}

export function toListDto(row: {
  id: string;
  folder: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  preview: string;
  unread: boolean;
  hasAttachment: boolean;
  createdAt: Date;
}): MailMessage {
  return {
    id: row.id,
    folder: row.folder,
    from: row.fromName,
    fromEmail: row.fromEmail,
    subject: row.subject,
    preview: row.preview,
    time: formatMessageTime(row.createdAt),
    unread: row.unread,
    hasAttachment: row.hasAttachment || undefined,
    avatarColor: avatarColor(row.fromEmail || row.fromName),
  };
}

export function isPnkMailAddress(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@pnkmail.ru");
}
