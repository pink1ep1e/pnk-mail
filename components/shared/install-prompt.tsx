"use client";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { haptic } from "@/lib/haptic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

/**
 * Native install prompt (Android/Chrome) + soft CTA to /install.
 * Hidden when already running as installed PWA.
 */
export function InstallPrompt({
  soft = true,
}: {
  /** Show a non-blocking install sheet when deferred prompt is available */
  soft?: boolean;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(isStandalone());
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (soft) {
        const key = "pnk-mail-install-dismissed";
        try {
          if (sessionStorage.getItem(key) === "1") return;
        } catch {
          /* ignore */
        }
        setOpen(true);
      }
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [soft]);

  if (standalone) return null;

  const install = async () => {
    haptic("medium");
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      setOpen(false);
      if (choice.outcome === "accepted") haptic("success");
      return;
    }
    window.location.href = "/install";
  };

  const dismiss = () => {
    haptic("light");
    setOpen(false);
    try {
      sessionStorage.setItem("pnk-mail-install-dismissed", "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <BottomSheet open={open} onClose={dismiss} labelledBy="install-prompt-title">
      <div className="flex items-start gap-4">
        <Image
          src="/icon-192.png"
          alt=""
          width={56}
          height={56}
          className="h-14 w-14 shrink-0 rounded-[14px]"
          unoptimized
        />
        <div className="min-w-0">
          <h3
            id="install-prompt-title"
            className="text-[17px] font-semibold text-white font-[family-name:var(--font-manrope)]"
          >
            Установить pnk почту
          </h3>
          <p className="mt-1 text-[13px] text-white/45 font-[family-name:var(--font-manrope)] leading-relaxed">
            Откроется как приложение без адресной строки — с экрана «Домой».
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void install()}
          className="h-12 rounded-full bg-[#0066ff] text-white text-[15px] font-semibold font-[family-name:var(--font-manrope)] hover:bg-[#0052cc] transition-colors"
        >
          Установить
        </button>
        <Link
          href="/install"
          onClick={() => haptic("light")}
          className="h-11 rounded-full inline-flex items-center justify-center text-[14px] text-white/55 hover:text-white font-[family-name:var(--font-manrope)] transition-colors"
        >
          Как установить на iPhone
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="h-10 text-[13px] text-white/35 hover:text-white/60 font-[family-name:var(--font-manrope)]"
        >
          Не сейчас
        </button>
      </div>
    </BottomSheet>
  );
}

/** Hook for pages that want a primary Install button (e.g. /install). */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(isStandalone());
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", () => {
      setDeferred(null);
      setStandalone(true);
    });
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const promptInstall = async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice.outcome === "accepted";
  };

  return { canPrompt: Boolean(deferred), standalone, promptInstall };
}
