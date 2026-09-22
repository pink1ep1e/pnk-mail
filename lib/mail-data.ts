export type FolderId =
  | "all"
  | "inbox"
  | "newsletters"
  | "social"
  | "attachments"
  | "sent"
  | "trash"
  | "spam"
  | "drafts"
  | "archive";

export type MailMessage = {
  id: string;
  folder: string;
  from: string;
  fromEmail: string;
  subject: string;
  preview: string;
  time: string;
  unread: boolean;
  hasAttachment?: boolean;
  avatarColor: string;
  /** Sender brand/logo/favicon when available */
  avatarUrl?: string | null;
  deliveryStatus?: string | null;
  deliveryDetail?: string | null;
  threadId?: string | null;
  threadCount?: number;
};

export const folders: {
  id: FolderId;
  label: string;
  section?: "main" | "system";
}[] = [
  { id: "all", label: "Вся почта", section: "main" },
  { id: "inbox", label: "Входящие", section: "main" },
  { id: "newsletters", label: "Рассылки", section: "main" },
  { id: "social", label: "Социальные сети", section: "main" },
  { id: "attachments", label: "С вложениями", section: "main" },
  { id: "sent", label: "Отправленные", section: "system" },
  { id: "archive", label: "Архив", section: "system" },
  { id: "trash", label: "Удалённые", section: "system" },
  { id: "spam", label: "Спам", section: "system" },
  { id: "drafts", label: "Черновики", section: "system" },
];

export function folderCounts(list: MailMessage[]) {
  const counts: Record<string, { unread: number; total: number }> = {};
  for (const m of list) {
    const key = m.folder || "inbox";
    const cur = counts[key] ?? { unread: 0, total: 0 };
    cur.total += 1;
    if (m.unread) cur.unread += 1;
    counts[key] = cur;
  }
  return counts as Partial<Record<FolderId, { unread: number; total: number }>>;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}
