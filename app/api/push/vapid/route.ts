import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/web-push";

export const runtime = "nodejs";

/** Public VAPID key for PushManager.subscribe */
export async function GET() {
  const key = getVapidPublicKey();
  if (!key) {
    return NextResponse.json(
      { ok: false, error: { message: "VAPID не настроен" } },
      { status: 503 },
    );
  }
  if (key.length < 80 || !key.startsWith("B")) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message:
            "VAPID_PUBLIC_KEY обрезан — вставьте полный ключ (начинается с B, ~87 символов)",
        },
      },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, data: { publicKey: key } });
}
