import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const quotaMb = Number(process.env.MAIL_DEFAULT_QUOTA_MB || 2048) || 2048;

  const boxes = await prisma.mailbox.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { messages: true } },
    },
  });

  const sizes = await prisma.$queryRaw<
    Array<{ mailboxId: string; bytes: bigint | number | null }>
  >`
    SELECT "mailboxId",
           COALESCE(SUM(LENGTH("bodyHtml") + LENGTH("bodyText") + LENGTH("preview")), 0) AS bytes
    FROM "Message"
    GROUP BY "mailboxId"
  `;
  const sizeMap = new Map(
    sizes.map((r) => [r.mailboxId, Number(r.bytes ?? 0)]),
  );

  return NextResponse.json({
    ok: true,
    data: {
      mailboxes: boxes.map((m) => {
        const bytes = sizeMap.get(m.id) ?? 0;
        return {
          id: m.id,
          address: m.address,
          owner: m.ownerUserId,
          messages: m._count.messages,
          usedMb: Math.round((bytes / (1024 * 1024)) * 10) / 10,
          quotaMb,
        };
      }),
    },
  });
}
