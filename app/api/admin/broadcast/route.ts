import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { getMailFromDomain, sendOutbound } from "@/lib/mail-transport";

const BATCH_LIMIT = 200;

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  let body: { subject?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON", code: "validation" } },
      { status: 400 },
    );
  }

  const subject = (body.subject || "").trim();
  const html = (body.html || "").trim();
  if (!subject || !html) {
    return NextResponse.json(
      {
        ok: false,
        error: { message: "subject and html required", code: "validation" },
      },
      { status: 400 },
    );
  }

  const boxes = await prisma.mailbox.findMany({
    select: { address: true },
    take: BATCH_LIMIT,
  });

  const domain = getMailFromDomain();
  const fromEmail = `noreply@${domain}`;
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  let queued = 0;
  let failed = 0;

  for (const box of boxes) {
    const result = await sendOutbound({
      fromName: "pnk mail",
      fromEmail,
      to: [box.address],
      subject,
      bodyHtml: html,
      bodyText: text,
      tags: { kind: "admin-broadcast" },
    });
    if (result.ok) queued += 1;
    else failed += 1;
  }

  return NextResponse.json({
    ok: true,
    data: { ok: true, queued, failed, total: boxes.length },
  });
}
