"use client";

import { cn } from "@/lib/utils";
import { Reply, Trash2 } from "@/lib/icons";
import { animate, motion, useMotionValue } from "motion/react";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

const ACTION_W = 124;
const OPEN_X = -ACTION_W;
const AXIS_LOCK = 10;

type SwipeMailRowProps = {
  id: string;
  open: boolean;
  onOpenChange: (id: string | null) => void;
  onReply: () => void;
  onDelete: () => void;
  children: ReactNode;
  className?: string;
};

function lockListScroll(): () => void {
  const el = document.querySelector(".mail-scroll") as HTMLElement | null;
  if (!el) return () => undefined;
  const prevOverflow = el.style.overflowY;
  const prevTouch = el.style.touchAction;
  el.style.overflowY = "hidden";
  el.style.touchAction = "none";
  document.documentElement.dataset.mailHSwipe = "1";
  return () => {
    el.style.overflowY = prevOverflow;
    el.style.touchAction = prevTouch;
    delete document.documentElement.dataset.mailHSwipe;
  };
}

/**
 * Mobile swipe-left reveals Reply + Delete.
 * Clips actions to the row, locks vertical scroll while swiping horizontally.
 */
export function SwipeMailRow({
  id,
  open,
  onOpenChange,
  onReply,
  onDelete,
  children,
  className,
}: SwipeMailRowProps) {
  const x = useMotionValue(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const baseX = useRef(0);
  const axis = useRef<"h" | "v" | null>(null);
  const tracking = useRef(false);
  const unlockScroll = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!mobile) {
      x.set(0);
      return;
    }
    void animate(x, open ? OPEN_X : 0, {
      type: "spring",
      stiffness: 480,
      damping: 40,
      mass: 0.65,
    });
  }, [open, mobile, x]);

  useEffect(() => {
    if (!mobile || !open) return;
    const scroller = document.querySelector(".mail-scroll");
    if (!scroller) return;
    const onScroll = () => onOpenChange(null);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [mobile, open, onOpenChange]);

  useEffect(() => {
    if (!mobile) return;
    const el = wrapRef.current;
    if (!el) return;

    const release = () => {
      unlockScroll.current?.();
      unlockScroll.current = null;
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      tracking.current = true;
      axis.current = null;
      startX.current = t.clientX;
      startY.current = t.clientY;
      baseX.current = x.get();
      suppressClick.current = false;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking.current || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;

      if (!axis.current) {
        if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return;
        axis.current = Math.abs(dx) > Math.abs(dy) * 1.15 ? "h" : "v";
        if (axis.current === "h") {
          unlockScroll.current = lockListScroll();
          suppressClick.current = true;
        } else {
          tracking.current = false;
          return;
        }
      }

      if (axis.current !== "h") return;

      e.preventDefault();
      const next = Math.max(OPEN_X, Math.min(0, baseX.current + dx));
      x.set(next);
      if (Math.abs(dx) > 8) suppressClick.current = true;
    };

    const onEnd = () => {
      if (!tracking.current && axis.current !== "h") {
        release();
        return;
      }
      const wasH = axis.current === "h";
      tracking.current = false;
      axis.current = null;
      release();

      if (!wasH) return;

      const cur = x.get();
      const shouldOpen = cur < OPEN_X * 0.45 || cur < baseX.current - 36;
      if (shouldOpen) {
        onOpenChange(id);
        void animate(x, OPEN_X, {
          type: "spring",
          stiffness: 480,
          damping: 40,
        });
      } else {
        onOpenChange(null);
        void animate(x, 0, {
          type: "spring",
          stiffness: 480,
          damping: 40,
        });
      }
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 100);
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      release();
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [mobile, id, onOpenChange, x]);

  if (!mobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={wrapRef}
      className={cn("relative overflow-hidden rounded-[14px]", className)}
    >
      <div
        className="absolute inset-y-0 right-0 z-0 flex items-center gap-1.5 pr-1.5"
        style={{ width: ACTION_W }}
        aria-hidden={!open}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(null);
            onReply();
          }}
          className="h-[calc(100%-6px)] min-h-0 w-[56px] rounded-full bg-[#0066ff] text-white inline-flex flex-col items-center justify-center gap-0.5 active:scale-[0.92] transition-transform duration-100 touch-manipulation"
          aria-label="Ответить"
        >
          <Reply size={16} strokeWidth={2.25} />
          <span className="text-[9px] font-medium leading-none font-[family-name:var(--font-manrope)]">
            Ответить
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(null);
            onDelete();
          }}
          className="h-[calc(100%-6px)] min-h-0 w-[56px] rounded-full bg-[#e53935] text-white inline-flex flex-col items-center justify-center gap-0.5 active:scale-[0.92] transition-transform duration-100 touch-manipulation"
          aria-label="Удалить"
        >
          <Trash2 size={16} strokeWidth={2.25} />
          <span className="text-[9px] font-medium leading-none font-[family-name:var(--font-manrope)]">
            Удалить
          </span>
        </button>
      </div>

      <motion.div
        style={{ x }}
        onClickCapture={(e) => {
          if (suppressClick.current || Math.abs(x.get()) > 10) {
            e.preventDefault();
            e.stopPropagation();
            if (Math.abs(x.get()) > 10 && !tracking.current) {
              onOpenChange(null);
              void animate(x, 0, {
                type: "spring",
                stiffness: 480,
                damping: 40,
              });
            }
          }
        }}
        className="relative z-10 touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
