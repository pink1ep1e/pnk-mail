import { NextResponse } from "next/server";
import { PNK_ID_URL, getServerPnkIdUrl } from "@/lib/id-auth";

/**
 * Diagnose mail → id connectivity (loopback vs public).
 * GET /api/auth/id-ping
 */
export async function GET() {
  const internal = getServerPnkIdUrl();
  const pub = PNK_ID_URL;
  const tryFetch = async (base: string) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const started = Date.now();
    try {
      const res = await fetch(base, {
        method: "HEAD",
        signal: ctrl.signal,
        cache: "no-store",
      });
      return {
        base,
        ok: res.ok || res.status < 500,
        status: res.status,
        ms: Date.now() - started,
      };
    } catch (e) {
      return {
        base,
        ok: false,
        status: 0,
        ms: Date.now() - started,
        error: e instanceof Error ? e.message : String(e),
      };
    } finally {
      clearTimeout(t);
    }
  };

  const [loopback, publicHit] = await Promise.all([
    tryFetch(internal),
    tryFetch(pub),
  ]);

  return NextResponse.json({
    ok: loopback.ok,
    data: {
      internal,
      public: pub,
      loopback,
      publicHit,
      hint: loopback.ok
        ? "loopback OK — callback should work"
        : "loopback FAIL — start pnk-id on :3100 or set PNK_ID_INTERNAL_URL",
    },
  });
}
