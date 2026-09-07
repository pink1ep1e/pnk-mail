import { NextResponse } from "next/server";
import { clearAuthCookies, readVault } from "@/lib/mail-session";

export async function POST() {
  const vault = await readVault();
  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res, vault);
  return res;
}
