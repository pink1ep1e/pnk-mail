import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireActiveMailbox } from "@/lib/mail-auth";
import type { FolderId } from "@/lib/mail-data";
import { maybeSyncResendInbound, repairFalseSubjectThreads } from "@/lib/mail-inbound";
import { groupMessagesIntoThreads, toListDto, attachPnkMailAvatars } from "@/lib/mail-store";
import { assertSameOrigin } from "@/lib/request-guard";

const LIST_SELECT = {
  id: true,
  folder: true,
  fromName: true,
  fromEmail: true,
  subject: true,
  preview: true,
  unread: true,
  hasAttachment: true,
  createdAt: true,
  deliveryStatus: true,
  deliveryDetail: true,
  threadId: true,
  senderLogoUrl: true,
} as const;

export async function GET(req: NextRequest) {
  const auth = await requireActiveMailbox();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: { message: auth.message } },
      { status: auth.status },
    );
  }

  const folder = (req.nextUrl.searchParams.get("folder") || "inbox") as FolderId;
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const labelId = (req.nextUrl.searchParams.get("label") || "").trim();

  // Never block the list on Resend pull — sync in background; client soft-refreshes
  let syncStarted = false;
  if (folder === "inbox" || folder === "all") {
    syncStarted = true;
    void maybeSyncResendInbound({ limit: 12, minIntervalMs: 20_000 }).catch(
      () => {},
    );
  }

  // One-shot repair of old subject-only thread merges (cheap, capped)
  void repairFalseSubjectThreads(auth.ctx.mailboxId).catch(() => {});

  const whereBase = { mailboxId: auth.ctx.mailboxId };

  let folderWhere: Record<string, unknown> = {};
  if (folder === "all") {
    folderWhere = { NOT: { folder: { in: ["trash", "spam", "drafts"] } } };
  } else if (folder === "attachments") {
    folderWhere = {
      hasAttachment: true,
      NOT: { folder: { in: ["trash", "spam", "drafts"] } },
    };
  } else {
    folderWhere = { folder };
  }

  const searchWhere = q
    ? {
        OR: [
          { subject: { contains: q, mode: "insensitive" as const } },
          { preview: { contains: q, mode: "insensitive" as const } },
          { fromName: { contains: q, mode: "insensitive" as const } },
          { fromEmail: { contains: q, mode: "insensitive" as const } },
          { toAddresses: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  // Match whole JSON string entries to avoid substring ID collisions
  const labelWhere = labelId
    ? {
        OR: [
          { labelIds: { contains: `"${labelId}"` } },
          { labelIds: { equals: `["${labelId}"]` } },
        ],
      }
    : {};

  const listWhere = {
    ...whereBase,
    ...folderWhere,
    ...searchWhere,
    ...labelWhere,
  };

  const attachWhere = {
    mailboxId: auth.ctx.mailboxId,
    hasAttachment: true,
    NOT: { folder: { in: ["trash", "spam", "drafts"] } },
  };

  const p = prisma as unknown as {
    mailFolder?: {
      findMany: (a: object) => Promise<{ id: string; name: string }[]>;
    };
    mailLabel?: {
      findMany: (a: object) => Promise<
        { id: string; name: string; color: string }[]
      >;
    };
  };

  const [rows, allForCounts, withAttach, withAttachUnread, customFolders, labels] =
    await Promise.all([
      prisma.message.findMany({
        where: listWhere,
        orderBy: { createdAt: "desc" },
        take: 200,
        select: LIST_SELECT,
      }),
      prisma.message.groupBy({
        by: ["folder", "unread"],
        where: whereBase,
        _count: { _all: true },
      }),
      prisma.message.count({ where: attachWhere }),
      prisma.message.count({
        where: { ...attachWhere, unread: true },
      }),
      p.mailFolder
        ? p.mailFolder
            .findMany({
              where: { mailboxId: auth.ctx.mailboxId },
              orderBy: { createdAt: "asc" },
            })
            .catch(() => [] as { id: string; name: string }[])
        : Promise.resolve([] as { id: string; name: string }[]),
      p.mailLabel
        ? p.mailLabel
            .findMany({
              where: { mailboxId: auth.ctx.mailboxId },
              orderBy: { createdAt: "asc" },
            })
            .catch(() => [] as { id: string; name: string; color: string }[])
        : Promise.resolve(
            [] as { id: string; name: string; color: string }[],
          ),
    ]);

  const counts: Record<string, { unread: number; total: number }> = {};
  for (const row of allForCounts) {
    const cur = counts[row.folder] ?? { unread: 0, total: 0 };
    cur.total += row._count._all;
    if (row.unread) cur.unread += row._count._all;
    counts[row.folder] = cur;
  }
  counts.attachments = { total: withAttach, unread: withAttachUnread };

  const threaded =
    folder === "drafts" ? rows : groupMessagesIntoThreads(rows);

  const messages = await attachPnkMailAvatars(threaded.map(toListDto));

  return NextResponse.json({
    ok: true,
    data: {
      messages,
      counts,
      folders: customFolders.map((f) => ({ id: f.id, name: f.name })),
      labels: labels.map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
      })),
      mailbox: {
        id: auth.ctx.mailboxId,
        address: auth.ctx.email,
      },
      /** Hint for client: background Resend sync may add mail shortly */
      syncPending: syncStarted,
    },
  });
}

type PatchAction =
  | "read"
  | "unread"
  | "trash"
  | "restore"
  | "spam"
  | "archive"
  | "move"
  | "label"
  | "unlabel"
  | "remind"
  | "delete";

export async function PATCH(req: NextRequest) {
  const origin = assertSameOrigin(req);
  if (!origin.ok) {
    return NextResponse.json(
      { ok: false, error: { message: origin.message } },
      { status: 403 },
    );
  }

  const auth = await requireActiveMailbox();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: { message: auth.message } },
      { status: auth.status },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    ids?: string[];
    action?: PatchAction;
    folder?: string;
    labelId?: string;
    remindAt?: string | null;
    /** Apply action to whole conversations (default true for move/trash/read) */
    expandThread?: boolean;
  };

  const seedIds = Array.isArray(body.ids)
    ? body.ids.filter((id) => typeof id === "string" && id.length > 0)
    : [];
  const action = body.action;

  if (!seedIds.length || !action) {
    return NextResponse.json(
      { ok: false, error: { message: "ids и action обязательны" } },
      { status: 400 },
    );
  }

  const expandDefault =
    action === "trash" ||
    action === "delete" ||
    action === "spam" ||
    action === "archive" ||
    action === "restore" ||
    action === "move" ||
    action === "read" ||
    action === "unread";
  const expandThread = body.expandThread ?? expandDefault;

  let ids = seedIds;
  if (expandThread) {
    const seeds = await prisma.message.findMany({
      where: { id: { in: seedIds }, mailboxId: auth.ctx.mailboxId },
      select: { id: true, threadId: true },
    });
    const threadKeys = [
      ...new Set(seeds.map((s) => s.threadId || s.id).filter(Boolean)),
    ];
    if (threadKeys.length) {
      const related = await prisma.message.findMany({
        where: {
          mailboxId: auth.ctx.mailboxId,
          OR: [
            { threadId: { in: threadKeys } },
            { id: { in: threadKeys } },
          ],
        },
        select: { id: true },
      });
      ids = [...new Set([...seedIds, ...related.map((r) => r.id)])];
    }
  }

  const where = {
    id: { in: ids },
    mailboxId: auth.ctx.mailboxId,
  };

  if (action === "delete") {
    const result = await prisma.message.deleteMany({ where });
    return NextResponse.json({ ok: true, data: { updated: result.count } });
  }

  if (action === "move") {
    const folder = (body.folder || "").trim();
    if (!folder) {
      return NextResponse.json(
        { ok: false, error: { message: "folder обязателен" } },
        { status: 400 },
      );
    }
    const result = await prisma.message.updateMany({
      where,
      data: { folder },
    });
    return NextResponse.json({ ok: true, data: { updated: result.count } });
  }

  if (action === "label" || action === "unlabel") {
    const labelId = (body.labelId || "").trim();
    if (!labelId) {
      return NextResponse.json(
        { ok: false, error: { message: "labelId обязателен" } },
        { status: 400 },
      );
    }
    const rows = await prisma.message.findMany({
      where,
      select: { id: true, labelIds: true },
    });
    let updated = 0;
    for (const row of rows) {
      let list: string[] = [];
      try {
        list = JSON.parse(row.labelIds || "[]");
        if (!Array.isArray(list)) list = [];
      } catch {
        list = [];
      }
      const next =
        action === "label"
          ? [...new Set([...list, labelId])]
          : list.filter((id) => id !== labelId);
      await prisma.message.update({
        where: { id: row.id },
        data: { labelIds: JSON.stringify(next) },
      });
      updated += 1;
    }
    return NextResponse.json({ ok: true, data: { updated } });
  }

  if (action === "remind") {
    const remindAt = body.remindAt
      ? new Date(body.remindAt)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const result = await prisma.message.updateMany({
      where,
      data: { remindAt },
    });
    return NextResponse.json({
      ok: true,
      data: { updated: result.count, remindAt: remindAt.toISOString() },
    });
  }

  const data =
    action === "read"
      ? { unread: false }
      : action === "unread"
        ? { unread: true }
        : action === "trash"
          ? { folder: "trash", unread: false }
          : action === "restore"
            ? { folder: "inbox" }
            : action === "spam"
              ? { folder: "spam", unread: false }
              : action === "archive"
                ? { folder: "archive", unread: false }
                : null;

  if (!data) {
    return NextResponse.json(
      { ok: false, error: { message: "Неизвестное действие" } },
      { status: 400 },
    );
  }

  const result = await prisma.message.updateMany({ where, data });

  return NextResponse.json({
    ok: true,
    data: { updated: result.count },
  });
}
