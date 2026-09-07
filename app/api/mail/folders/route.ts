import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireActiveMailbox } from "@/lib/mail-auth";

export async function GET() {
  const auth = await requireActiveMailbox();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: { message: auth.message } },
      { status: auth.status },
    );
  }

  const folders = await prisma.mailFolder.findMany({
    where: { mailboxId: auth.ctx.mailboxId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    ok: true,
    data: {
      folders: folders.map((f) => ({ id: f.id, name: f.name })),
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

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = (body.name || "").trim().slice(0, 60);
  if (!name) {
    return NextResponse.json(
      { ok: false, error: { message: "Укажите название папки" } },
      { status: 400 },
    );
  }

  try {
    const folder = await prisma.mailFolder.create({
      data: {
        mailboxId: auth.ctx.mailboxId,
        name,
      },
    });
    return NextResponse.json({
      ok: true,
      data: { folder: { id: folder.id, name: folder.name } },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Папка с таким именем уже есть" } },
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

  const folder = await prisma.mailFolder.findFirst({
    where: { id, mailboxId: auth.ctx.mailboxId },
  });
  if (!folder) {
    return NextResponse.json(
      { ok: false, error: { message: "Папка не найдена" } },
      { status: 404 },
    );
  }

  await prisma.message.updateMany({
    where: { mailboxId: auth.ctx.mailboxId, folder: id },
    data: { folder: "inbox" },
  });
  await prisma.mailFolder.delete({ where: { id } });

  return NextResponse.json({ ok: true, data: { deleted: id } });
}
