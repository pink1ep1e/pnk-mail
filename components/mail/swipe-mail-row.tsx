"use client";

import { cn } from "@/lib/utils";
import { Reply, Trash2 } from "@/lib/icons";
import {
  animate,
  motion,
  useMotionValue,
  type PanInfo,
} from "motion/react";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

const ACTION_W = 132;
const OPEN_X = -ACTION_W - 6;

type SwipeMailRowProps = {
  id: string;
  open: boolean;
  onOpenChange: (id: string | null) => void;
  onReply: () => void;
  onDelete: () => void;
  children: ReactNode;
  className?: string;
};

/**
 * Mobile swipe-left reveals Reply + Delete pills (reference-style).
 * Desktop: no drag, children only.
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
  const dragging = useRef(false);
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
      stiffness: 420,
      damping: 36,
      mass: 0.7,
    });
  }, [open, mobile, x]);

  const snap = (info: PanInfo) => {
    const shouldOpen =
      info.offset.x < -48 ||
      info.velocity.x < -400 ||
      x.get() < OPEN_X / 2;
    if (shouldOpen) {
      onOpenChange(id);
      void animate(x, OPEN_X, {
        type: "spring",
        stiffness: 420,
        damping: 36,
      });
    } else {
      onOpenChange(null);
      void animate(x, 0, {
        type: "spring",
        stiffness: 420,
        damping: 36,
      });
    }
  };

  if (!mobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative", className)}>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-0 flex items-center justify-end gap-1.5 pr-1"
        style={{ width: ACTION_W + 10 }}
        aria-hidden={!open}
      >
        <div className="pointer-events-auto flex flex-col items-center gap-1 w-[58px]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenChange(null);
              onReply();
            }}
            className="h-9 w-full rounded-full bg-[#0066ff] text-white inline-flex items-center justify-center active:scale-[0.9] transition-transform duration-100 touch-manipulation shadow-[0_4px_14px_rgba(0,102,255,0.4)]"
            aria-label="Ответить"
          >
            <Reply size={17} strokeWidth={2.25} />
          </button>
          <span className="text-[10px] leading-none text-white/50 font-[family-name:var(--font-manrope)]">
            Ответить
          </span>
        </div>
        <div className="pointer-events-auto flex flex-col items-center gap-1 w-[58px]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenChange(null);
              onDelete();
            }}
            className="h-9 w-full rounded-full bg-[#e53935] text-white inline-flex items-center justify-center active:scale-[0.9] transition-transform duration-100 touch-manipulation shadow-[0_4px_14px_rgba(229,57,53,0.4)]"
            aria-label="Удалить"
          >
            <Trash2 size={17} strokeWidth={2.25} />
          </button>
          <span className="text-[10px] leading-none text-white/50 font-[family-name:var(--font-manrope)]">
            Удалить
          </span>
        </div>
      </div>

      <motion.div
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: OPEN_X, right: 0 }}
        dragElastic={0.08}
        onDragStart={() => {
          dragging.current = true;
          suppressClick.current = false;
        }}
        onDrag={(_, info) => {
          if (Math.abs(info.offset.x) > 10) suppressClick.current = true;
        }}
        onDragEnd={(_, info) => {
          dragging.current = false;
          snap(info);
          window.setTimeout(() => {
            suppressClick.current = false;
          }, 80);
        }}
        onClickCapture={(e) => {
          if (suppressClick.current || Math.abs(x.get()) > 12) {
            e.preventDefault();
            e.stopPropagation();
            if (Math.abs(x.get()) > 12 && !dragging.current) {
              onOpenChange(null);
              void animate(x, 0, {
                type: "spring",
                stiffness: 420,
                damping: 36,
              });
            }
          }
        }}
        className="relative z-10 touch-pan-y rounded-[12px]"
      >
        {children}
      </motion.div>
    </div>
  );
}
