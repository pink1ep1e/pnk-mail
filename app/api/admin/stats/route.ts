import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const [mailboxes, messages, rows] = await Promise.all([
    prisma.mailbox.count(),
    prisma.message.count(),
    prisma.$queryRaw<Array<{ bytes: bigint | number | null }>>`
      SELECT COALESCE(SUM(LENGTH("bodyHtml") + LENGTH("bodyText") + LENGTH("preview")), 0) AS bytes
      FROM "Message"
    `,
  ]);

  const bytes = Number(rows[0]?.bytes ?? 0);
  const usedMb = Math.round((bytes / (1024 * 1024)) * 10) / 10;

  return NextResponse.json({
    ok: true,
    data: { mailboxes, messages, usedMb },
  });
}
