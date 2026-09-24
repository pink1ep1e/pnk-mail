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

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

/** Ensure SW is registered and controlling, then subscribe with current VAPID key. */
async function subscribePush(): Promise<{ ok: boolean; error?: string }> {
  const vapidRes = await fetch("/api/push/vapid", { cache: "no-store" });
  const vapidJson = await vapidRes.json();
  if (!vapidJson.ok || !vapidJson.data?.publicKey) {
    return { ok: false, error: "VAPID не настроен на сервере" };
  }

  // Make sure SW is registered (layout/offline-provider also do this)
  const reg =
    (await navigator.serviceWorker.getRegistration()) ||
    (await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }));
  await navigator.serviceWorker.ready;

  // Drop stale subscription (wrong/old VAPID) and create a fresh one
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    try {
      await existing.unsubscribe();
    } catch {
      /* ignore */
    }
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      String(vapidJson.data.publicKey).trim(),
    ) as BufferSource,
  });

  const raw = sub.toJSON();
  if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys?.auth) {
    return { ok: false, error: "Браузер не вернул ключи подписки" };
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: raw.endpoint,
      keys: raw.keys,
    }),
  });
  const json = await res.json();
  if (!json.ok) {
    return {
      ok: false,
      error: json.error?.message || "Не удалось сохранить подписку",
    };
  }
  return { ok: true };
}

/**
 * Requests notification permission and registers Web Push for the active mailbox.
 */
export function PushSubscribe({
  enabled,
  className,
}: {
  enabled: boolean;
  className?: string;
}) {
  const [banner, setBanner] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!enabled || !pushSupported()) return;

    let cancelled = false;

    const run = async () => {
      // iOS: Web Push only in installed PWA
      const ios =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      if (ios && !isStandalonePwa()) {
        if (!cancelled) {
          setHint("На iPhone уведомления работают только из приложения на экране «Домой».");
          setBanner(true);
        }
        return;
      }

      if (Notification.permission === "granted") {
        try {
          const r = await subscribePush();
          if (!cancelled) {
            setSubscribed(r.ok);
            if (!r.ok) {
              setHint(r.error || "Не удалось подписаться");
              setBanner(true);
            }
          }
        } catch (e) {
          if (!cancelled) {
            setHint(e instanceof Error ? e.message : "Ошибка подписки");
            setBanner(true);
          }
        }
        return;
      }

      if (Notification.permission === "denied") {
        if (!cancelled) {
          setHint("Уведомления запрещены в настройках браузера / системы.");
          setBanner(true);
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

  if (!banner && subscribed) return null;
  if (!banner) return null;

  const enable = async () => {
    setBusy(true);
    setHint(null);
    try {
      const perm =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      if (perm !== "granted") {
        setHint("Нужно разрешить уведомления");
        return;
      }
      const r = await subscribePush();
      if (r.ok) {
        setSubscribed(true);
        setBanner(false);
        // Optional self-test so user sees it works
        try {
          await fetch("/api/push/test", { method: "POST" });
        } catch {
          /* ignore */
        }
      } else {
        setHint(r.error || "Не удалось включить");
      }
    } catch (e) {
      setHint(e instanceof Error ? e.message : "Ошибка");
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
            {hint ||
              "Разрешите уведомления — новые письма придут даже когда приложение закрыто."}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy || Notification.permission === "denied"}
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
