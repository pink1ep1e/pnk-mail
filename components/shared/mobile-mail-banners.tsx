"use client";

import { useInstallPrompt } from "@/components/shared/install-prompt";
import { Bell, Plus } from "@/lib/icons";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

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

function BannerCard({
  icon,
  title,
  subtitle,
  primary,
  onLater,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  primary: ReactNode;
  onLater: () => void;
}) {
  return (
    <div className="rounded-[14px] bg-[#24262e] px-3 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2a2d36] text-white/70">
          {icon}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[14px] font-semibold text-white font-[family-name:var(--font-manrope)] leading-snug">
            {title}
          </p>
          <p className="mt-1 text-[12px] leading-snug text-white/40 font-[family-name:var(--font-manrope)]">
            {subtitle}
          </p>
          <div className="mt-3 flex items-center gap-3">
            {primary}
            <button
              type="button"
              onClick={onLater}
              className="h-8 px-1 text-[13px] text-white/40 font-[family-name:var(--font-manrope)] hover:text-white/70 cursor-pointer"
            >
              Позже
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile-only banners above the message list — same surface as mail rows.
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

  const primaryBtn =
    "inline-flex h-8 items-center rounded-[10px] bg-[#0066ff] px-3.5 text-[13px] font-semibold text-white font-[family-name:var(--font-manrope)] cursor-pointer hover:bg-[#0052cc] disabled:opacity-60";

  return (
    <div className="md:hidden shrink-0 px-2.5 pt-2 space-y-2.5">
      {pushOpen && (
        <BannerCard
          icon={<Bell size={18} />}
          title="Включить уведомления"
          subtitle={
            pushHint || "Новые письма придут, даже когда приложение закрыто."
          }
          primary={
            <button
              type="button"
              disabled={pushBusy || Notification.permission === "denied"}
              onClick={() => void enablePush()}
              className={primaryBtn}
            >
              {pushBusy ? "…" : "Включить"}
            </button>
          }
          onLater={dismissPush}
        />
      )}

      {installOpen && (
        <BannerCard
          icon={<Plus size={18} />}
          title="Установить приложение"
          subtitle="Добавьте на экран «Домой» для быстрого доступа."
          primary={
            canPrompt ? (
              <button
                type="button"
                onClick={() => void install()}
                className={primaryBtn}
              >
                Установить
              </button>
            ) : (
              <Link href="/install" className={primaryBtn}>
                Как установить
              </Link>
            )
          }
          onLater={dismissInstall}
        />
      )}
    </div>
  );
}
