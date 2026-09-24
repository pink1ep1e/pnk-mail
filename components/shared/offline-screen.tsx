"use client";

import { cn } from "@/lib/utils";
import { Reload } from "@/lib/icons";
import { OFFLINE_ICON_DATA_URI } from "@/lib/offline-icon-datauri";

export function OfflineScreen({
  className,
  onRetry,
}: {
  className?: string;
  onRetry?: () => void;
}) {
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={OFFLINE_ICON_DATA_URI}
            alt=""
            width={72}
            height={72}
            className="h-full w-full object-contain"
          />
        </div>
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] font-[family-name:var(--font-unbounded),ui-sans-serif,system-ui,sans-serif]">
          Нет интернета
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-white/45 font-[family-name:var(--font-manrope),ui-sans-serif,system-ui,sans-serif]">
          Проверьте подключение или выключите VPN и обновите страницу.
        </p>
        <button
          type="button"
          onClick={() => {
            if (onRetry) onRetry();
            else window.location.reload();
          }}
          className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#0066ff] text-[15px] font-semibold font-[family-name:var(--font-manrope),ui-sans-serif,system-ui,sans-serif] hover:bg-[#0052cc] transition-colors"
        >
          <Reload size={18} />
          Обновить страницу
        </button>
      </div>
    </div>
  );
}
