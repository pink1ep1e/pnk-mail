"use client";

import { cn } from "@/lib/utils";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bell,
  Bold,
  Check,
  ChevronDown,
  Clock,
  Eraser,
  FileText,
  Highlighter,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Quote,
  Redo2,
  Search,
  Smile,
  Sparkles,
  Strikethrough,
  Tag,
  Underline,
  Undo2,
  Unlink,
  Wand2,
  X,
} from "@/lib/icons";
import { AnimatePresence, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

export type ComposeContact = {
  email: string;
  name: string;
  avatarUrl?: string | null;
  color?: string;
};

type ComposeEditorProps = {
  open: boolean;
  onClose: () => void;
  fromEmail: string;
  fromName: string;
  contacts?: ComposeContact[];
  draftId?: string | null;
  initialTo?: string;
  initialCc?: string;
  initialSubject?: string;
  initialBodyHtml?: string;
  onSend?: (payload: {
    to: string;
    cc: string;
    subject: string;
    bodyHtml: string;
  }) => void | Promise<void>;
  onSaveDraft?: (payload: {
    id?: string | null;
    to: string;
    cc: string;
    subject: string;
    bodyHtml: string;
  }) => void | Promise<string | null | undefined>;
};

type RecipientChip = {
  email: string;
  name: string;
  avatarUrl?: string | null;
  color?: string;
  internal: boolean;
};

function isInternalEmail(email: string) {
  return /@pnkmail\.ru$/i.test(email.trim());
}

function looksLikeEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(s.trim());
}

function contactInitial(name: string, email: string) {
  const base = (name || email.split("@")[0] || "?").trim();
  return base
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function toRecipient(
  email: string,
  contacts: ComposeContact[],
  fromEmail: string,
  fromName: string,
): RecipientChip | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !looksLikeEmail(normalized)) return null;
  const hit =
    contacts.find((c) => c.email.toLowerCase() === normalized) ||
    (normalized === fromEmail.toLowerCase()
      ? { email: fromEmail, name: fromName, color: "#0066ff" }
      : null);
  const internal = isInternalEmail(normalized);
  return {
    email: normalized,
    name: hit?.name || normalized.split("@")[0],
    avatarUrl: hit?.avatarUrl,
    color: hit?.color || "#4b5563",
    internal,
  };
}

type PopoverId =
  | "schedule"
  | "remind"
  | "template"
  | "more"
  | "emoji"
  | "font"
  | "size"
  | "color"
  | "link"
  | null;

type WinRect = { x: number; y: number; w: number; h: number };

const MIN_W = 420;
const MIN_H = 420;

const FONTS = [
  { label: "Arial", value: "Arial" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times", value: "Times New Roman" },
  { label: "Verdana", value: "Verdana" },
  { label: "Tahoma", value: "Tahoma" },
];

const SIZES = [
  { label: "12", px: "12px", cmd: "2" },
  { label: "14", px: "14px", cmd: "3" },
  { label: "16", px: "16px", cmd: "3" },
  { label: "18", px: "18px", cmd: "4" },
  { label: "20", px: "20px", cmd: "5" },
  { label: "24", px: "24px", cmd: "6" },
  { label: "32", px: "32px", cmd: "7" },
];

const COLORS = [
  "#ffffff",
  "#e5e7eb",
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#4ade80",
  "#4d9fff",
  "#0066ff",
  "#a78bfa",
  "#f472b6",
];

const EMOJIS = [
  "❤️",
  "👍",
  "👎",
  "👋",
  "🙏",
  "👏",
  "😍",
  "😀",
  "😅",
  "😉",
  "😜",
  "😎",
  "😢",
  "😟",
  "😱",
  "😇",
  "😈",
  "😡",
  "🔥",
  "🎉",
  "🎂",
  "💡",
  "📌",
  "☕",
  "☔",
  "☀️",
  "❄️",
  "⛄",
  "💧",
  "🌸",
];

const fieldClass =
  "h-11 w-full rounded-[12px] bg-[#0f1115] px-3.5 text-[14px] text-white placeholder:text-white/30 outline-none focus:outline focus:outline-2 focus:outline-[#0066ff] font-[family-name:var(--font-manrope)]";

const COMPOSE_RECT_KEY = "pnk-mail-compose-rect";

function defaultRect(): WinRect {
  if (typeof window === "undefined") {
    return { x: 40, y: 40, w: 720, h: 640 };
  }
  const w = Math.min(720, window.innerWidth - 24);
  const h = Math.min(640, window.innerHeight - 24);
  return {
    x: Math.max(12, window.innerWidth - w - 20),
    y: Math.max(12, window.innerHeight - h - 20),
    w,
    h,
  };
}

function clampRect(r: WinRect): WinRect {
  if (typeof window === "undefined") return r;
  const maxW = Math.max(MIN_W, window.innerWidth - 16);
  const maxH = Math.max(MIN_H, window.innerHeight - 16);
  const w = Math.min(Math.max(r.w, MIN_W), maxW);
  const h = Math.min(Math.max(r.h, MIN_H), maxH);
  const x = Math.min(Math.max(0, r.x), window.innerWidth - w);
  const y = Math.min(Math.max(0, r.y), window.innerHeight - h);
  return { x, y, w, h };
}

function loadComposeRect(): WinRect {
  if (typeof window === "undefined") return defaultRect();
  try {
    const raw = localStorage.getItem(COMPOSE_RECT_KEY);
    if (!raw) return defaultRect();
    const parsed = JSON.parse(raw) as Partial<WinRect>;
    if (
      typeof parsed.x !== "number" ||
      typeof parsed.y !== "number" ||
      typeof parsed.w !== "number" ||
      typeof parsed.h !== "number"
    ) {
      return defaultRect();
    }
    return clampRect({
      x: parsed.x,
      y: parsed.y,
      w: parsed.w,
      h: parsed.h,
    });
  } catch {
    return defaultRect();
  }
}

function saveComposeRect(r: WinRect) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMPOSE_RECT_KEY, JSON.stringify(clampRect(r)));
  } catch {
    // ignore quota / private mode
  }
}

function ToolBtn({
  children,
  onClick,
  pressed,
  disabled,
  title,
  className,
  buttonRef,
  accent,
  wide,
}: {
  children: ReactNode;
  onClick?: () => void;
  pressed?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  accent?: string;
  wide?: boolean;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={pressed}
      disabled={disabled}
      // Keep editor selection on desktop; on touch don't steal the scroll gesture
      onPointerDown={(e) => {
        if (e.pointerType !== "touch") e.preventDefault();
      }}
      onClick={() => {
        if (disabled) return;
        onClick?.();
      }}
      className={cn(
        "relative shrink-0 inline-flex items-center justify-center gap-1 select-none",
        "h-8 rounded-[8px] transition-[background-color,color,transform] duration-100",
        "active:scale-[0.94] touch-manipulation",
        wide ? "px-2.5 min-w-8" : "w-8",
        pressed
          ? "bg-[#0066ff]/25 text-[#7eb6ff]"
          : "text-white/50 hover:bg-white/[0.06] hover:text-white/90",
        disabled && "opacity-35 pointer-events-none",
        className,
      )}
    >
      {children}
      {accent ? (
        <span
          className="absolute bottom-[3px] left-1/2 -translate-x-1/2 h-[2px] w-3.5 rounded-full"
          style={{ backgroundColor: accent }}
        />
      ) : null}
    </button>
  );
}

function ToolSep() {
  return <span className="mx-1 h-4 w-px shrink-0 bg-white/10" aria-hidden />;
}

function PortalMenu({
  open,
  anchor,
  placement = "bottom",
  align = "left",
  className,
  children,
  onClose,
}: {
  open: boolean;
  anchor: HTMLElement | null;
  placement?: "bottom" | "top";
  align?: "left" | "right" | "center";
  className?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({
    position: "fixed",
    opacity: 0,
    pointerEvents: "none",
  });

  useLayoutEffect(() => {
    if (!open || !anchor) return;

    const update = () => {
      const r = anchor.getBoundingClientRect();
      const menu = menuRef.current;
      const pad = 8;
      const mw = menu?.offsetWidth || 288;
      const mh = menu?.offsetHeight || 160;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = r.left;
      if (align === "right") left = r.right - mw;
      else if (align === "center") left = r.left + r.width / 2 - mw / 2;

      // Keep fully on screen horizontally
      left = Math.min(Math.max(pad, left), vw - mw - pad);

      let top: number | undefined;
      let bottom: number | undefined;
      if (placement === "top") {
        const spaceAbove = r.top - pad;
        if (spaceAbove >= mh || spaceAbove >= vh - r.bottom) {
          bottom = vh - r.top + 8;
        } else {
          top = r.bottom + 8;
        }
      } else {
        const spaceBelow = vh - r.bottom - pad;
        if (spaceBelow >= mh || spaceBelow >= r.top) {
          top = r.bottom + 8;
        } else {
          bottom = vh - r.top + 8;
        }
      }

      if (top !== undefined) {
        top = Math.min(top, vh - mh - pad);
        top = Math.max(pad, top);
      }

      setStyle({
        position: "fixed",
        zIndex: 80,
        opacity: 1,
        pointerEvents: "auto",
        left,
        top,
        bottom,
        maxWidth: `min(288px, calc(100vw - ${pad * 2}px))`,
      });
    };

    update();
    // Second pass after menu mounts with real size
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchor, placement, align, children]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (anchor?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, anchor, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      data-compose-menu
      style={style}
      className={cn(
        "rounded-[16px] bg-[#24262e] shadow-[0_20px_50px_rgba(0,0,0,0.55)] p-1.5",
        className,
      )}
      onMouseDown={(e) => e.preventDefault()}
    >
      {children}
    </div>,
    document.body,
  );
}

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-5 w-9 rounded-full transition-colors shrink-0",
        on ? "bg-[#0066ff]" : "bg-white/12",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform",
          on && "translate-x-4",
        )}
      />
    </button>
  );
}

function SoftCheck({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "h-5 w-5 shrink-0 rounded-[6px] flex items-center justify-center transition-colors",
        checked ? "bg-[#0066ff] text-white" : "bg-[#0f1115]",
      )}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </span>
  );
}

function scheduleLabels() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(12, 0, 0, 0);
  const week = new Date(now);
  week.setDate(week.getDate() + 7);
  week.setHours(12, 0, 0, 0);
  const fmt = (d: Date) => {
    const days = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
    return `${days[d.getDay()]}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  return { tomorrow: fmt(tomorrow), week: fmt(week) };
}

function rgbToHex(color: string): string | null {
  if (!color) return null;
  if (color.startsWith("#")) return color.toLowerCase();
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return null;
  const hex = [m[1], m[2], m[3]]
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

export default function ComposeEditor({
  open,
  onClose,
  fromEmail,
  fromName,
  contacts = [],
  draftId = null,
  initialTo = "",
  initialCc = "",
  initialSubject = "",
  initialBodyHtml = "",
  onSend,
  onSaveDraft,
}: ComposeEditorProps) {
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [rect, setRect] = useState<WinRect>(() => loadComposeRect());
  const [restoreRect, setRestoreRect] = useState<WinRect | null>(null);
  const [showCopies, setShowCopies] = useState(false);
  const [recipients, setRecipients] = useState<RecipientChip[]>([]);
  const [toDraft, setToDraft] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const toInputRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const savingDraftRef = useRef(false);
  const [fontLabel, setFontLabel] = useState("Arial");
  const [fontSizeLabel, setFontSizeLabel] = useState("16");
  const [popover, setPopover] = useState<PopoverId>(null);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [remindNoReply, setRemindNoReply] = useState(false);
  const [notifyDelivery, setNotifyDelivery] = useState(false);
  const [autocomplete, setAutocomplete] = useState(true);
  const [subjectHint, setSubjectHint] = useState(false);
  const [subjectSuggestion, setSubjectSuggestion] = useState<string | null>(
    null,
  );
  const [sentFlash, setSentFlash] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [bodyEmpty, setBodyEmpty] = useState(true);
  const [fmt, setFmt] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    ul: false,
    ol: false,
    color: "#ffffff",
  });

  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const rectRef = useRef<WinRect>(rect);
  const maximizedRef = useRef(maximized);
  const restoreRectRef = useRef(restoreRect);
  const dragRef = useRef<{
    mode: "move" | "resize";
    startX: number;
    startY: number;
    origin: WinRect;
  } | null>(null);

  rectRef.current = rect;
  maximizedRef.current = maximized;
  restoreRectRef.current = restoreRect;
  const schedules = scheduleLabels();

  const fontBtnRef = useRef<HTMLButtonElement>(null);
  const sizeBtnRef = useRef<HTMLButtonElement>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const linkBtnRef = useRef<HTMLButtonElement>(null);
  const scheduleBtnRef = useRef<HTMLButtonElement>(null);
  const remindBtnRef = useRef<HTMLButtonElement>(null);
  const templateBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const closePopover = useCallback(() => setPopover(null), []);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return;
    savedRange.current = range.cloneRange();
  }, []);

  const restoreSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (!sel) return;
    if (savedRange.current) {
      try {
        sel.removeAllRanges();
        sel.addRange(savedRange.current);
        return;
      } catch {
        // fall through
      }
    }
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }, []);

  const syncEmpty = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const text = el.innerText.replace(/\u00a0/g, " ").replace(/\u200b/g, "").trim();
    const hasMedia = Boolean(el.querySelector("img, video, iframe"));
    setBodyEmpty(text.length === 0 && !hasMedia);
  }, []);

  const refreshFormat = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement !== editor) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.anchorNode) return;
    if (!editor.contains(sel.anchorNode)) return;

    const hasTagOrStyle = (
      tags: string[],
      styleCheck: (style: CSSStyleDeclaration) => boolean,
    ) => {
      let node: Node | null = sel.anchorNode;
      if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
      let el = node as HTMLElement | null;
      while (el && el !== editor) {
        if (tags.includes(el.tagName)) return true;
        if (styleCheck(el.style)) return true;
        el = el.parentElement;
      }
      return false;
    };

    let color = "#ffffff";
    let node: Node | null = sel.anchorNode;
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
    let el = node as HTMLElement | null;
    while (el && el !== editor) {
      if (el.style.color) {
        color = rgbToHex(el.style.color) || color;
        break;
      }
      el = el.parentElement;
    }

    let ul = false;
    let ol = false;
    try {
      ul = document.queryCommandState("insertUnorderedList");
      ol = document.queryCommandState("insertOrderedList");
      color = rgbToHex(document.queryCommandValue("foreColor")) || color;
    } catch {
      // ignore
    }

    setFmt({
      bold: hasTagOrStyle(["B", "STRONG"], (s) => {
        const w = s.fontWeight;
        return w === "bold" || Number.parseInt(w, 10) >= 700;
      }),
      italic: hasTagOrStyle(
        ["I", "EM"],
        (s) => s.fontStyle === "italic",
      ),
      underline: hasTagOrStyle(
        ["U"],
        (s) =>
          s.textDecoration.includes("underline") ||
          (s.textDecorationLine?.includes("underline") ?? false),
      ),
      strike: hasTagOrStyle(
        ["S", "STRIKE", "DEL"],
        (s) =>
          s.textDecoration.includes("line-through") ||
          (s.textDecorationLine?.includes("line-through") ?? false),
      ),
      ul,
      ol,
      color,
    });
  }, []);

  const exec = useCallback(
    (command: string, value?: string) => {
      restoreSelection();
      document.execCommand(command, false, value);
      saveSelection();
      syncEmpty();
    },
    [restoreSelection, saveSelection, syncEmpty],
  );

  const toggleInline = useCallback(
    (key: "bold" | "italic" | "underline" | "strike", command: string) => {
      restoreSelection();
      document.execCommand(command, false);
      saveSelection();
      syncEmpty();
      setFmt((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [restoreSelection, saveSelection, syncEmpty],
  );

  const applyColor = useCallback(
    (color: string) => {
      restoreSelection();
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("foreColor", false, color);
      saveSelection();
      setFmt((prev) => ({ ...prev, color }));
      setPopover(null);
    },
    [restoreSelection, saveSelection],
  );

  const applyFont = useCallback(
    (label: string, value: string) => {
      setFontLabel(label);
      restoreSelection();
      document.execCommand("fontName", false, value);
      saveSelection();
      setPopover(null);
    },
    [restoreSelection, saveSelection],
  );

  const applySize = useCallback(
    (label: string, px: string, cmd: string) => {
      setFontSizeLabel(label);
      restoreSelection();
      document.execCommand("fontSize", false, cmd);
      const editor = editorRef.current;
      if (editor) {
        editor.querySelectorAll("font[size]").forEach((node) => {
          const el = node as HTMLFontElement;
          if (el.getAttribute("size") === cmd) {
            const span = document.createElement("span");
            span.style.fontSize = px;
            span.innerHTML = el.innerHTML;
            el.replaceWith(span);
          }
        });
      }
      saveSelection();
      setPopover(null);
    },
    [restoreSelection, saveSelection],
  );

  const insertEmoji = useCallback(
    (emoji: string) => {
      restoreSelection();
      const ok = document.execCommand("insertText", false, emoji);
      if (!ok) {
        document.execCommand("insertHTML", false, emoji);
      }
      saveSelection();
      syncEmpty();
      setPopover(null);
    },
    [restoreSelection, saveSelection, syncEmpty],
  );

  const applyLink = useCallback(() => {
    const url = linkUrl.trim();
    if (!url) return;
    restoreSelection();
    const sel = window.getSelection();
    const hasText = sel && !sel.isCollapsed;
    if (hasText) {
      document.execCommand("createLink", false, url);
    } else {
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#4d9fff;text-decoration:underline;">${url}</a>&nbsp;`,
      );
    }
    saveSelection();
    syncEmpty();
    setPopover(null);
    setLinkUrl("https://");
  }, [linkUrl, restoreSelection, saveSelection, syncEmpty]);

  const insertImageFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        restoreSelection();
        const src = String(reader.result || "");
        document.execCommand(
          "insertHTML",
          false,
          `<img src="${src}" alt="" style="max-width:100%;height:auto;border-radius:12px;display:block;margin:8px 0;" />`,
        );
        saveSelection();
        syncEmpty();
      };
      reader.readAsDataURL(file);
    },
    [restoreSelection, saveSelection, syncEmpty],
  );

  const persistRect = useCallback((r: WinRect) => {
    const next = clampRect(r);
    saveComposeRect(next);
    return next;
  }, []);

  const reset = useCallback(() => {
    if (maximizedRef.current && restoreRectRef.current) {
      persistRect(restoreRectRef.current);
    } else {
      persistRect(rectRef.current);
    }

    setRecipients([]);
    setToDraft("");
    setSuggestOpen(false);
    setCc("");
    setBcc("");
    setSubject("");
    setShowCopies(false);
    setMinimized(false);
    setMaximized(false);
    setPopover(null);
    setRemindNoReply(false);
    setNotifyDelivery(false);
    setSubjectSuggestion(null);
    setTemplateSaved(false);
    setBodyEmpty(true);
    setFontLabel("Arial");
    setFontSizeLabel("16");
    setLinkUrl("https://");
    setRestoreRect(null);
    savedRange.current = null;
    if (editorRef.current) editorRef.current.innerHTML = "";
  }, [persistRect]);

  // Seed compose fields when opening (not on every contacts re-render)
  useEffect(() => {
    if (!open) return;
    const saved = loadComposeRect();
    setRect(saved);
    rectRef.current = saved;
    setMaximized(false);
    setMinimized(false);
    setRestoreRect(null);

    setActiveDraftId(draftId || null);
    setSubject(initialSubject || "");
    setCc(initialCc || "");
    setShowCopies(Boolean(initialCc));

    const chips: RecipientChip[] = [];
    for (const part of (initialTo || "").split(/[,;]+/)) {
      const chip = toRecipient(part, contacts, fromEmail, fromName);
      if (chip) chips.push(chip);
    }
    setRecipients(chips);
    setToDraft("");

    const html = initialBodyHtml || "";
    // defer so editor mount exists
    requestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
        setBodyEmpty(!html.replace(/<[^>]+>/g, "").trim());
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reseeds when open/draft identity changes
  }, [open, draftId, initialTo, initialCc, initialSubject, initialBodyHtml]);

  const collectDraftPayload = useCallback(() => {
    const draftChip = toRecipient(toDraft, contacts, fromEmail, fromName);
    const toList = [
      ...recipients.map((r) => r.email),
      ...(draftChip ? [draftChip.email] : []),
    ];
    const unique = [...new Set(toList)];
    return {
      id: activeDraftId,
      to: unique.join(", "),
      cc: cc.trim(),
      subject: subject.trim(),
      bodyHtml: editorRef.current?.innerHTML?.trim() || "",
    };
  }, [
    activeDraftId,
    recipients,
    toDraft,
    contacts,
    fromEmail,
    fromName,
    cc,
    subject,
  ]);

  const closeWithDraftSave = useCallback(async () => {
    if (savingDraftRef.current) return;
    savingDraftRef.current = true;
    try {
      if (onSaveDraft) {
        const payload = collectDraftPayload();
        await onSaveDraft(payload);
      }
    } catch {
      // keep closing even if draft save fails
    } finally {
      savingDraftRef.current = false;
      reset();
      setActiveDraftId(null);
      onClose();
    }
  }, [onSaveDraft, collectDraftPayload, reset, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (popover) setPopover(null);
        else void closeWithDraftSave();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, popover, closeWithDraftSave]);

  useEffect(() => {
    if (!open || maximized) return;
    const onResize = () => {
      const next = clampRect(rectRef.current);
      rectRef.current = next;
      setRect(next);
      saveComposeRect(next);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, maximized]);

  useEffect(() => {
    if (!open) return;
    const onSel = () => saveSelection();
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, [open, saveSelection]);

  useEffect(() => {
    const first = recipients[0]?.email || toDraft;
    if (!subjectHint || !first.trim()) {
      setSubjectSuggestion(null);
      return;
    }
    const name = first.split("@")[0]?.replace(/[._]/g, " ") ?? "";
    if (!name || subject.trim()) {
      setSubjectSuggestion(null);
      return;
    }
    setSubjectSuggestion(`Вопрос по письму для ${name}`);
  }, [subjectHint, recipients, toDraft, subject]);

  const allContacts = useMemo(() => {
    const map = new Map<string, ComposeContact>();
    map.set(fromEmail.toLowerCase(), {
      email: fromEmail,
      name: fromName,
      color: "#0066ff",
    });
    for (const c of contacts) {
      map.set(c.email.toLowerCase(), c);
    }
    return [...map.values()];
  }, [contacts, fromEmail, fromName]);

  const suggestions = useMemo(() => {
    const q = toDraft.trim().toLowerCase();
    const taken = new Set(recipients.map((r) => r.email.toLowerCase()));
    const list = allContacts.filter((c) => !taken.has(c.email.toLowerCase()));
    if (!q) {
      // Show self first when focused empty
      return list.slice(0, 6);
    }
    return list
      .filter(
        (c) =>
          c.email.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.email.toLowerCase() === fromEmail.toLowerCase() &&
            "себе".includes(q)),
      )
      .slice(0, 8);
  }, [allContacts, toDraft, recipients, fromEmail]);

  const commitRecipient = useCallback(
    (raw: string) => {
      const chip = toRecipient(raw, allContacts, fromEmail, fromName);
      if (!chip) return false;
      setRecipients((prev) => {
        if (prev.some((r) => r.email === chip.email)) return prev;
        return [...prev, chip];
      });
      setToDraft("");
      setSuggestOpen(false);
      return true;
    },
    [allContacts, fromEmail, fromName],
  );

  const pickContact = useCallback(
    (c: ComposeContact) => {
      commitRecipient(c.email);
      toInputRef.current?.focus();
    },
    [commitRecipient],
  );

  const removeRecipient = useCallback((email: string) => {
    setRecipients((prev) => prev.filter((r) => r.email !== email));
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const next =
        d.mode === "move"
          ? clampRect({
              ...d.origin,
              x: d.origin.x + (e.clientX - d.startX),
              y: d.origin.y + (e.clientY - d.startY),
            })
          : clampRect({
              ...d.origin,
              w: d.origin.w + (e.clientX - d.startX),
              h: d.origin.h + (e.clientY - d.startY),
            });
      rectRef.current = next;
      setRect(next);
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      if (!maximizedRef.current) {
        persistRect(rectRef.current);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [persistRect]);

  const startMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (maximized || minimized) return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    e.preventDefault();
    dragRef.current = {
      mode: "move",
      startX: e.clientX,
      startY: e.clientY,
      origin: rect,
    };
  };

  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (maximized || minimized) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      mode: "resize",
      startX: e.clientX,
      startY: e.clientY,
      origin: rect,
    };
  };

  const toggleMaximize = () => {
    setPopover(null);
    setMinimized(false);
    if (maximized) {
      setMaximized(false);
      const next = restoreRect
        ? clampRect(restoreRect)
        : loadComposeRect();
      setRect(next);
      persistRect(next);
      return;
    }
    setRestoreRect(rect);
    persistRect(rect);
    setMaximized(true);
    setRect({
      x: 12,
      y: 12,
      w: window.innerWidth - 24,
      h: window.innerHeight - 24,
    });
  };

  const handleSend = () => {
    const bodyHtml = editorRef.current?.innerHTML?.trim() || "";
    const draftChip = toRecipient(toDraft, allContacts, fromEmail, fromName);
    const merged = [
      ...recipients,
      ...(draftChip ? [draftChip] : []),
    ];
    const unique = [
      ...new Set(merged.map((r) => r.email.toLowerCase())),
    ];
    if (draftChip) {
      setRecipients(merged.filter(
        (r, i, arr) =>
          arr.findIndex((x) => x.email === r.email) === i,
      ));
      setToDraft("");
    }
    if (!unique.length) {
      setSuggestOpen(true);
      toInputRef.current?.focus();
      return;
    }
    const payload = {
      to: unique.join(", "),
      cc: cc.trim(),
      subject: subject.trim() || "(без темы)",
      bodyHtml,
    };
    void (async () => {
      try {
        await onSend?.(payload);
        setSentFlash(true);
        // Drop draft after successful send
        if (activeDraftId) {
          try {
            await fetch("/api/mail/drafts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: activeDraftId,
                to: "",
                cc: "",
                subject: "",
                bodyHtml: "",
              }),
            });
          } catch {
            /* ignore */
          }
        }
        window.setTimeout(() => {
          setSentFlash(false);
          reset();
          setActiveDraftId(null);
          onClose();
        }, 700);
      } catch {
        // Parent shows error; keep composer open
      }
    })();
  };

  const saveTemplate = () => {
    setTemplateSaved(true);
    setPopover("template");
    window.setTimeout(() => {
      setTemplateSaved(false);
      setPopover(null);
    }, 1400);
  };

  const togglePopover = (id: PopoverId) => {
    setPopover((cur) => (cur === id ? null : id));
  };

  const winStyle: CSSProperties = minimized
    ? {
        left: rect.x,
        top: undefined,
        bottom: 12,
        width: Math.min(360, rect.w),
        height: 56,
      }
    : {
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
      };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className={cn(
            "fixed z-50 flex flex-col bg-[#1a1c22] font-[family-name:var(--font-manrope)] shadow-[0_24px_80px_rgba(0,0,0,0.55)] rounded-[24px]",
            minimized && "rounded-[20px]",
          )}
          style={winStyle}
        >
          <div
            className={cn(
              "shrink-0 h-14 px-4 flex items-center gap-2 rounded-t-[24px]",
              !maximized && !minimized && "cursor-grab active:cursor-grabbing",
            )}
            onPointerDown={startMove}
          >
            <span className="flex-1 font-[family-name:var(--font-unbounded)] font-semibold text-[15px] text-white truncate px-1 select-none">
              {subject.trim() || "Новое письмо"}
            </span>
            <ToolBtn
              title="Свернуть"
              onClick={() => {
                setMinimized((v) => !v);
                setPopover(null);
              }}
            >
              <Minimize2 size={15} />
            </ToolBtn>
            <ToolBtn
              title={maximized ? "Восстановить" : "На весь экран"}
              onClick={toggleMaximize}
            >
              <Maximize2 size={15} />
            </ToolBtn>
            <ToolBtn
              title="Закрыть"
              onClick={() => void closeWithDraftSave()}
            >
              <X size={16} />
            </ToolBtn>
          </div>

          {!minimized && (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-b-[24px]">
              <div className="shrink-0 px-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <div
                      className="min-h-11 rounded-[12px] bg-[#0f1115] px-3.5 py-1.5 flex flex-wrap items-center gap-1.5 cursor-text"
                      onClick={() => {
                        toInputRef.current?.focus();
                        setSuggestOpen(true);
                      }}
                    >
                      <span className="shrink-0 text-[13px] text-white/35 self-center mr-1">
                        Кому
                      </span>
                      {recipients.map((r) =>
                        r.internal ? (
                          <span
                            key={r.email}
                            className="inline-flex items-center gap-1.5 h-7 pl-0.5 pr-1.5 rounded-full bg-[#2a2d36] text-white max-w-full"
                          >
                            <span
                              className="h-6 w-6 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-semibold shrink-0"
                              style={{
                                backgroundColor: r.avatarUrl
                                  ? undefined
                                  : r.color,
                              }}
                            >
                              {r.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={r.avatarUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                contactInitial(r.name, r.email)
                              )}
                            </span>
                            <span className="text-[13px] font-medium truncate max-w-[140px]">
                              {r.name}
                            </span>
                            <button
                              type="button"
                              className="h-5 w-5 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRecipient(r.email);
                              }}
                              aria-label="Убрать"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ) : (
                          <span
                            key={r.email}
                            className="inline-flex items-center gap-1 h-7 text-[13px] text-white/80"
                          >
                            {r.email}
                            <button
                              type="button"
                              className="h-5 w-5 rounded-full flex items-center justify-center text-white/35 hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRecipient(r.email);
                              }}
                              aria-label="Убрать"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ),
                      )}
                      <input
                        ref={toInputRef}
                        value={toDraft}
                        onChange={(e) => {
                          setToDraft(e.target.value);
                          setSuggestOpen(true);
                        }}
                        onFocus={() => setSuggestOpen(true)}
                        onBlur={() => {
                          window.setTimeout(() => setSuggestOpen(false), 150);
                        }}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" ||
                            e.key === "," ||
                            e.key === ";" ||
                            e.key === "Tab"
                          ) {
                            if (toDraft.trim()) {
                              e.preventDefault();
                              if (!commitRecipient(toDraft)) {
                                // keep draft if invalid
                              }
                            }
                          } else if (
                            e.key === "Backspace" &&
                            !toDraft &&
                            recipients.length
                          ) {
                            removeRecipient(
                              recipients[recipients.length - 1].email,
                            );
                          }
                        }}
                        className="flex-1 min-w-[120px] bg-transparent outline-none text-[14px] text-white placeholder:text-white/25 py-1.5"
                        placeholder={
                          recipients.length ? "" : "имя@пример.ru"
                        }
                        autoComplete="off"
                      />
                    </div>

                    {suggestOpen && (suggestions.length > 0 || toDraft) && (
                      <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 rounded-[14px] bg-[#1a1c22] shadow-[0_12px_40px_rgba(0,0,0,0.55)] overflow-hidden border border-white/8">
                        {suggestions.map((c) => {
                          const self =
                            c.email.toLowerCase() === fromEmail.toLowerCase();
                          return (
                            <button
                              key={c.email}
                              type="button"
                              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-white/5 transition-colors"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => pickContact(c)}
                            >
                              <span
                                className="h-9 w-9 rounded-[10px] overflow-hidden flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                                style={{
                                  backgroundColor: c.avatarUrl
                                    ? undefined
                                    : c.color || "#111",
                                }}
                              >
                                {c.avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={c.avatarUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  contactInitial(c.name, c.email)
                                )}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-[14px] font-semibold text-white">
                                  {self ? "Себе" : c.name}
                                </span>
                                <span className="block text-[12px] text-white/45 truncate">
                                  {c.email}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                        <div className="border-t border-white/8 px-3.5 py-2.5 flex items-center gap-2 text-[13px] text-white/40">
                          <Search size={14} className="shrink-0" />
                          <span>
                            {toDraft.trim()
                              ? `Найти «${toDraft.trim()}»`
                              : "Искать по всем контактам"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCopies((v) => !v)}
                    className="shrink-0 h-11 px-3 rounded-[12px] bg-[#0f1115] text-[13px] text-white/45 hover:text-white hover:bg-[#24262e] inline-flex items-center gap-1 transition-colors"
                  >
                    Копии
                    <ChevronDown
                      size={14}
                      className={cn(
                        "transition-transform",
                        showCopies && "rotate-180",
                      )}
                    />
                  </button>
                </div>

                {showCopies && (
                  <>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-white/35">
                        Копия
                      </span>
                      <input
                        value={cc}
                        onChange={(e) => setCc(e.target.value)}
                        className={cn(fieldClass, "pl-[62px]")}
                        placeholder="копия@"
                        autoComplete="off"
                      />
                    </div>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-white/35">
                        Скрытая
                      </span>
                      <input
                        value={bcc}
                        onChange={(e) => setBcc(e.target.value)}
                        className={cn(fieldClass, "pl-[74px]")}
                        placeholder="скрытая@"
                        autoComplete="off"
                      />
                    </div>
                    <div className="h-11 rounded-[12px] bg-[#0f1115] px-3.5 flex items-center gap-2">
                      <span className="text-[13px] text-white/35 shrink-0">
                        От кого
                      </span>
                      <span className="text-[14px] text-white/80 truncate">
                        {fromName} &lt;{fromEmail}&gt;
                      </span>
                    </div>
                  </>
                )}

                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-white/35">
                    Тема
                  </span>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className={cn(fieldClass, "pl-[52px]")}
                    placeholder="Тема письма"
                    autoComplete="off"
                  />
                </div>

                {subjectSuggestion && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubject(subjectSuggestion);
                      setSubjectSuggestion(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0066ff]/15 text-[#4d9fff] text-[12px] px-3 py-1.5 hover:bg-[#0066ff]/25 transition-colors"
                  >
                    <Sparkles size={12} />
                    Подсказка: {subjectSuggestion}
                  </button>
                )}
              </div>

              <div className="shrink-0 mx-4 mt-3 px-1 py-1 rounded-[12px] bg-[#0f1115] flex items-center gap-0.5 overflow-x-auto no-scrollbar touch-pan-x overscroll-x-contain">
                <ToolBtn title="Отменить" onClick={() => exec("undo")}>
                  <Undo2 size={15} strokeWidth={1.75} />
                </ToolBtn>
                <ToolBtn title="Повторить" onClick={() => exec("redo")}>
                  <Redo2 size={15} strokeWidth={1.75} />
                </ToolBtn>
                <ToolSep />
                <ToolBtn
                  title="Жирный"
                  pressed={fmt.bold}
                  onClick={() => toggleInline("bold", "bold")}
                >
                  <Bold size={15} strokeWidth={2.25} />
                </ToolBtn>
                <ToolBtn
                  title="Курсив"
                  pressed={fmt.italic}
                  onClick={() => toggleInline("italic", "italic")}
                >
                  <Italic size={15} strokeWidth={2.25} />
                </ToolBtn>
                <ToolBtn
                  title="Подчёркнутый"
                  pressed={fmt.underline}
                  onClick={() => toggleInline("underline", "underline")}
                >
                  <Underline size={15} strokeWidth={2.25} />
                </ToolBtn>
                <ToolBtn
                  title="Зачёркнутый"
                  pressed={fmt.strike}
                  onClick={() => toggleInline("strike", "strikeThrough")}
                >
                  <Strikethrough size={15} strokeWidth={2.25} />
                </ToolBtn>
                <ToolSep />

                <ToolBtn
                  buttonRef={fontBtnRef}
                  title="Шрифт"
                  wide
                  pressed={popover === "font"}
                  onClick={() => togglePopover("font")}
                >
                  <span className="text-[12px] font-medium max-w-[72px] truncate">
                    {fontLabel}
                  </span>
                  <ChevronDown size={12} />
                </ToolBtn>
                <PortalMenu
                  open={popover === "font"}
                  anchor={fontBtnRef.current}
                  onClose={closePopover}
                  className="w-48"
                >
                  {FONTS.map((f) => (
                    <button
                      key={f.label}
                      type="button"
                      onClick={() => applyFont(f.label, f.value)}
                      className="w-full px-3 py-2 text-left text-[13px] text-white/80 hover:bg-white/5 rounded-[10px]"
                      style={{ fontFamily: f.value }}
                    >
                      {f.label}
                    </button>
                  ))}
                </PortalMenu>

                <ToolBtn
                  buttonRef={sizeBtnRef}
                  title="Размер шрифта"
                  wide
                  pressed={popover === "size"}
                  onClick={() => togglePopover("size")}
                >
                  <span className="text-[12px] font-medium tabular-nums">
                    {fontSizeLabel}
                  </span>
                  <ChevronDown size={12} />
                </ToolBtn>
                <PortalMenu
                  open={popover === "size"}
                  anchor={sizeBtnRef.current}
                  onClose={closePopover}
                  className="w-36"
                >
                  {SIZES.map((s) => (
                    <button
                      key={s.px}
                      type="button"
                      onClick={() => applySize(s.label, s.px, s.cmd)}
                      className="w-full px-3 py-2 text-left text-white/80 hover:bg-white/5 rounded-[10px]"
                      style={{ fontSize: s.px }}
                    >
                      {s.label}
                    </button>
                  ))}
                </PortalMenu>

                <ToolBtn
                  buttonRef={colorBtnRef}
                  title="Цвет"
                  pressed={popover === "color"}
                  accent={fmt.color}
                  onClick={() => togglePopover("color")}
                >
                  <Highlighter size={15} strokeWidth={1.75} />
                </ToolBtn>
                <PortalMenu
                  open={popover === "color"}
                  anchor={colorBtnRef.current}
                  onClose={closePopover}
                  className="grid grid-cols-5 gap-1.5 p-2.5 w-[156px]"
                >
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => applyColor(c)}
                      className={cn(
                        "h-6 w-6 rounded-[8px]",
                        fmt.color.toLowerCase() === c.toLowerCase() &&
                          "ring-2 ring-[#4d9fff]",
                      )}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                  ))}
                </PortalMenu>

                <ToolBtn
                  title="Очистить форматирование"
                  onClick={() => {
                    exec("removeFormat");
                    setFmt((prev) => ({
                      ...prev,
                      bold: false,
                      italic: false,
                      underline: false,
                      strike: false,
                      color: "#ffffff",
                    }));
                  }}
                >
                  <Eraser size={15} strokeWidth={1.75} />
                </ToolBtn>
                <ToolSep />

                <ToolBtn
                  buttonRef={emojiBtnRef}
                  title="Эмодзи"
                  pressed={popover === "emoji"}
                  onClick={() => togglePopover("emoji")}
                >
                  <Smile size={15} strokeWidth={1.75} />
                </ToolBtn>
                <PortalMenu
                  open={popover === "emoji"}
                  anchor={emojiBtnRef.current}
                  onClose={closePopover}
                  className="grid grid-cols-6 gap-1 p-2 w-[228px]"
                >
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => insertEmoji(e)}
                      className="h-8 w-8 rounded-[10px] text-[18px] hover:bg-white/5"
                    >
                      {e}
                    </button>
                  ))}
                </PortalMenu>

                <ToolBtn
                  buttonRef={linkBtnRef}
                  title="Ссылка"
                  pressed={popover === "link"}
                  onClick={() => togglePopover("link")}
                >
                  <Link2 size={15} strokeWidth={1.75} />
                </ToolBtn>
                <PortalMenu
                  open={popover === "link"}
                  anchor={linkBtnRef.current}
                  align="right"
                  onClose={closePopover}
                  className="w-72 max-w-[calc(100vw-16px)] p-2"
                >
                  <p className="px-2 pt-1 pb-2 text-[12px] text-white/40">
                    Выделите текст или вставьте URL
                  </p>
                  <input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyLink();
                      }
                    }}
                    className="w-full h-10 rounded-[10px] bg-[#0f1115] px-3 text-[13px] text-white outline-none mb-2"
                    placeholder="https://"
                  />
                  <button
                    type="button"
                    onClick={applyLink}
                    className="w-full h-10 rounded-[10px] bg-[#0066ff] text-white text-[13px] font-semibold hover:bg-[#0052cc]"
                  >
                    Вставить ссылку
                  </button>
                </PortalMenu>
                <ToolBtn title="Убрать ссылку" onClick={() => exec("unlink")}>
                  <Unlink size={15} strokeWidth={1.75} />
                </ToolBtn>
                <ToolBtn
                  title="Изображение"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImageIcon size={15} strokeWidth={1.75} />
                </ToolBtn>
                <ToolBtn
                  title="Цитата"
                  onClick={() => exec("formatBlock", "blockquote")}
                >
                  <Quote size={15} strokeWidth={1.75} />
                </ToolBtn>
                <ToolSep />
                <ToolBtn
                  title="По левому краю"
                  onClick={() => exec("justifyLeft")}
                >
                  <AlignLeft size={15} strokeWidth={1.75} />
                </ToolBtn>
                <ToolBtn
                  title="По центру"
                  onClick={() => exec("justifyCenter")}
                >
                  <AlignCenter size={15} strokeWidth={1.75} />
                </ToolBtn>
                <ToolBtn
                  title="По правому краю"
                  onClick={() => exec("justifyRight")}
                >
                  <AlignRight size={15} strokeWidth={1.75} />
                </ToolBtn>
                <ToolBtn
                  title="Маркированный список"
                  pressed={fmt.ul}
                  onClick={() => {
                    exec("insertUnorderedList");
                    setFmt((prev) => ({
                      ...prev,
                      ul: !prev.ul,
                      ol: false,
                    }));
                  }}
                >
                  <List size={15} strokeWidth={1.75} />
                </ToolBtn>
                <ToolBtn
                  title="Нумерованный список"
                  pressed={fmt.ol}
                  onClick={() => {
                    exec("insertOrderedList");
                    setFmt((prev) => ({
                      ...prev,
                      ol: !prev.ol,
                      ul: false,
                    }));
                  }}
                >
                  <ListOrdered size={15} strokeWidth={1.75} />
                </ToolBtn>
              </div>

              <div className="relative flex-1 min-h-0 mx-4 mt-3 mb-2 rounded-[16px] bg-[#0f1115] overflow-hidden">
                {bodyEmpty && (
                  <span className="pointer-events-none absolute left-4 top-3 text-[15px] text-white/30 z-0">
                    Напишите что-нибудь
                  </span>
                )}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck
                  className={cn(
                    "relative z-[1] h-full overflow-y-auto px-4 py-3 text-[15px] text-white/90 outline-none",
                    "leading-[1.45]",
                    "[&_div]:m-0 [&_p]:m-0 [&_p]:leading-[1.45] [&_div]:leading-[1.45]",
                    "[&_ul]:my-1 [&_ol]:my-1 [&_ul]:pl-5 [&_ol]:pl-5",
                    "[&_ul]:list-disc [&_ol]:list-decimal",
                    "[&_li]:my-0 [&_li]:leading-[1.45]",
                    "[&_blockquote]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-[#0066ff] [&_blockquote]:pl-3 [&_blockquote]:text-white/60",
                    "[&_a]:text-[#4d9fff] [&_a]:underline",
                    "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-[12px] [&_img]:block [&_img]:my-2",
                    autocomplete && "caret-[#4d9fff]",
                  )}
                  onMouseUp={() => {
                    saveSelection();
                    refreshFormat();
                    syncEmpty();
                  }}
                  onTouchEnd={() => {
                    saveSelection();
                    refreshFormat();
                    syncEmpty();
                  }}
                  onKeyUp={() => {
                    saveSelection();
                    refreshFormat();
                  }}
                  onInput={() => {
                    syncEmpty();
                    refreshFormat();
                  }}
                />
              </div>

              <div className="shrink-0 px-4 pb-4 pt-1 flex items-center gap-1 overflow-x-auto no-scrollbar touch-pan-x overscroll-x-contain">
                <button
                  type="button"
                  onClick={handleSend}
                  className="h-11 px-5 rounded-[12px] bg-[#0066ff] text-white font-semibold text-[15px] hover:bg-[#0052cc] transition-colors shrink-0"
                >
                  {sentFlash ? "Отправлено" : "Отправить"}
                </button>

                <ToolBtn
                  buttonRef={scheduleBtnRef}
                  title="Отправить позже"
                  pressed={popover === "schedule"}
                  onClick={() => togglePopover("schedule")}
                >
                  <Clock size={17} />
                </ToolBtn>
                <PortalMenu
                  open={popover === "schedule"}
                  anchor={scheduleBtnRef.current}
                  placement="top"
                  align="center"
                  onClose={closePopover}
                  className="w-56"
                >
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2.5 text-[13px] hover:bg-white/5 rounded-[10px]"
                    onClick={() => setPopover(null)}
                  >
                    <span className="text-white/85">Завтра</span>
                    <span className="text-white/35">{schedules.tomorrow}</span>
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2.5 text-[13px] hover:bg-white/5 rounded-[10px]"
                    onClick={() => setPopover(null)}
                  >
                    <span className="text-white/85">Через неделю</span>
                    <span className="text-white/35">{schedules.week}</span>
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left text-[13px] text-white/85 hover:bg-white/5 rounded-[10px]"
                    onClick={() => setPopover(null)}
                  >
                    Выбрать дату и время
                  </button>
                </PortalMenu>

                <ToolBtn
                  buttonRef={remindBtnRef}
                  title="Напоминания"
                  pressed={popover === "remind"}
                  onClick={() => togglePopover("remind")}
                >
                  <Bell size={17} />
                </ToolBtn>
                <PortalMenu
                  open={popover === "remind"}
                  anchor={remindBtnRef.current}
                  placement="top"
                  align="center"
                  onClose={closePopover}
                  className="w-72"
                >
                  <button
                    type="button"
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-white/5 rounded-[10px] text-left"
                    onClick={() => setRemindNoReply((v) => !v)}
                  >
                    <SoftCheck checked={remindNoReply} />
                    <span className="text-[13px] text-white/85">
                      Напомнить, если не будет ответа
                    </span>
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-white/5 rounded-[10px] text-left"
                    onClick={() => setNotifyDelivery((v) => !v)}
                  >
                    <SoftCheck checked={notifyDelivery} />
                    <span className="text-[13px] text-white/85">
                      Сообщить о доставке письма
                    </span>
                  </button>
                </PortalMenu>

                <ToolBtn
                  buttonRef={templateBtnRef}
                  title="Шаблон"
                  pressed={popover === "template"}
                  onClick={saveTemplate}
                >
                  <FileText size={17} />
                </ToolBtn>
                <PortalMenu
                  open={popover === "template"}
                  anchor={templateBtnRef.current}
                  placement="top"
                  align="center"
                  onClose={closePopover}
                  className="px-3.5 py-2.5"
                >
                  <span className="text-[13px] text-white/85 whitespace-nowrap">
                    {templateSaved ? "Шаблон сохранён" : "Сохранить как шаблон"}
                  </span>
                </PortalMenu>

                <ToolBtn
                  title="Вложение"
                  onClick={() => fileRef.current?.click()}
                >
                  <Paperclip size={17} />
                </ToolBtn>

                <ToolBtn
                  buttonRef={moreBtnRef}
                  title="Ещё"
                  pressed={popover === "more"}
                  onClick={() => togglePopover("more")}
                >
                  <MoreHorizontal size={17} />
                </ToolBtn>
                <PortalMenu
                  open={popover === "more"}
                  anchor={moreBtnRef.current}
                  placement="top"
                  align="right"
                  onClose={closePopover}
                  className="w-64"
                >
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-white/85 hover:bg-white/5 rounded-[10px]"
                    onClick={() => setPopover(null)}
                  >
                    <Tag size={15} className="text-white/40" />
                    Добавить метки
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-white/85 hover:bg-white/5 rounded-[10px]"
                    onClick={() => setPopover(null)}
                  >
                    <Pencil size={15} className="text-white/40" />
                    Выбрать подпись
                  </button>
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    <Wand2 size={15} className="text-white/40 shrink-0" />
                    <span className="flex-1 text-[13px] text-white/85">
                      Автодополнение
                    </span>
                    <Toggle on={autocomplete} onChange={setAutocomplete} />
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    <Sparkles size={15} className="text-white/40 shrink-0" />
                    <span className="flex-1 text-[13px] text-white/85">
                      Подсказка темы
                    </span>
                    <Toggle on={subjectHint} onChange={setSubjectHint} />
                  </div>
                </PortalMenu>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*,*/*"
                className="hidden"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files
                    .filter((f) => f.type.startsWith("image/"))
                    .forEach(insertImageFile);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {!maximized && !minimized && (
            <div
              onPointerDown={startResize}
              className="absolute right-1.5 bottom-1.5 h-4 w-4 cursor-se-resize rounded-sm opacity-40 hover:opacity-90"
              title="Изменить размер"
            >
              <span className="absolute right-0 bottom-0 h-2.5 w-2.5 border-r-2 border-b-2 border-white/50 rounded-br-[2px]" />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
