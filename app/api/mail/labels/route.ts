import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireActiveMailbox } from "@/lib/mail-auth";

const LABEL_COLORS = [
  "#4d9fff",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#a78bfa",
  "#fb923c",
];

export async function GET() {
  const auth = await requireActiveMailbox();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: { message: auth.message } },
      { status: auth.status },
    );
  }

  const labels = await prisma.mailLabel.findMany({
    where: { mailboxId: auth.ctx.mailboxId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    ok: true,
    data: {
      labels: labels.map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
      })),
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireActiveMailbox();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: { message: auth.message } },
      { status: auth.status },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    color?: string;
  };
  const name = (body.name || "").trim().slice(0, 40);
  if (!name) {
    return NextResponse.json(
      { ok: false, error: { message: "Укажите название метки" } },
      { status: 400 },
    );
  }

  const count = await prisma.mailLabel.count({
    where: { mailboxId: auth.ctx.mailboxId },
  });
  const color =
    (body.color || "").trim() ||
    LABEL_COLORS[count % LABEL_COLORS.length];

  try {
    const label = await prisma.mailLabel.create({
      data: {
        mailboxId: auth.ctx.mailboxId,
        name,
        color,
      },
    });
    return NextResponse.json({
      ok: true,
      data: {
        label: { id: label.id, name: label.name, color: label.color },
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Метка с таким именем уже есть" } },
      { status: 409 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireActiveMailbox();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: { message: auth.message } },
      { status: auth.status },
    );
  }

  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) {
    return NextResponse.json(
      { ok: false, error: { message: "id обязателен" } },
      { status: 400 },
    );
  }

  const label = await prisma.mailLabel.findFirst({
    where: { id, mailboxId: auth.ctx.mailboxId },
  });
  if (!label) {
    return NextResponse.json(
      { ok: false, error: { message: "Метка не найдена" } },
      { status: 404 },
    );
  }

  const rows = await prisma.message.findMany({
    where: {
      mailboxId: auth.ctx.mailboxId,
      labelIds: { contains: id },
    },
    select: { id: true, labelIds: true },
  });
  for (const row of rows) {
    let list: string[] = [];
    try {
      list = JSON.parse(row.labelIds || "[]");
      if (!Array.isArray(list)) list = [];
    } catch {
      list = [];
    }
    await prisma.message.update({
      where: { id: row.id },
      data: { labelIds: JSON.stringify(list.filter((x) => x !== id)) },
    });
  }

  await prisma.mailLabel.delete({ where: { id } });

  return NextResponse.json({ ok: true, data: { deleted: id } });
}
