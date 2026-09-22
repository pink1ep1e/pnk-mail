"use client";

import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptic";
import { Reload } from "@/lib/icons";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

const THRESHOLD = 72;
const MAX_PULL = 120;

/**
 * Mobile pull-to-refresh for a scrollable list.
 * Shows a spinner above content while dragging / refreshing.
 */
export function PullToRefresh({
  onRefresh,
  disabled,
  className,
  children,
}: {
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || disabled) return;

    const setPullBoth = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      if (el.scrollTop > 1) {
        pulling.current = false;
        return;
      }
      startY.current = e.touches[0]?.clientY ?? 0;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshingRef.current) return;
      if (el.scrollTop > 1) {
        pulling.current = false;
        setPullBoth(0);
        return;
      }
      const y = e.touches[0]?.clientY ?? 0;
      const dy = y - startY.current;
      if (dy <= 0) {
        setPullBoth(0);
        return;
      }
      const next = Math.min(MAX_PULL, dy * 0.55);
      setPullBoth(next);
      if (next > 8) e.preventDefault();
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      const amount = pullRef.current;
      if (refreshingRef.current || disabled) {
        setPullBoth(0);
        return;
      }
      if (amount < THRESHOLD) {
        setPullBoth(0);
        return;
      }
      haptic("light");
      setRefreshing(true);
      setPullBoth(THRESHOLD);
      void Promise.resolve(onRefreshRef.current())
        .catch(() => undefined)
        .finally(() => {
          setRefreshing(false);
          setPullBoth(0);
        });
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [disabled]);

  const showLoader = pull > 4 || refreshing;
  const armed = pull >= THRESHOLD || refreshing;
  const pad = showLoader ? Math.max(pull, refreshing ? THRESHOLD : 0) : 0;

  return (
    <div className={cn("relative flex-1 min-h-0 flex flex-col", className)}>
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex justify-center overflow-hidden"
        style={{ height: pad }}
        aria-hidden={!showLoader}
      >
        <div
          className={cn(
            "mt-2 h-9 w-9 rounded-full bg-[#2a2d36] border border-white/15 flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
            armed ? "text-white" : "text-white/55",
          )}
        >
          <span
            className={cn("inline-flex", refreshing && "animate-spin")}
            style={
              refreshing
                ? undefined
                : {
                    transform: `rotate(${Math.min(180, (pull / THRESHOLD) * 180)}deg)`,
                  }
            }
          >
            <Reload size={16} />
          </span>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex-1 min-h-0 overflow-y-auto mail-scroll overscroll-y-contain"
        style={{
          paddingTop: pad,
          transition: pulling.current ? undefined : "padding-top 0.18s ease",
        }}
      >
        <div className="p-2 md:p-2.5">{children}</div>
      </div>
    </div>
  );
}
