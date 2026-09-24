"use client";

import { cn } from "@/lib/utils";
import { Bell } from "@/lib/icons";
import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function pushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function subscribePush(): Promise<boolean> {
  const vapidRes = await fetch("/api/push/vapid", { cache: "no-store" });
  const vapidJson = await vapidRes.json();
  if (!vapidJson.ok || !vapidJson.data?.publicKey) return false;

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        vapidJson.data.publicKey as string,
      ) as BufferSource,
    });
  }

  const raw = sub.toJSON();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: raw.endpoint,
      keys: raw.keys,
    }),
  });
  const json = await res.json();
  return Boolean(json.ok);
}

/**
 * Requests notification permission and registers Web Push for the active mailbox.
 * Shows a soft banner when permission is still default.
 */
export function PushSubscribe({
  enabled,
  className,
}: {
  /** Only run when user is signed in to mail */
  enabled: boolean;
  className?: string;
}) {
  const [banner, setBanner] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled || !pushSupported()) return;

    let cancelled = false;

    const run = async () => {
      if (Notification.permission === "granted") {
        try {
          await subscribePush();
        } catch {
          /* ignore */
        }
        return;
      }
      if (Notification.permission === "default") {
        try {
          if (sessionStorage.getItem("pnk-mail-push-dismissed") === "1") return;
        } catch {
          /* ignore */
        }
        if (!cancelled) setBanner(true);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!banner) return null;

  const enable = async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        await subscribePush();
        setBanner(false);
      } else {
        setBanner(false);
      }
    } catch {
      setBanner(false);
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    setBanner(false);
    try {
      sessionStorage.setItem("pnk-mail-push-dismissed", "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 right-3 z-[60] mx-auto max-w-[420px] rounded-[16px] border border-white/10 bg-[#1a1c22] p-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)] md:left-auto md:right-5",
        className,
      )}
      role="dialog"
      aria-label="Уведомления о письмах"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#0066ff]/20 text-[#4d9fff]">
          <Bell size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold font-[family-name:var(--font-manrope)]">
            Уведомления о письмах
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-white/45 font-[family-name:var(--font-manrope)]">
            Разрешите уведомления — новые письма придут даже когда приложение
            закрыто.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void enable()}
              className="h-9 flex-1 rounded-[10px] bg-[#0066ff] text-[13px] font-semibold font-[family-name:var(--font-manrope)] hover:bg-[#0052cc] disabled:opacity-60"
            >
              {busy ? "…" : "Включить"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="h-9 px-3 rounded-[10px] text-[13px] text-white/45 font-[family-name:var(--font-manrope)] hover:bg-white/5 hover:text-white/70"
            >
              Позже
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
