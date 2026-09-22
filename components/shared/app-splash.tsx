"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Full-screen boot splash — same look as mail app loader.
 * Uses the complete app mark (no text-only fallback, no CSS crop).
 */
export function AppSplash({
  className,
  progress,
  hint,
}: {
  className?: string;
  /** 0–100; if omitted, shows an indeterminate bar */
  progress?: number;
  hint?: string;
}) {
  const [indeterminate, setIndeterminate] = useState(0);

  useEffect(() => {
    if (progress != null) return;
    const id = window.setInterval(() => {
      setIndeterminate((v) => (v >= 92 ? 18 : v + 7 + Math.random() * 9));
    }, 280);
    return () => window.clearInterval(id);
  }, [progress]);

  const pct = progress != null ? Math.max(0, Math.min(100, progress)) : indeterminate;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] bg-[#0c0d10] flex flex-col items-center justify-center px-6 select-none",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Image
          src="/logo-big-mail.svg"
          alt="pnk почта"
          width={200}
          height={200}
          priority
          unoptimized
          className="w-[148px] md:w-[180px] h-auto"
        />
      </motion.div>

      <motion.div
        className="mt-10 w-full max-w-[200px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.18, duration: 0.35 }}
      >
        <svg viewBox="0 0 200 8" className="block w-full h-[8px]" aria-hidden>
          <rect width="200" height="8" rx="4" ry="4" fill="#2a2d36" />
          <rect
            width={Math.max(8, (pct / 100) * 200)}
            height="8"
            rx="4"
            ry="4"
            fill="#0066ff"
          />
        </svg>
      </motion.div>

      {hint ? (
        <motion.p
          key={hint}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center text-[14px] md:text-[15px] text-white/45 font-[family-name:var(--font-manrope)]"
        >
          {hint}
        </motion.p>
      ) : null}
    </div>
  );
}
