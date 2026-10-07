import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { getMailFromDomain } from "@/lib/mail-transport";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const primary = getMailFromDomain();
  const boxes = await prisma.mailbox.findMany({
    select: { address: true },
  });

  const set = new Set<string>([primary]);
  for (const b of boxes) {
    const at = b.address.lastIndexOf("@");
    if (at > 0) set.add(b.address.slice(at + 1).toLowerCase());
  }

  const domains = [...set].sort().map((domain) => {
    const isPrimary = domain === primary;
    return {
      domain,
      verified: isPrimary,
      mx: isPrimary,
      spf: isPrimary,
      dkim: isPrimary,
    };
  });

  return NextResponse.json({ ok: true, data: { domains } });
}
