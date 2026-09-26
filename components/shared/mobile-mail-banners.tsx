"use client";

import { useInstallPrompt } from "@/components/shared/install-prompt";
import { Bell, Plus } from "@/lib/icons";
import Link from "next/link";
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

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

async function subscribePush(): Promise<{ ok: boolean; error?: string }> {
  const vapidRes = await fetch("/api/push/vapid", { cache: "no-store" });
  const vapidJson = await vapidRes.json();
  if (!vapidJson.ok || !vapidJson.data?.publicKey) {
    return { ok: false, error: "VAPID не настроен на сервере" };
  }

  const reg =
    (await navigator.serviceWorker.getRegistration()) ||
    (await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }));
  await navigator.serviceWorker.ready;

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
 * Compact mobile-only banners above the message list:
 * notifications + install to home screen.
 */
export function MobileMailBanners({ enabled }: { enabled: boolean }) {
  const [mobile, setMobile] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushHint, setPushHint] = useState<string | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const { canPrompt, standalone, promptInstall } = useInstallPrompt();

  useEffect(() => {
    const sync = () => setMobile(isMobileViewport());
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    if (!enabled || !mobile || standalone) {
      setInstallOpen(false);
      return;
    }
    try {
      if (localStorage.getItem("pnk-mail-install-banner-dismissed") === "1") {
        setInstallOpen(false);
        return;
      }
    } catch {
      /* ignore */
    }
    setInstallOpen(true);
  }, [enabled, mobile, standalone]);

  useEffect(() => {
    if (!enabled || !mobile || !pushSupported()) return;
    let cancelled = false;

    const run = async () => {
      try {
        if (sessionStorage.getItem("pnk-mail-push-dismissed") === "1") return;
      } catch {
        /* ignore */
      }

      if (isIos() && !isStandalonePwa()) {
        if (!cancelled) {
          setPushHint(
            "На iPhone — только из приложения на экране «Домой».",
          );
          setPushOpen(true);
        }
        return;
      }

      if (Notification.permission === "granted") {
        try {
          const r = await subscribePush();
          if (!cancelled && !r.ok) {
            setPushHint(r.error || "Не удалось подписаться");
            setPushOpen(true);
          }
        } catch (e) {
          if (!cancelled) {
            setPushHint(e instanceof Error ? e.message : "Ошибка подписки");
            setPushOpen(true);
          }
        }
        return;
      }

      if (Notification.permission === "denied") {
        if (!cancelled) {
          setPushHint("Уведомления запрещены в настройках.");
          setPushOpen(true);
        }
        return;
      }

      if (!cancelled) setPushOpen(true);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [enabled, mobile]);

  if (!mobile || !enabled) return null;
  if (!pushOpen && !installOpen) return null;

  const enablePush = async () => {
    setPushBusy(true);
    setPushHint(null);
    try {
      if (isIos() && !isStandalonePwa()) {
        window.location.href = "/install";
        return;
      }
      const perm =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      if (perm !== "granted") {
        setPushHint("Нужно разрешить уведомления");
        return;
      }
      const r = await subscribePush();
      if (r.ok) {
        setPushOpen(false);
        try {
          await fetch("/api/push/test", { method: "POST" });
        } catch {
          /* ignore */
        }
      } else {
        setPushHint(r.error || "Не удалось включить");
      }
    } catch (e) {
      setPushHint(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPushBusy(false);
    }
  };

  const dismissPush = () => {
    setPushOpen(false);
    try {
      sessionStorage.setItem("pnk-mail-push-dismissed", "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (canPrompt) {
      const ok = await promptInstall();
      if (ok) {
        setInstallOpen(false);
        return;
      }
    }
    window.location.href = "/install";
  };

  const dismissInstall = () => {
    setInstallOpen(false);
    try {
      localStorage.setItem("pnk-mail-install-banner-dismissed", "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="md:hidden shrink-0 px-2.5 pt-2 space-y-2">
      {pushOpen && (
        <div className="rounded-[14px] border border-white/10 bg-[#1a1c22] px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#0066ff]/20 text-[#4d9fff]">
              <Bell size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold font-[family-name:var(--font-manrope)] leading-tight">
                Уведомления
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-white/45 font-[family-name:var(--font-manrope)] line-clamp-2">
                {pushHint || "Новые письма даже когда приложение закрыто."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                disabled={pushBusy || Notification.permission === "denied"}
                onClick={() => void enablePush()}
                className="h-8 px-3 rounded-[9px] bg-[#0066ff] text-[12px] font-semibold font-[family-name:var(--font-manrope)] disabled:opacity-60"
              >
                {pushBusy ? "…" : "Включить"}
              </button>
              <button
                type="button"
                onClick={dismissPush}
                className="h-8 px-2.5 rounded-[9px] text-[12px] text-white/45 font-[family-name:var(--font-manrope)] hover:bg-white/5 hover:text-white/70"
              >
                Позже
              </button>
            </div>
          </div>
        </div>
      )}

      {installOpen && (
        <div className="rounded-[14px] border border-white/10 bg-[#1a1c22] px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/8 text-white/70">
              <Plus size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold font-[family-name:var(--font-manrope)] leading-tight">
                Установить приложение
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-white/45 font-[family-name:var(--font-manrope)]">
                На экран «Домой» для быстрого доступа.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {canPrompt ? (
                <button
                  type="button"
                  onClick={() => void install()}
                  className="h-8 px-3 rounded-[9px] bg-[#0066ff] text-[12px] font-semibold font-[family-name:var(--font-manrope)]"
                >
                  Установить
                </button>
              ) : (
                <Link
                  href="/install"
                  className="h-8 px-3 rounded-[9px] bg-[#0066ff] text-[12px] font-semibold font-[family-name:var(--font-manrope)] inline-flex items-center"
                >
                  Как установить
                </Link>
              )}
              <button
                type="button"
                onClick={dismissInstall}
                className="h-8 px-2.5 rounded-[9px] text-[12px] text-white/45 font-[family-name:var(--font-manrope)] hover:bg-white/5 hover:text-white/70"
              >
                Позже
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
