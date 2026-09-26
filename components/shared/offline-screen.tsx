"use client";

import { cn } from "@/lib/utils";
import { Reload } from "@/lib/icons";
import { useEffect, useState } from "react";

function WifiOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect width="72" height="72" rx="18" fill="#17191f" />
      <path
        d="M18 28c10.5-9 25.5-9 36 0"
        stroke="#3b82f6"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity=".35"
      />
      <path
        d="M23.5 34.5c7.3-6.2 17.7-6.2 25 0"
        stroke="#3b82f6"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity=".55"
      />
      <path
        d="M29 41c4.1-3.4 9.9-3.4 14 0"
        stroke="#3b82f6"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="36" cy="48.5" r="3.2" fill="#3b82f6" />
      <path
        d="M22 22l28 28"
        stroke="#ef4444"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

async function hardReloadMail() {
  const url = `/mail?_r=${Date.now()}`;
  try {
    await fetch(`/favicon-32.png?_=${Date.now()}`, {
      cache: "no-store",
      mode: "no-cors",
    });
  } catch {
    /* ignore */
  }
  window.location.replace(url);
}

export function OfflineScreen({
  className,
  onRetry,
}: {
  className?: string;
  onRetry?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("Обновить страницу");

  useEffect(() => {
    const onOnline = () => {
      void hardReloadMail();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  const retry = async () => {
    if (busy) return;
    setBusy(true);
    setLabel("Проверяем…");
    if (!navigator.onLine) {
      setLabel("Сети всё ещё нет");
      window.setTimeout(() => {
        setLabel("Обновить страницу");
        setBusy(false);
      }, 1200);
      return;
    }
    if (onRetry) {
      onRetry();
      return;
    }
    await hardReloadMail();
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 bg-[#0c0d10] text-white",
        className,
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="w-full max-w-[360px] text-center">
        <div className="mx-auto mb-6 h-[72px] w-[72px] overflow-hidden rounded-[18px]">
          <WifiOffIcon className="h-full w-full" />
        </div>
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] font-[family-name:var(--font-unbounded),ui-sans-serif,system-ui,sans-serif]">
          Нет интернета
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-white/45 font-[family-name:var(--font-manrope),ui-sans-serif,system-ui,sans-serif]">
          Проверьте подключение или выключите VPN и обновите страницу. Также
          возможно, в вашем регионе действуют ограничения мобильной связи.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void retry()}
          className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#0066ff] text-[15px] font-semibold font-[family-name:var(--font-manrope),ui-sans-serif,system-ui,sans-serif] hover:bg-[#0052cc] transition-colors disabled:opacity-65"
        >
          <Reload size={18} />
          {label}
        </button>
      </div>
    </div>
  );
}
