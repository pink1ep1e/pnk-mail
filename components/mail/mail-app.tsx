"use client";

import { idCabinetUrl, idLogoutThenLoginUrl, mailAuthAddAccountUrl, mailAuthStartUrl, PNK_ID_URL } from "@/lib/id-auth";
import { cn } from "@/lib/utils";
import {
  folders,
  initials,
  type FolderId,
  type MailMessage,
} from "@/lib/mail-data";
import {
  Archive,
  Check,
  Clock,
  FolderInput,
  Forward,
  Inbox,
  LayoutGrid,
  LogOut,
  Mail,
  MailOpen,
  Menu,
  Paperclip,
  Pencil,
  Plus,
  Reload,
  Reply,
  Search,
  Settings,
  ShieldAlert,
  Tag,
  Trash2,
  Users,
  X,
} from "@/lib/icons";
import ComposeEditor from "@/components/mail/compose-editor";
import { PullToRefresh } from "@/components/mail/pull-to-refresh";
import { SwipeMailRow } from "@/components/mail/swipe-mail-row";
import { AppSplash } from "@/components/shared/app-splash";
import { PushSubscribe } from "@/components/shared/push-subscribe";
import { MobileMailBanners } from "@/components/shared/mobile-mail-banners";
import { MailAttachmentsList } from "@/components/mail/mail-attachments-list";
import { extractAttachmentsFromHtml } from "@/lib/mail-attachments";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { haptic } from "@/lib/haptic";
import { prepareMailReaderSrcDoc, isBrandedHtmlEmail } from "@/lib/mail-template";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

const folderIcons: Partial<Record<FolderId, typeof Inbox>> = {
  all: LayoutGrid,
  inbox: Inbox,
  newsletters: Mail,
  social: Users,
  attachments: Paperclip,
  sent: Forward,
  archive: Archive,
  trash: Trash2,
  spam: ShieldAlert,
  drafts: Pencil,
};

type CustomFolder = { id: string; name: string };
type MailLabelItem = { id: string; name: string; color: string };

type MailAccount = {
  id: string;
  name: string;
  email: string;
  color: string;
  initial: string;
  avatarUrl?: string | null;
  active: boolean;
};

type FolderCounts = Partial<Record<string, { unread: number; total: number }>>;

const DRAWER_W = 280;
const DRAWER_EDGE = 52;

type MessageDetail = MailMessage & {
  bodyHtml?: string;
  bodyText?: string;
  to?: string;
  cc?: string;
  createdAt?: string;
};

function deliveryBadge(status?: string | null): {
  text: string;
  className: string;
} | null {
  if (!status) return null;
  switch (status) {
    case "delivered":
      return { text: "доставлено", className: "text-emerald-400/90" };
    case "sent":
    case "queued":
      return { text: "отправл.", className: "text-white/35" };
    case "delayed":
      return { text: "задержка", className: "text-amber-400/90" };
    case "bounced":
    case "failed":
    case "suppressed":
      return { text: "не доставлено", className: "text-red-400/90" };
    case "complained":
      return { text: "спам", className: "text-orange-400/90" };
    default:
      return null;
  }
}

function parseEmailsLoose(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/<([^>]+)>/);
      return (m ? m[1] : s).trim().toLowerCase();
    })
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}

/** Who should receive a reply (handles Sent folder correctly). */
function replyAddressFor(
  m: MessageDetail,
  myEmail: string,
): { to: string; cc: string } {
  const mine = myEmail.trim().toLowerCase();
  const from = (m.fromEmail || "").trim().toLowerCase();
  const toList = parseEmailsLoose(m.to);
  const weSent =
    m.folder === "sent" || (Boolean(mine) && from === mine);

  if (weSent) {
    const tos = toList.filter((a) => a !== mine);
    return {
      to: tos.join(", "),
      cc: "",
    };
  }

  // Incoming: reply to sender; if missing, fall back to To (rare)
  if (from && from !== mine) return { to: from, cc: "" };
  const fallback = toList.find((a) => a !== mine) || "";
  return { to: fallback, cc: "" };
}

function withAccountAvatar(account: MailAccount): MailAccount {
  if (account.avatarUrl) return account;
  return {
    ...account,
    avatarUrl: `${PNK_ID_URL}/api/public/avatar/${account.id}`,
  };
}

/** Prefer signed-in pnk-id photo when the sender is one of our accounts. */
function avatarForSender(
  fromEmail: string | null | undefined,
  fallback: string | null | undefined,
  accounts: MailAccount[],
): string | null | undefined {
  const key = (fromEmail || "").trim().toLowerCase();
  if (key) {
    const hit = accounts.find((a) => a.email.trim().toLowerCase() === key);
    if (hit?.avatarUrl) return hit.avatarUrl;
  }
  return fallback;
}

function AccountAvatar({
  account,
  size,
  className,
}: {
  account: Pick<
    MailAccount,
    "id" | "initial" | "color" | "avatarUrl" | "name"
  >;
  size: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [account.avatarUrl, account.id]);
  const showImg = Boolean(account.avatarUrl) && !broken;

  return (
    <div
      className={cn(
        "shrink-0 rounded-full overflow-hidden flex items-center justify-center text-white font-semibold font-[family-name:var(--font-manrope)]",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: showImg ? undefined : account.color,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={account.avatarUrl!}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        account.initial
      )}
    </div>
  );
}

function SenderAvatar({
  from,
  fromEmail,
  avatarColor,
  avatarUrl,
  size,
  className,
}: {
  from: string;
  fromEmail?: string | null;
  avatarColor: string;
  avatarUrl?: string | null;
  size: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [avatarUrl, fromEmail]);
  const showImg = Boolean(avatarUrl) && !broken;
  const isPersonPhoto = Boolean(
    avatarUrl &&
      (/\/api\/public\/avatar\//i.test(avatarUrl) ||
        /\b(googleusercontent|gravatar|avatar)\b/i.test(avatarUrl)),
  );

  return (
    <div
      className={cn(
        "shrink-0 rounded-full overflow-hidden flex items-center justify-center text-white font-semibold font-[family-name:var(--font-manrope)]",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: showImg
          ? isPersonPhoto
            ? undefined
            : "#ffffff"
          : avatarColor,
        fontSize: Math.round(size * 0.36),
      }}
      title={fromEmail || from}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl!}
          alt=""
          className={
            isPersonPhoto
              ? "h-full w-full object-cover"
              : "h-[70%] w-[70%] object-contain"
          }
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        initials(from || "?")
      )}
    </div>
  );
}

function MailBodyFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const branded = useMemo(() => isBrandedHtmlEmail(html || ""), [html]);
  const srcDoc = useMemo(() => prepareMailReaderSrcDoc(html), [html]);
  const [ready, setReady] = useState(false);
  const canvas = branded ? "#ffffff" : "#0c0d10";

  useEffect(() => {
    setReady(false);
    const iframe = ref.current;
    if (!iframe) return;

    let fitting = false;
    let lastH = 0;
    let lastW = 0;
    let readyOnce = false;
    const imgCleanups: Array<() => void> = [];

    const fit = (opts?: { force?: boolean }) => {
      const doc = iframe.contentDocument;
      const body = doc?.body;
      const root = doc?.documentElement;
      if (!doc || !body || !root) return;
      if (fitting) return;
      fitting = true;

      try {
        body.style.transform = "";
        body.style.transformOrigin = "";
        body.style.width = "";
        body.style.height = "";
        (root.style as CSSStyleDeclaration & { zoom?: string }).zoom = "";
        root.style.overflowX = "visible";
        body.style.overflowX = "visible";
        root.style.overflowY = "visible";
        body.style.overflowY = "visible";

        const frameW =
          iframe.clientWidth || wrapRef.current?.clientWidth || 0;
        if (!frameW) return;

        let contentW = Math.max(root.scrollWidth, body.scrollWidth);
        body.querySelectorAll("table, img, pre").forEach((el) => {
          contentW = Math.max(contentW, (el as HTMLElement).scrollWidth || 0);
        });

        let scale = 1;
        if (contentW > frameW + 2) {
          scale = Math.max(0.45, Math.min(1, (frameW - 2) / contentW));
        }

        const supportsZoom =
          typeof CSS !== "undefined" &&
          (CSS.supports?.("zoom", "0.5") || "zoom" in root.style);

        if (scale < 1 && supportsZoom) {
          (root.style as CSSStyleDeclaration & { zoom?: string }).zoom =
            String(scale);
        } else if (scale < 1) {
          body.style.transformOrigin = "top left";
          body.style.transform = `scale(${scale})`;
          body.style.width = `${100 / scale}%`;
        }

        const rawH = Math.max(
          root.scrollHeight,
          body.scrollHeight,
          body.offsetHeight,
          80,
        );
        let h =
          scale < 1 && !supportsZoom ? Math.ceil(rawH * scale) : Math.ceil(rawH);
        // Hard cap — prevents ResizeObserver feedback loops
        h = Math.min(h + 4, 8000);

        const widthChanged = Math.abs(frameW - lastW) >= 1;
        // After first paint: only grow (images), or recalculate on width change.
        // Avoid shrinking back to a tiny early measure.
        if (
          !opts?.force &&
          readyOnce &&
          !widthChanged &&
          h < lastH - 2
        ) {
          return;
        }
        if (Math.abs(h - lastH) < 2 && !widthChanged) return;

        lastH = h;
        lastW = frameW;
        iframe.style.height = `${h}px`;
      } finally {
        fitting = false;
      }
    };

    const bindImages = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      doc.querySelectorAll("img").forEach((img) => {
        if (img.complete) return;
        const onImg = () => {
          fit();
          requestAnimationFrame(() => fit());
        };
        img.addEventListener("load", onImg);
        img.addEventListener("error", onImg);
        imgCleanups.push(() => {
          img.removeEventListener("load", onImg);
          img.removeEventListener("error", onImg);
        });
      });
    };

    const onLoad = () => {
      fit({ force: true });
      bindImages();
      requestAnimationFrame(() => {
        fit({ force: true });
        bindImages();
        requestAnimationFrame(() => {
          fit({ force: true });
          if (!readyOnce) {
            readyOnce = true;
            setReady(true);
          }
        });
      });
    };

    iframe.addEventListener("load", onLoad);
    if (iframe.contentDocument?.readyState === "complete") onLoad();

    const timers = [50, 200, 500, 1200, 2500].map((ms) =>
      window.setTimeout(() => {
        fit();
        bindImages();
        if (!readyOnce && ms >= 500) {
          readyOnce = true;
          setReady(true);
        }
      }, ms),
    );

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect?.width ?? 0;
            if (Math.abs(w - lastW) < 1) return;
            fit({ force: true });
          })
        : null;
    if (wrapRef.current) ro?.observe(wrapRef.current);

    return () => {
      iframe.removeEventListener("load", onLoad);
      timers.forEach((t) => window.clearTimeout(t));
      imgCleanups.forEach((fn) => fn());
      ro?.disconnect();
    };
  }, [srcDoc]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative w-full overflow-x-hidden overflow-y-visible rounded-[16px] border mx-auto",
        branded
          ? "border-white/15 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
          : "border-white/8",
      )}
      style={{ backgroundColor: ready && branded ? "#ffffff" : "#0c0d10" }}
    >
      {!ready && (
        <div
          className="absolute inset-0 z-[1] flex items-center justify-center bg-[#0c0d10] min-h-[160px]"
          aria-hidden
        >
          <div className="h-7 w-7 rounded-full border-2 border-white/10 border-t-[#0066ff] animate-spin" />
        </div>
      )}
      <iframe
        ref={ref}
        title="Письмо"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        srcDoc={srcDoc}
        className="w-full border-0 block"
        style={{
          minHeight: 160,
          backgroundColor: canvas,
          colorScheme: branded ? "light" : "dark",
          opacity: ready ? 1 : 0,
          transition: "opacity 0.15s ease-out",
        }}
      />
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span
      className="inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-[#22c55e]"
      aria-label="Проверенный отправитель"
    >
      <Check size={9} strokeWidth={3.5} className="text-white" />
    </span>
  );
}

function Checkbox({
  checked,
  onChange,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={cn(
        "h-5 w-5 shrink-0 rounded-[6px] border-2 flex items-center justify-center transition-colors",
        checked
          ? "bg-[#0066ff] border-[#0066ff] text-white"
          : "bg-[#3a3e48] border-white/80 hover:border-[#4d9fff] hover:bg-[#454a56]",
      )}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </button>
  );
}

export default function MailApp() {
  const [bootReady, setBootReady] = useState(false);
  const [showApp, setShowApp] = useState(false);
  const [progress, setProgress] = useState(0);
  const [switching, setSwitching] = useState(false);
  const [folder, setFolder] = useState<string>("inbox");
  const [items, setItems] = useState<MailMessage[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerPulling, setDrawerPulling] = useState(false);
  const drawerX = useMotionValue(-DRAWER_W);
  const drawerBackdrop = useTransform(drawerX, [-DRAWER_W, 0], [0, 1]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [idOverlayUrl, setIdOverlayUrl] = useState<string | null>(null);
  const [idOverlayLoading, setIdOverlayLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [copied, setCopied] = useState<"header" | "profile" | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [counts, setCounts] = useState<FolderCounts>({});
  const [loadingMail, setLoadingMail] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MessageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [toast, setToast] = useState("");
  const [recipientsOpen, setRecipientsOpen] = useState(false);
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
  const [mailLabels, setMailLabels] = useState<MailLabelItem[]>([]);
  const [toolbarMenu, setToolbarMenu] = useState<"folder" | "label" | null>(
    null,
  );
  const [nameModal, setNameModal] = useState<"folder" | "label" | null>(null);
  const [nameModalValue, setNameModalValue] = useState("");
  const [nameModalBusy, setNameModalBusy] = useState(false);
  const [composeDraft, setComposeDraft] = useState<{
    id?: string | null;
    to?: string;
    cc?: string;
    subject?: string;
    bodyHtml?: string;
    replyToId?: string | null;
  } | null>(null);
  const detailCache = useRef<Map<string, { message: MessageDetail; thread: MessageDetail[] }>>(new Map());
  const openIdRef = useRef<string | null>(null);
  const folderReqId = useRef(0);
  const [thread, setThread] = useState<MessageDetail[]>([]);

  const loadMessages = async (
    folderId: string,
    search = "",
  ): Promise<boolean> => {
    const reqId = ++folderReqId.current;
    setLoadingMail(true);
    try {
      const u = new URL("/api/mail/messages", window.location.origin);
      u.searchParams.set("folder", folderId);
      if (search.trim()) u.searchParams.set("q", search.trim());
      const res = await fetch(u.toString(), { cache: "no-store" });
      const json = await res.json();
      // Ignore stale responses after a quick folder switch
      if (reqId !== folderReqId.current) return false;
      if (!json.ok) return false;
      setItems((json.data.messages as MailMessage[]) || []);
      setCounts((json.data.counts as FolderCounts) || {});
      if (Array.isArray(json.data.folders)) {
        setCustomFolders(json.data.folders as CustomFolder[]);
      }
      if (Array.isArray(json.data.labels)) {
        setMailLabels(json.data.labels as MailLabelItem[]);
      }
      detailCache.current.clear();
      return true;
    } catch {
      if (reqId !== folderReqId.current) return false;
      return false;
    } finally {
      if (reqId === folderReqId.current) setLoadingMail(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!json.ok || !json.data?.account) {
          window.location.href = mailAuthStartUrl("login");
          return;
        }

        const list = (json.data.accounts as MailAccount[] | undefined)?.length
          ? (json.data.accounts as MailAccount[])
          : [{ ...(json.data.account as MailAccount), active: true }];

        setAccounts(list.map(withAccountAvatar));
        // Session is enough to enter mail; a messages API blip must not bounce to login
        await loadMessages("inbox");
        if (cancelled) return;
        setBootReady(true);
      } catch {
        if (!cancelled) window.location.href = mailAuthStartUrl("login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Smooth progress while booting / switching
  useEffect(() => {
    if (showApp) return;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(40, now - last);
      last = now;
      setProgress((prev) => {
        if (bootReady) {
          const next = Math.min(100, prev + dt * 0.12);
          return next;
        }
        if (prev >= 88) return prev;
        const ease = (90 - prev) * 0.012;
        return Math.min(88, prev + Math.max(0.08, ease) * (dt / 16));
      });
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [bootReady, showApp]);

  useEffect(() => {
    if (!bootReady || progress < 100 || showApp) return;
    const t = window.setTimeout(() => setShowApp(true), 220);
    return () => window.clearTimeout(t);
  }, [bootReady, progress, showApp]);

  const activeAccount = accounts.find((a) => a.active) ?? accounts[0];

  const switchAccount = async (id: string) => {
    const target = accounts.find((a) => a.id === id);
    if (!target || target.active || switching) return;
    setSwitching(true);
    setProfileOpen(false);
    setShowApp(false);
    setBootReady(false);
    setProgress(0);
    try {
      const res = await fetch("/api/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: id }),
      });
      const json = await res.json();
      if (!json.ok) {
        window.location.href = idLogoutThenLoginUrl();
        return;
      }
      const list = (json.data.accounts as MailAccount[]) || [];
      setAccounts(list.map(withAccountAvatar));
      setSelected(new Set());
      setFolder("inbox");
      setOpenId(null);
      setDetail(null);
      setThread([]);
      await loadMessages("inbox");
      setBootReady(true);

      // Refresh avatars / names from ID for the newly active account
      try {
        const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
        const sessionJson = await sessionRes.json();
        if (sessionJson.ok && sessionJson.data?.accounts?.length) {
          setAccounts(
            (sessionJson.data.accounts as MailAccount[]).map(withAccountAvatar),
          );
        }
      } catch {
        /* keep switch list */
      }
    } catch {
      window.location.href = mailAuthStartUrl("login");
    } finally {
      setSwitching(false);
    }
  };

  const closeIdOverlay = () => {
    setIdOverlayUrl(null);
    setIdOverlayLoading(false);
    // Restore chrome after leaving ID sheet
    window.scrollTo(0, 0);
    document.body.style.overflow = "";
    syncAppViewport();
  };

  const openIdOverlayUrl = (url: string) => {
    setIdOverlayUrl(url);
    setIdOverlayLoading(false);
  };

  /** Fetch auth/manage URL and show in-app iframe (no Safari chrome). */
  const openAuthInOverlay = async (startPath: string) => {
    setIdOverlayLoading(true);
    try {
      const u = new URL(startPath, window.location.origin);
      u.searchParams.set("embed", "1");
      const res = await fetch(u.pathname + u.search, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (json?.ok && json.data?.url) {
        openIdOverlayUrl(String(json.data.url));
        return true;
      }
    } catch {
      /* fall through */
    } finally {
      setIdOverlayLoading(false);
    }
    return false;
  };

  const addAccount = () => {
    setProfileOpen(false);
    void (async () => {
      const ok = await openAuthInOverlay(mailAuthAddAccountUrl());
      if (!ok) window.location.href = mailAuthAddAccountUrl();
    })();
  };

  const manageAccount = () => {
    setProfileOpen(false);
    void (async () => {
      setIdOverlayLoading(true);
      try {
        const res = await fetch("/api/auth/manage?embed=1", {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (json?.ok && json.data?.url) {
          openIdOverlayUrl(String(json.data.url));
          return;
        }
        // Need login — open auth in the same overlay (no Safari chrome)
        setIdOverlayLoading(false);
        const loginPath =
          typeof json?.loginUrl === "string"
            ? json.loginUrl.replace(window.location.origin, "") ||
              mailAuthStartUrl("login")
            : mailAuthStartUrl("login");
        const ok = await openAuthInOverlay(loginPath);
        if (ok) return;
      } catch {
        /* fall through */
      } finally {
        setIdOverlayLoading(false);
      }
      // Last resort: full navigation (may leave PWA on iOS)
      window.location.href = idCabinetUrl();
    })();
  };

  const logoutAll = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    window.location.href = idLogoutThenLoginUrl();
  };

  /** Fix layout after Safari / bfcache return (safe-area + height collapse). */
  const syncAppViewport = () => {
    if (typeof window === "undefined") return;
    window.scrollTo(0, 0);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean(
        (window.navigator as Navigator & { standalone?: boolean }).standalone,
      );
    document.documentElement.classList.toggle("standalone", standalone);
    const h = Math.round(
      standalone
        ? window.innerHeight
        : (window.visualViewport?.height ?? window.innerHeight),
    );
    if (h > 0) {
      document.documentElement.style.setProperty("--app-height", `${h}px`);
    }
  };

  useEffect(() => {
    syncAppViewport();
    const onShow = () => {
      // iOS often restores a scrolled/collapsed layout after leaving to Safari
      requestAnimationFrame(() => {
        syncAppViewport();
        window.setTimeout(syncAppViewport, 50);
        window.setTimeout(syncAppViewport, 300);
      });
    };
    window.addEventListener("pageshow", onShow);
    window.addEventListener("focus", onShow);
    window.addEventListener("resize", syncAppViewport);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onShow();
    });
    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncAppViewport);
    return () => {
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("focus", onShow);
      window.removeEventListener("resize", syncAppViewport);
      vv?.removeEventListener("resize", syncAppViewport);
    };
  }, []);

  useEffect(() => {
    if (!idOverlayUrl && !idOverlayLoading) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [idOverlayUrl, idOverlayLoading]);

  useEffect(() => {
    if (!idOverlayUrl && !idOverlayLoading) return;
    const onMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || typeof data !== "object") return;
      if ((data as { type?: string }).type === "pnk-id-close") {
        closeIdOverlay();
        syncAppViewport();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // closeIdOverlay is stable enough for this overlay lifecycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idOverlayUrl, idOverlayLoading]);

  useEffect(() => {
    if (!profileOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  useEffect(() => {
    if (!nameModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !nameModalBusy) {
        setNameModal(null);
        setNameModalValue("");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [nameModal, nameModalBusy]);

  // Mobile: pull folder drawer with the finger from the left edge
  useEffect(() => {
    const isMobile = () => window.matchMedia("(max-width: 767px)").matches;
    let tracking = false;
    let startX = 0;
    let startY = 0;
    let locked: "h" | "v" | null = null;
    let openedByPull = false;

    const onTouchStart = (e: TouchEvent) => {
      if (!isMobile()) return;
      if (composeOpen || searchOpen) return;
      if (sidebarOpen) return;
      const t = e.touches[0];
      if (!t || t.clientX > DRAWER_EDGE) {
        tracking = false;
        return;
      }
      tracking = true;
      openedByPull = false;
      locked = null;
      startX = t.clientX;
      startY = t.clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (!locked) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        locked = Math.abs(dx) > Math.abs(dy) * 1.1 ? "h" : "v";
        if (locked === "h" && dx > 0) {
          document.documentElement.dataset.mailGesture = "1";
          setDrawerPulling(true);
          setSwipeOpenId(null);
          openedByPull = true;
        } else if (locked === "v") {
          tracking = false;
          return;
        }
      }
      if (locked !== "h") return;
      e.preventDefault();
      const next = Math.max(-DRAWER_W, Math.min(0, -DRAWER_W + dx));
      drawerX.set(next);
    };

    const onTouchEnd = () => {
      if (!tracking) return;
      tracking = false;
      const wasH = locked === "h";
      locked = null;
      delete document.documentElement.dataset.mailGesture;
      setDrawerPulling(false);
      if (!wasH || !openedByPull) return;
      const x = drawerX.get();
      const progress = (x + DRAWER_W) / DRAWER_W;
      if (progress > 0.35) {
        setSidebarOpen(true);
        void animate(drawerX, 0, {
          type: "spring",
          stiffness: 420,
          damping: 38,
        });
      } else {
        setSidebarOpen(false);
        void animate(drawerX, -DRAWER_W, {
          type: "spring",
          stiffness: 420,
          damping: 38,
        });
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
      delete document.documentElement.dataset.mailGesture;
    };
  }, [sidebarOpen, composeOpen, searchOpen, drawerX]);

  useEffect(() => {
    if (sidebarOpen) setSwipeOpenId(null);
  }, [sidebarOpen]);

  const openDrawer = () => {
    setSwipeOpenId(null);
    setSidebarOpen(true);
    void animate(drawerX, 0, {
      type: "spring",
      stiffness: 420,
      damping: 38,
    });
  };

  const closeDrawer = () => {
    setSidebarOpen(false);
    void animate(drawerX, -DRAWER_W, {
      type: "spring",
      stiffness: 420,
      damping: 38,
    });
  };

  // Lock background scroll while folder drawer or account menu is open
  useEffect(() => {
    const locked = sidebarOpen || profileOpen || drawerPulling;
    if (!locked) return;

    const body = document.body;
    const prevBodyOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const scrollers = Array.from(
      document.querySelectorAll<HTMLElement>(".mail-scroll"),
    );
    const prevScroll: { el: HTMLElement; overflowY: string; touchAction: string }[] =
      scrollers.map((el) => {
        const overflowY = el.style.overflowY;
        const touchAction = el.style.touchAction;
        el.style.overflowY = "hidden";
        el.style.touchAction = "none";
        return { el, overflowY, touchAction };
      });

    const onTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest(
          "[data-mail-drawer], [data-account-menu], [data-account-trigger]",
        )
      ) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      body.style.overflow = prevBodyOverflow;
      for (const { el, overflowY, touchAction } of prevScroll) {
        el.style.overflowY = overflowY;
        el.style.touchAction = touchAction;
      }
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, [sidebarOpen, profileOpen, drawerPulling]);

  // Haptic tap feedback on interactive controls (phones)
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
      if (document.documentElement.dataset.mailGesture === "1") return;
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (
        el.closest(
          'button, a, [role="checkbox"], [role="switch"], [role="menuitem"], [role="option"], label[for]',
        )
      ) {
        haptic("selection");
      }
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const onSidebarDragEnd = (_: unknown, info: PanInfo) => {
    delete document.documentElement.dataset.mailGesture;
    const x = drawerX.get();
    if (x < -DRAWER_W * 0.45 || info.velocity.x < -400) {
      closeDrawer();
    } else {
      setSidebarOpen(true);
      void animate(drawerX, 0, {
        type: "spring",
        stiffness: 420,
        damping: 38,
      });
    }
  };

  const countsMemo = useMemo(() => {
    const base = { ...counts };
    const inbox = counts.inbox?.unread ?? 0;
    const news = counts.newsletters?.unread ?? 0;
    const social = counts.social?.unread ?? 0;
    const totalUnread =
      Object.entries(counts).reduce((sum, [key, v]) => {
        if (key === "trash" || key === "spam" || key === "sent" || key === "drafts")
          return sum;
        return sum + (v?.unread ?? 0);
      }, 0) || inbox + news + social;
    const totalAll = Object.entries(counts).reduce((sum, [key, v]) => {
      if (key === "trash" || key === "attachments" || key === "drafts")
        return sum;
      return sum + (v?.total ?? 0);
    }, 0);
    base.all = { unread: totalUnread, total: totalAll };
    return base;
  }, [counts]);

  const visible = useMemo(() => items, [items]);

  const copyEmail = async (source: "header" | "profile") => {
    try {
      await navigator.clipboard.writeText(activeAccount.email);
      setCopied(source);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // ignore
    }
  };

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items.filter(
      (m) =>
        m.from.toLowerCase().includes(q) ||
        m.fromEmail.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.preview.toLowerCase().includes(q),
    );
  }, [items, query]);

  const targetIds = useMemo(() => {
    if (selected.size > 0) return [...selected];
    if (openId) {
      if (thread.length > 1) {
        return [...new Set(thread.map((m) => m.id))];
      }
      return [openId];
    }
    return [] as string[];
  }, [selected, openId, thread]);
  const hasTargets = targetIds.length > 0;
  const allSelected =
    visible.length > 0 && visible.every((m) => selected.has(m.id));

  const clearSelection = () => setSelected(new Set());

  const toggleAll = () => {
    if (allSelected) clearSelection();
    else setSelected(new Set(visible.map((m) => m.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2200);
  };

  const patchMessages = async (
    ids: string[],
    action:
      | "read"
      | "unread"
      | "trash"
      | "restore"
      | "spam"
      | "archive"
      | "move"
      | "label"
      | "unlabel"
      | "remind"
      | "delete",
    extra?: { folder?: string; labelId?: string },
  ) => {
    const idSet = new Set(ids);
    const threadKeys = new Set(
      items
        .filter((m) => idSet.has(m.id))
        .map((m) => m.threadId || m.id)
        .filter(Boolean),
    );
    const matchesTarget = (m: MailMessage) =>
      idSet.has(m.id) ||
      (m.threadId ? threadKeys.has(m.threadId) : false) ||
      threadKeys.has(m.id);

    if (action === "read" || action === "unread") {
      const unread = action === "unread";
      setItems((prev) =>
        prev.map((m) => (matchesTarget(m) ? { ...m, unread } : m)),
      );
    } else if (
      action === "trash" ||
      action === "spam" ||
      action === "archive" ||
      action === "move" ||
      action === "restore" ||
      action === "delete"
    ) {
      setItems((prev) => prev.filter((m) => !matchesTarget(m)));
      for (const id of ids) detailCache.current.delete(id);
      const openGone =
        openId &&
        (idSet.has(openId) ||
          (detail?.threadId
            ? threadKeys.has(detail.threadId)
            : threadKeys.has(openId)));
      if (openGone) {
        setOpenId(null);
        openIdRef.current = null;
        setDetail(null);
        setThread([]);
      }
    }

    const res = await fetch("/api/mail/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action, expandThread: true, ...extra }),
    });
    const json = await res.json();
    if (!json.ok) {
      void loadMessages(folder);
      return false;
    }
    if (
      action === "trash" ||
      action === "spam" ||
      action === "archive" ||
      action === "move" ||
      action === "restore" ||
      action === "delete" ||
      action === "label" ||
      action === "unlabel" ||
      action === "read" ||
      action === "unread"
    ) {
      void loadMessages(folder);
    }
    return true;
  };

  const markUnread = (unread: boolean) => {
    if (!hasTargets) return;
    void patchMessages(targetIds, unread ? "unread" : "read").then(() =>
      clearSelection(),
    );
  };

  const moveSelected = (action: "trash" | "spam" | "archive" | "restore" | "delete") => {
    if (!hasTargets) return;
    const ids = [...targetIds];
    void patchMessages(ids, action).then((ok) => {
      clearSelection();
      setToolbarMenu(null);
      if (ok) {
        const msg =
          action === "trash"
            ? "Перемещено в удалённые"
            : action === "spam"
              ? "Помечено как спам"
              : action === "archive"
                ? "В архиве"
                : action === "restore"
                  ? "Восстановлено"
                  : "Удалено навсегда";
        showToast(msg);
      }
      if (openId && ids.includes(openId)) {
        setOpenId(null);
        openIdRef.current = null;
        setDetail(null);
        setThread([]);
      }
    });
  };

  const moveToTrash = () => {
    if (folder === "trash") moveSelected("delete");
    else moveSelected("trash");
  };

  const moveToFolder = (folderId: string) => {
    if (!hasTargets) return;
    const ids = [...targetIds];
    void patchMessages(ids, "move", { folder: folderId }).then((ok) => {
      clearSelection();
      setToolbarMenu(null);
      if (ok) showToast("Перемещено");
      if (openId && ids.includes(openId)) {
        setOpenId(null);
        openIdRef.current = null;
        setDetail(null);
        setThread([]);
      }
    });
  };

  const applyLabel = (labelId: string) => {
    if (!hasTargets) return;
    void patchMessages([...targetIds], "label", { labelId }).then((ok) => {
      clearSelection();
      setToolbarMenu(null);
      if (ok) showToast("Метка добавлена");
    });
  };

  const remindSelected = () => {
    if (!hasTargets) return;
    void patchMessages([...targetIds], "remind").then((ok) => {
      clearSelection();
      if (ok) showToast("Напоминание на завтра");
    });
  };

  const openComposeFromMessage = async (
    id: string,
    mode: "reply" | "forward",
  ) => {
    const res = await fetch(`/api/mail/messages/${id}`, { cache: "no-store" });
    const json = await res.json();
    if (!json.ok || !json.data?.message) return;
    const m = json.data.message as MessageDetail;
    const myEmail = activeAccount?.email || "";
    if (mode === "reply") {
      const apiThread = Array.isArray(json.data.thread)
        ? (json.data.thread as MessageDetail[])
        : [];
      const replySource =
        (thread.length > 0 ? thread[thread.length - 1] : null) ||
        (apiThread.length > 0 ? apiThread[apiThread.length - 1] : null) ||
        m;
      const addr = replyAddressFor(replySource, myEmail);
      if (!addr.to) {
        showToast("Не найден адрес для ответа");
        return;
      }
      const subj = replySource.subject || m.subject || "";
      setComposeDraft({
        id: null,
        to: addr.to,
        cc: addr.cc,
        subject: /^re:/i.test(subj) ? subj : `Re: ${subj}`,
        bodyHtml: `<p><br/></p>`,
        replyToId: replySource.id || m.id,
      });
    } else {
      const subj = m.subject || "";
      setComposeDraft({
        id: null,
        to: "",
        cc: "",
        subject: /^fwd:/i.test(subj) ? subj : `Fwd: ${subj}`,
        bodyHtml: `<p><br/></p><hr/><p><strong>Пересылаемое сообщение</strong></p><p>От: ${m.from} &lt;${m.fromEmail}&gt;</p>${m.bodyHtml || ""}`,
      });
    }
    setComposeOpen(true);
    clearSelection();
    setToolbarMenu(null);
  };

  const replySelected = () => {
    if (!hasTargets) return;
    void openComposeFromMessage(targetIds[0], "reply");
  };

  const replyMessage = (id: string) => {
    setSwipeOpenId(null);
    void openComposeFromMessage(id, "reply");
  };

  const trashMessage = (id: string) => {
    setSwipeOpenId(null);
    const action = folder === "trash" ? "delete" : "trash";
    void patchMessages([id], action).then((ok) => {
      if (ok) {
        showToast(
          action === "delete" ? "Удалено навсегда" : "Перемещено в удалённые",
        );
      }
      if (openId === id) {
        setOpenId(null);
        openIdRef.current = null;
        setDetail(null);
        setThread([]);
      }
    });
  };

  const forwardSelected = () => {
    if (!hasTargets) return;
    void openComposeFromMessage(targetIds[0], "forward");
  };

  const openNameModal = (kind: "folder" | "label") => {
    setNameModalValue("");
    setNameModal(kind);
    setToolbarMenu(null);
    closeDrawer();
  };

  const submitNameModal = async () => {
    const name = nameModalValue.trim();
    if (!name || !nameModal || nameModalBusy) return;
    setNameModalBusy(true);
    try {
      const endpoint =
        nameModal === "folder" ? "/api/mail/folders" : "/api/mail/labels";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!json.ok) {
        showToast(
          json.error?.message ||
            (nameModal === "folder"
              ? "Не удалось создать папку"
              : "Не удалось создать метку"),
        );
        return;
      }
      haptic("success");
      if (nameModal === "folder") {
        setCustomFolders((prev) => [...prev, json.data.folder as CustomFolder]);
        showToast("Папка создана");
      } else {
        setMailLabels((prev) => [...prev, json.data.label as MailLabelItem]);
        showToast("Метка создана");
      }
      setNameModal(null);
      setNameModalValue("");
    } finally {
      setNameModalBusy(false);
    }
  };

  const saveDraft = async (payload: {
    id?: string | null;
    to: string;
    cc: string;
    subject: string;
    bodyHtml: string;
  }) => {
    const res = await fetch("/api/mail/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.ok) return null;
    if (json.data?.discarded) {
      if (folder === "drafts") void loadMessages("drafts");
      return null;
    }
    if (folder === "drafts") void loadMessages("drafts");
    else {
      setCounts((prev) => ({
        ...prev,
        drafts: {
          total: (prev.drafts?.total || 0) + (payload.id ? 0 : 1),
          unread: prev.drafts?.unread || 0,
        },
      }));
    }
    showToast("Черновик сохранён");
    return (json.data?.id as string) || null;
  };

  const openMessage = async (id: string) => {
    const fromList = items.find((m) => m.id === id);
    if (fromList?.folder === "drafts" || folder === "drafts") {
      const res = await fetch(`/api/mail/messages/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!json.ok || !json.data?.message) return;
      const m = json.data.message as MessageDetail;
      setComposeDraft({
        id: m.id,
        to: m.to || "",
        cc: m.cc || "",
        subject: m.subject || "",
        bodyHtml: m.bodyHtml || "",
      });
      setComposeOpen(true);
      return;
    }

    if (openIdRef.current === id && detail?.id === id && !detailLoading) return;

    const cached = detailCache.current.get(id);

    openIdRef.current = id;
    setOpenId(id);
    setRecipientsOpen(false);
    setItems((prev) =>
      prev.map((m) =>
        m.id === id || (m.threadId && fromList?.threadId && m.threadId === fromList.threadId)
          ? { ...m, unread: false }
          : m,
      ),
    );

    if (cached?.message?.bodyHtml) {
      setDetail({ ...cached.message, unread: false });
      setThread(
        (cached.thread?.length ? cached.thread : [cached.message]).map((m) => ({
          ...m,
          unread: false,
        })),
      );
      setDetailLoading(false);
      // Always persist read for the whole conversation (expandThread on API)
      void patchMessages([id], "read");
      return;
    }

    if (fromList) {
      setDetail({
        ...fromList,
        unread: false,
        bodyHtml: undefined,
        to: activeAccount?.email,
      });
      setThread([{ ...fromList, unread: false, bodyHtml: undefined }]);
    } else {
      setDetail(null);
      setThread([]);
    }
    setDetailLoading(true);

    try {
      const res = await fetch(`/api/mail/messages/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (openIdRef.current !== id) return;
      if (json.ok && json.data?.message) {
        const msg = {
          ...(json.data.message as MessageDetail),
          unread: false,
        };
        const threadMsgs = Array.isArray(json.data.thread)
          ? (json.data.thread as MessageDetail[]).map((m) => ({
              ...m,
              unread: false,
            }))
          : [msg];
        detailCache.current.set(id, { message: msg, thread: threadMsgs });
        setDetail(msg);
        setThread(threadMsgs);
        // Propagate richer logos into the list (from HTML / backfill)
        const logoByEmail = new Map<string, string>();
        for (const m of threadMsgs) {
          if (m.avatarUrl && m.fromEmail) {
            logoByEmail.set(m.fromEmail.toLowerCase(), m.avatarUrl);
          }
        }
        if (logoByEmail.size) {
          setItems((prev) =>
            prev.map((m) => {
              const url = logoByEmail.get((m.fromEmail || "").toLowerCase());
              return url && url !== m.avatarUrl ? { ...m, avatarUrl: url } : m;
            }),
          );
        }
      }
    } catch {
      /* ignore */
    } finally {
      if (openIdRef.current === id) setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!bootReady || !showApp) return;
    try {
      const id = new URLSearchParams(window.location.search).get("open");
      if (!id) return;
      void openMessage(id);
      const u = new URL(window.location.href);
      u.searchParams.delete("open");
      window.history.replaceState({}, "", `${u.pathname}${u.search}${u.hash}`);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once after boot
  }, [bootReady, showApp]);

  const prefetchMessage = (id: string) => {
    if (detailCache.current.has(id)) return;
    void fetch(`/api/mail/messages/${id}?read=0`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json.ok && json.data?.message) {
          const msg = json.data.message as MessageDetail;
          const threadMsgs = Array.isArray(json.data.thread)
            ? (json.data.thread as MessageDetail[])
            : [msg];
          detailCache.current.set(id, { message: msg, thread: threadMsgs });
        }
      })
      .catch(() => undefined);
  };

  const selectFolder = (id: string) => {
    setFolder(id);
    clearSelection();
    closeDrawer();
    setSwipeOpenId(null);
    setOpenId(null);
    openIdRef.current = null;
    setDetail(null);
    setThread([]);
    setDetailLoading(false);
    setItems([]); // don't flash previous folder while loading
    void loadMessages(id);
  };

  const mainFolders = folders.filter((f) => f.section === "main");
  const systemFolders = folders.filter((f) => f.section === "system");

  const ToolbarBtn = ({
    icon: Icon,
    label,
    onClick,
    danger,
  }: {
    icon: typeof Forward;
    label: string;
    onClick?: () => void;
    danger?: boolean;
  }) => (
    <button
      type="button"
      disabled={!hasTargets}
      onClick={onClick}
      className={cn(
        "h-9 px-2 rounded-[10px] inline-flex items-center gap-1.5 text-[13px] font-[family-name:var(--font-manrope)] shrink-0 transition-colors",
        !hasTargets
          ? "text-white/25 cursor-default"
          : danger
            ? "text-white/55 hover:bg-white/5 hover:text-red-400"
            : "text-white/55 hover:bg-white/5 hover:text-white",
      )}
    >
      <Icon size={15} />
      <span className="hidden xl:inline">{label}</span>
    </button>
  );

  const FolderBtn = ({
    id,
    label,
  }: {
    id: string;
    label: string;
  }) => {
    const Icon = folderIcons[id as FolderId] ?? Mail;
    const c = countsMemo[id];
    const active = folder === id;
    return (
      <button
        type="button"
        onClick={() => selectFolder(id)}
        className={cn(
          "w-full flex items-center gap-2.5 rounded-[12px] px-3 h-[38px] text-[14px] font-[family-name:var(--font-manrope)] transition-colors",
          active
            ? "bg-[#24262e] text-white font-semibold"
            : "text-white/55 hover:bg-white/[0.04] hover:text-white/85",
        )}
      >
        <Icon size={16} className="shrink-0 opacity-80" />
        <span className="flex-1 text-left truncate">{label}</span>
        {c && c.total > 0 && (
          <span className="text-[12px] tabular-nums text-white/35 inline-flex items-center gap-1.5">
            {c.unread > 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-[#0066ff]" />
            )}
            {c.unread > 0 ? `${c.unread} / ${c.total}` : c.total}
          </span>
        )}
      </button>
    );
  };

  if (!showApp || !activeAccount) {
    return <AppSplash progress={progress} />;
  }

  const Sidebar = (
    <aside className="flex h-full w-[240px] shrink-0 flex-col bg-[#1a1c22] text-white rounded-[20px] overflow-hidden">
      <div className="flex items-center gap-1 px-3 pt-3 pb-2">
        <span className="flex-1 font-[family-name:var(--font-unbounded)] font-bold text-[17px] px-1">
          Почта
        </span>
        <button
          type="button"
          className="h-8 w-8 rounded-full flex items-center justify-center text-white/45 hover:bg-white/5 hover:text-white"
          onClick={() => setSearchOpen(true)}
          aria-label="Поиск"
        >
          <Search size={16} />
        </button>
        <button
          type="button"
          className="h-8 w-8 rounded-full flex items-center justify-center text-white/45 hover:bg-white/5 hover:text-white disabled:opacity-40"
          aria-label="Обновить"
          title="Обновить"
          disabled={loadingMail}
          onClick={() => {
            void loadMessages(folder);
            clearSelection();
          }}
        >
          <Reload
            size={15}
            strokeWidth={2}
            className={loadingMail ? "animate-spin text-[#4d9fff]" : undefined}
          />
        </button>
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={() => {
            setComposeDraft(null);
            setComposeOpen(true);
            closeDrawer();
          }}
          className="w-full h-11 rounded-full bg-[#0066ff] text-white font-[family-name:var(--font-manrope)] font-semibold text-[15px] inline-flex items-center justify-center gap-2 hover:bg-[#0052cc] transition-colors"
        >
          <Image
            src="/send.svg"
            alt=""
            width={20}
            height={20}
            className="shrink-0"
          />
          Написать
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto mail-scroll px-2 no-scrollbar">
        <div className="space-y-0.5">
          {mainFolders.map((f) => (
            <FolderBtn key={f.id} id={f.id} label={f.label} />
          ))}
        </div>

        <div className="mt-3 px-3 flex items-center justify-between text-[13px] text-white/35 font-[family-name:var(--font-manrope)]">
          <span>Мои папки</span>
          <button
            type="button"
            onClick={() => openNameModal("folder")}
            className="h-6 w-6 rounded-md hover:bg-white/5 flex items-center justify-center"
            aria-label="Добавить папку"
          >
            <Plus size={14} />
          </button>
        </div>

        {customFolders.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {customFolders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => selectFolder(f.id as FolderId)}
                className={cn(
                  "w-full h-9 rounded-[10px] px-3 text-left text-[13px] font-[family-name:var(--font-manrope)] inline-flex items-center gap-2",
                  folder === f.id
                    ? "bg-white/10 text-white"
                    : "text-white/55 hover:bg-white/5 hover:text-white/80",
                )}
              >
                <FolderInput size={15} className="shrink-0 opacity-70" />
                <span className="truncate flex-1">{f.name}</span>
                {(counts[f.id]?.total || 0) > 0 && (
                  <span className="text-white/30 tabular-nums">
                    {counts[f.id]?.total}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="mt-1 space-y-0.5">
          {systemFolders.map((f) => (
            <FolderBtn key={f.id} id={f.id} label={f.label} />
          ))}
        </div>

        {mailLabels.length > 0 && (
          <div className="mt-3 px-3 space-y-0.5">
            <p className="text-[13px] text-white/35 mb-1">Метки</p>
            {mailLabels.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setFolder("all");
                  setOpenId(null);
                  openIdRef.current = null;
                  setItems([]);
                  const reqId = ++folderReqId.current;
                  void (async () => {
                    setLoadingMail(true);
                    try {
                      const u = new URL(
                        "/api/mail/messages",
                        window.location.origin,
                      );
                      u.searchParams.set("folder", "all");
                      u.searchParams.set("label", l.id);
                      const res = await fetch(u.toString(), {
                        cache: "no-store",
                      });
                      const json = await res.json();
                      if (reqId !== folderReqId.current) return;
                      if (json.ok) {
                        setItems((json.data.messages as MailMessage[]) || []);
                        closeDrawer();
                      }
                    } finally {
                      if (reqId === folderReqId.current) setLoadingMail(false);
                    }
                  })();
                }}
                className="w-full h-8 rounded-[10px] px-2 text-left text-[13px] text-white/55 hover:bg-white/5 hover:text-white/80 inline-flex items-center gap-2"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: l.color }}
                />
                <span className="truncate">{l.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 px-1 space-y-0.5 pb-3">
          <button
            type="button"
            onClick={() => openNameModal("label")}
            className="w-full h-9 rounded-[10px] px-3 text-left text-[13px] text-white/40 font-[family-name:var(--font-manrope)] hover:bg-white/5 hover:text-white/70 inline-flex items-center gap-2"
          >
            <Plus size={14} />
            Добавить метку
          </button>
        </div>
      </nav>

      <div className="px-4 py-3 border-t border-white/5 text-[11px] text-white/30 font-[family-name:var(--font-manrope)] space-y-1">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <Link href="/install" className="hover:text-white/55">
            Приложение
          </Link>
          <Link href="/help" className="hover:text-white/55">
            Помощь
          </Link>
        </div>
        <p>© {new Date().getFullYear()} pnk почта</p>
      </div>
    </aside>
  );

  return (
    <div className="mail-app-shell w-full max-w-[100vw] bg-[#0c0d10] text-white flex flex-col overflow-hidden overscroll-none touch-pan-y">
      {/* Site header strip — buttons from landing header */}
      <header className="shrink-0 z-30 border-b border-white/5 bg-[#0c0d10]">
        <div className="h-14 md:h-16 px-3 md:px-5 flex items-center gap-2 md:gap-4">
          <button
            type="button"
            className="md:hidden h-9 w-9 rounded-[10px] flex items-center justify-center text-white/60 hover:bg-white/5"
            onClick={() => openDrawer()}
            aria-label="Меню"
          >
            <Menu size={20} />
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="shrink-0 inline-flex items-center"
            aria-label="Обновить страницу"
          >
            <Image
              src="/logo-blue-text.svg"
              alt="pnk почта"
              width={200}
              height={106}
              priority
              className="h-10 md:h-12 w-auto select-none object-contain"
            />
          </button>

          <div className="ml-auto flex items-center gap-2 md:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 h-10 min-w-[180px] md:min-w-[240px] max-w-[320px] flex-1 rounded-[12px] bg-[#1a1c22] border border-white/8 px-3 text-left hover:border-white/15 transition-colors"
            >
              <Search size={16} className="text-white/35 shrink-0" />
              <span className="text-[14px] text-white/35 font-[family-name:var(--font-manrope)] truncate">
                Поиск в почте
              </span>
            </button>
            <button
              type="button"
              className="sm:hidden h-9 w-9 rounded-[10px] flex items-center justify-center text-white/70 hover:bg-white/5"
              aria-label="Поиск"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={18} />
            </button>

            <button
              type="button"
              onClick={() => copyEmail("header")}
              title="Скопировать адрес"
              className="relative hidden md:inline-flex items-center gap-1.5 h-9 px-2 rounded-[10px] text-[14px] text-white/70 font-[family-name:var(--font-manrope)] truncate max-w-[200px] hover:bg-white/5 hover:text-white transition-colors"
            >
              <span className="truncate">{activeAccount.email}</span>
              {copied === "header" && (
                <span
                  role="status"
                  className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+6px)] z-50 whitespace-nowrap rounded-[10px] bg-[#2a2d36] border border-white/10 px-2.5 py-1.5 text-[12px] text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] pointer-events-none"
                >
                  Скопировано
                </span>
              )}
            </button>

            <div className="relative" ref={profileRef}>
              <button
                type="button"
                data-account-trigger
                onClick={() => setProfileOpen((v) => !v)}
                className="rounded-full ring-2 ring-transparent hover:ring-white/20 transition overflow-hidden"
                aria-label="Аккаунт"
                aria-expanded={profileOpen}
              >
                <AccountAvatar account={activeAccount} size={40} />
              </button>

              <button
                type="button"
                aria-label="Закрыть меню аккаунта"
                aria-hidden={!profileOpen}
                tabIndex={profileOpen ? 0 : -1}
                className={cn(
                  "fixed inset-0 z-40 bg-black/50 transition-opacity duration-150 ease-out",
                  profileOpen
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none",
                )}
                onClick={() => setProfileOpen(false)}
              />

              <AnimatePresence>
                {profileOpen && (
                    <motion.div
                      key="account-menu"
                      data-account-menu
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -3, scale: 0.99 }}
                      transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                      style={{ transformOrigin: "calc(100% - 16px) 0%" }}
                      className="absolute right-0 top-[calc(100%+10px)] w-[min(calc(100vw-32px),340px)] rounded-[22px] bg-[#22252e] border border-white/22 shadow-[0_16px_48px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.06)] p-3 z-50"
                    >
                      <div className="rounded-[14px] bg-[#17191f] border border-white/10 overflow-hidden mb-2">
                        <div className="flex items-center gap-3 px-3 py-3">
                          <AccountAvatar account={activeAccount} size={52} />
                          <div className="min-w-0 flex-1">
                            <p className="font-[family-name:var(--font-manrope)] font-semibold text-[16px] truncate">
                              {activeAccount.name}
                            </p>
                            <button
                              type="button"
                              onClick={() => copyEmail("profile")}
                              title="Скопировать адрес"
                              className="relative text-[13px] text-white/50 font-[family-name:var(--font-manrope)] truncate hover:text-white/80 transition-colors text-left max-w-full"
                            >
                              <span className="truncate block">
                                {activeAccount.email}
                              </span>
                              {copied === "profile" && (
                                <span
                                  role="status"
                                  className="absolute left-0 top-[calc(100%+6px)] z-50 whitespace-nowrap rounded-[10px] bg-[#2a2d36] border border-white/10 px-2.5 py-1.5 text-[12px] text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] pointer-events-none"
                                >
                                  Скопировано
                                </span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[14px] bg-[#17191f] border border-white/10 overflow-hidden mb-2.5">
                        {accounts
                          .filter((a) => !a.active)
                          .map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => void switchAccount(a.id)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.05] transition-colors text-left"
                            >
                              <AccountAvatar account={a} size={36} />
                              <div className="min-w-0">
                                <p className="text-[14px] font-medium font-[family-name:var(--font-manrope)] truncate">
                                  {a.name}
                                </p>
                                <p className="text-[12px] text-white/40 font-[family-name:var(--font-manrope)] truncate">
                                  {a.email}
                                </p>
                              </div>
                            </button>
                          ))}
                        <button
                          type="button"
                          onClick={addAccount}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.05] transition-colors text-left"
                        >
                          <div className="h-9 w-9 rounded-full bg-[#2a2d36] flex items-center justify-center text-white/70">
                            <Plus size={16} />
                          </div>
                          <span className="text-[14px] font-[family-name:var(--font-manrope)]">
                            Добавить аккаунт
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void logoutAll()}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.05] transition-colors text-left"
                        >
                          <div className="h-9 w-9 rounded-full bg-[#2a2d36] flex items-center justify-center text-white/70">
                            <LogOut size={16} />
                          </div>
                          <span className="text-[14px] font-[family-name:var(--font-manrope)]">
                            Выйти из всех аккаунтов
                          </span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={manageAccount}
                        className="w-full h-11 rounded-full bg-[#17191f] border border-white/12 hover:bg-[#1c1f27] transition-colors px-4 inline-flex items-center gap-3 text-[14px] font-[family-name:var(--font-manrope)]"
                      >
                        <Settings size={16} className="text-white/55" />
                        Управление аккаунтом
                      </button>

                      <div className="mt-3 pt-2 flex items-center justify-center gap-2 text-[12px] text-white/35 font-[family-name:var(--font-manrope)]">
                        <Link href="/help" className="hover:text-white/55">
                          Справка
                        </Link>
                        <span>·</span>
                        <Link href="/legal/terms" className="hover:text-white/55">
                          Условия
                        </Link>
                      </div>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Search overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 bg-black/60 backdrop-blur-sm"
          style={{ paddingTop: "calc(4rem + var(--safe-top))" }}
        >
          <div
            className="w-full max-w-[640px] rounded-[16px] bg-[#1a1c22] border border-white/10 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative p-3 pb-2">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35"
                />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск в почте"
                  className="w-full h-12 rounded-[12px] bg-[#0f1115] pl-10 pr-12 text-[15px] font-[family-name:var(--font-manrope)] text-white outline-none focus:outline focus:outline-2 focus:outline-[#0066ff] placeholder:text-white/30"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center text-white/40 hover:text-white"
                  onClick={() => {
                    if (query) setQuery("");
                    else {
                      setSearchOpen(false);
                      setQuery("");
                    }
                  }}
                  aria-label={query ? "Очистить" : "Закрыть"}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="max-h-[min(60vh,420px)] overflow-y-auto border-t border-white/5">
              {!query.trim() ? (
                <p className="px-4 py-8 text-center text-[14px] text-white/35 font-[family-name:var(--font-manrope)]">
                  Начните вводить имя, тему или текст письма
                </p>
              ) : searchResults.length === 0 ? (
                <p className="px-4 py-8 text-center text-[14px] text-white/35 font-[family-name:var(--font-manrope)]">
                  Ничего не найдено по запросу «{query.trim()}»
                </p>
              ) : (
                <ul className="py-1">
                  {searchResults.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 text-left transition-colors"
                        onClick={() => {
                          openMessage(m.id);
                          selectFolder(m.folder);
                          setSearchOpen(false);
                          setQuery("");
                        }}
                      >
                        <SenderAvatar
                          from={m.from}
                          fromEmail={m.fromEmail}
                          avatarColor={m.avatarColor}
                          avatarUrl={avatarForSender(
                            m.fromEmail,
                            m.avatarUrl,
                            accounts,
                          )}
                          size={36}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold font-[family-name:var(--font-manrope)] truncate">
                              {m.from}
                            </span>
                            {m.unread && (
                              <span className="h-[16px] px-1.5 rounded-[5px] bg-[#0066ff] text-[9px] font-semibold shrink-0">
                                новое
                              </span>
                            )}
                            <span className="ml-auto text-[12px] text-white/30 tabular-nums shrink-0">
                              {m.time}
                            </span>
                          </div>
                          <p className="text-[13px] text-white/55 font-[family-name:var(--font-manrope)] truncate">
                            {m.subject}
                          </p>
                          <p className="text-[12px] text-white/30 font-[family-name:var(--font-manrope)] truncate">
                            {m.preview}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <button
            type="button"
            className="absolute inset-0 -z-10"
            aria-label="Закрыть"
            onClick={() => {
              setSearchOpen(false);
              setQuery("");
            }}
          />
        </div>
      )}

      <div className="flex-1 min-h-0 flex md:gap-3 md:px-3 md:pb-3 overflow-hidden min-w-0">
        {/* Folder sidebar */}
        <div className="hidden md:block shrink-0 self-stretch">
          {Sidebar}
        </div>

        {/* Folder drawer — always mounted; x follows finger via drawerX */}
        <motion.button
          type="button"
          aria-label="Закрыть меню"
          style={{ opacity: drawerBackdrop }}
          className={cn(
            "md:hidden fixed inset-0 z-40 bg-black/55",
            sidebarOpen || drawerPulling
              ? "pointer-events-auto"
              : "pointer-events-none",
          )}
          onClick={() => closeDrawer()}
        />
        <motion.div
          data-mail-drawer
          drag="x"
          dragConstraints={{ left: -DRAWER_W, right: 0 }}
          dragElastic={{ left: 0.08, right: 0 }}
          dragDirectionLock
          onDragStart={() => {
            document.documentElement.dataset.mailGesture = "1";
            setSwipeOpenId(null);
          }}
          onDragEnd={onSidebarDragEnd}
          className={cn(
            "md:hidden fixed left-0 z-50 p-3 overscroll-contain",
            !(sidebarOpen || drawerPulling) && "pointer-events-none",
          )}
          style={{
            x: drawerX,
            width: DRAWER_W,
            top: "var(--safe-top)",
            bottom: "var(--safe-bottom)",
            height: "auto",
            touchAction: "pan-y",
          }}
        >
          <div className="h-full shadow-2xl overflow-y-auto overscroll-contain">
            {Sidebar}
          </div>
        </motion.div>

        {/* Main — Yandex-style list pane */}
        <main className="flex-1 min-w-0 flex flex-col p-0">
          <div className="flex-1 min-h-0 bg-[#1a1c22] mail-main-pane md:rounded-[20px] flex flex-col overflow-hidden">
            {/* Toolbar — menus outside overflow-x so dropdowns aren't clipped */}
            <div className="relative shrink-0">
              <div className="flex items-center gap-0.5 px-2 md:px-3 py-1.5 overflow-x-auto no-scrollbar">
              <div className="h-9 w-9 flex items-center justify-center shrink-0">
                <Checkbox
                  checked={allSelected && visible.length > 0}
                  onChange={toggleAll}
                  aria-label="Выбрать все"
                />
              </div>
              <ToolbarBtn
                icon={Reply}
                label="Ответить"
                onClick={() => void replySelected()}
              />
              <ToolbarBtn
                icon={Forward}
                label="Переслать"
                onClick={() => void forwardSelected()}
              />
              <ToolbarBtn
                icon={Trash2}
                label={folder === "trash" ? "Удалить" : "Удалить"}
                onClick={moveToTrash}
                danger
              />
              <ToolbarBtn
                icon={Archive}
                label="В архив"
                onClick={() => moveSelected("archive")}
              />
              <ToolbarBtn
                icon={Mail}
                label="Непрочит."
                onClick={() => markUnread(true)}
              />
              <ToolbarBtn
                icon={MailOpen}
                label="Прочитано"
                onClick={() => markUnread(false)}
              />
              <ToolbarBtn
                icon={FolderInput}
                label="В папку"
                onClick={() =>
                  setToolbarMenu((m) => (m === "folder" ? null : "folder"))
                }
              />
              <ToolbarBtn
                icon={Tag}
                label="Метка"
                onClick={() =>
                  setToolbarMenu((m) => (m === "label" ? null : "label"))
                }
              />
              <ToolbarBtn
                icon={Clock}
                label="Напомнить"
                onClick={remindSelected}
              />
              <ToolbarBtn
                icon={ShieldAlert}
                label="Это спам!"
                onClick={() => moveSelected("spam")}
              />
              {folder === "trash" || folder === "spam" ? (
                <ToolbarBtn
                  icon={Inbox}
                  label="Восстановить"
                  onClick={() => moveSelected("restore")}
                />
              ) : null}
              </div>

              {toolbarMenu === "folder" && hasTargets && (
                <div className="absolute left-2 md:left-28 top-full mt-1 z-50 min-w-[220px] max-h-[280px] overflow-y-auto rounded-[14px] bg-[#1a1c22] shadow-xl py-1 border border-white/10">
                  {[
                    { id: "inbox", name: "Входящие" },
                    { id: "archive", name: "Архив" },
                    { id: "spam", name: "Спам" },
                    { id: "trash", name: "Удалённые" },
                    ...customFolders.map((f) => ({ id: f.id, name: f.name })),
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => moveToFolder(f.id)}
                      className="w-full px-3 py-2 text-left text-[13px] text-white/75 hover:bg-white/5 font-[family-name:var(--font-manrope)]"
                    >
                      {f.name}
                    </button>
                  ))}
                  <div className="my-1 border-t border-white/8" />
                  <button
                    type="button"
                    onClick={() => openNameModal("folder")}
                    className="w-full px-3 py-2 text-left text-[13px] text-white/55 hover:bg-white/5 font-[family-name:var(--font-manrope)]"
                  >
                    Создать папку…
                  </button>
                </div>
              )}

              {toolbarMenu === "label" && hasTargets && (
                <div className="absolute left-2 md:left-52 top-full mt-1 z-50 min-w-[220px] max-h-[280px] overflow-y-auto rounded-[14px] bg-[#1a1c22] shadow-xl py-1 border border-white/10">
                  {mailLabels.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => openNameModal("label")}
                      className="w-full px-3 py-2 text-left text-[13px] text-white/55 hover:bg-white/5 font-[family-name:var(--font-manrope)]"
                    >
                      Создать метку…
                    </button>
                  ) : (
                    <>
                      {mailLabels.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => applyLabel(l.id)}
                          className="w-full px-3 py-2 text-left text-[13px] text-white/75 hover:bg-white/5 inline-flex items-center gap-2 font-[family-name:var(--font-manrope)]"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: l.color }}
                          />
                          {l.name}
                        </button>
                      ))}
                      <div className="my-1 border-t border-white/8" />
                      <button
                        type="button"
                        onClick={() => openNameModal("label")}
                        className="w-full px-3 py-2 text-left text-[13px] text-white/55 hover:bg-white/5 font-[family-name:var(--font-manrope)]"
                      >
                        Создать метку…
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Message list + reader */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
              <div
                className={cn(
                  "flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden",
                  openId && "hidden md:flex md:max-w-[50%] md:border-r md:border-white/8",
                )}
              >
              <MobileMailBanners enabled={Boolean(activeAccount)} />
              <PullToRefresh
                disabled={Boolean(openId)}
                onRefresh={async () => {
                  await loadMessages(folder);
                  clearSelection();
                }}
              >
              {visible.length === 0 ? (
                <div className="min-h-[240px] flex flex-col items-center justify-center text-center px-6">
                  <Mail size={36} className="text-white/20" />
                  <p className="mt-4 text-[15px] font-semibold font-[family-name:var(--font-manrope)]">
                    Нет писем
                  </p>
                  <p className="mt-1 text-[13px] text-white/35 font-[family-name:var(--font-manrope)]">
                    {loadingMail ? "Загрузка…" : "В этой папке пока пусто"}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2.5 pt-3 pb-20 md:pb-2 min-w-0">
                  {visible.map((m, i) => {
                    const isSel = selected.has(m.id);
                    const isOpen = openId === m.id;
                    return (
                      <motion.li
                        key={m.id}
                        className="relative min-w-0"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.2,
                          delay: Math.min(i, 10) * 0.025,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        layout={false}
                      >
                        <SwipeMailRow
                          id={m.id}
                          open={swipeOpenId === m.id}
                          onOpenChange={setSwipeOpenId}
                          onReply={() => replyMessage(m.id)}
                          onDelete={() => trashMessage(m.id)}
                        >
                          <div
                            data-pressable
                            className={cn(
                              "relative flex items-center gap-2.5 md:gap-2.5 px-2.5 md:px-2.5 h-[56px] md:h-[50px] cursor-pointer rounded-[14px] transition-colors overflow-hidden min-w-0 w-full box-border",
                              isOpen
                                ? "bg-[#0066ff]/25 ring-1 ring-inset ring-[#0066ff]/40"
                                : isSel
                                  ? "bg-[#0066ff]/30 ring-1 ring-inset ring-[#0066ff]/50"
                                  : m.unread
                                    ? "bg-[#2a2d36] hover:bg-[#32363f]"
                                    : "bg-[#24262e] hover:bg-[#2a2d36]",
                            )}
                            onClick={() => {
                              setSwipeOpenId(null);
                              void openMessage(m.id);
                            }}
                            onMouseEnter={() => prefetchMessage(m.id)}
                            onFocus={() => prefetchMessage(m.id)}
                          >
                            {m.unread && (
                              <span className="pointer-events-none absolute top-1 left-2 z-20 h-[18px] px-1.5 rounded-[6px] bg-[#0066ff] text-white text-[10px] font-semibold font-[family-name:var(--font-manrope)] inline-flex items-center leading-none shadow-[0_2px_8px_rgba(0,102,255,0.4)]">
                                новое
                              </span>
                            )}
                            <Checkbox
                              checked={isSel}
                              onChange={() => toggleOne(m.id)}
                              aria-label={`Выбрать ${m.from}`}
                            />

                            <SenderAvatar
                              from={m.from}
                              fromEmail={m.fromEmail}
                              avatarColor={m.avatarColor}
                              avatarUrl={avatarForSender(
                                m.fromEmail,
                                m.avatarUrl,
                                accounts,
                              )}
                              size={34}
                            />

                            <div className="min-w-0 flex-1 basis-0 flex items-center gap-2 overflow-hidden">
                              <span
                                className={cn(
                                  "shrink-0 w-[100px] sm:w-[120px] md:w-[140px] truncate text-[14px] md:text-[14px] font-[family-name:var(--font-manrope)]",
                                  m.unread
                                    ? "font-bold text-white"
                                    : "font-medium text-white/70",
                                )}
                              >
                                {m.from}
                              </span>

                              <span className="min-w-0 flex-1 basis-0 truncate block text-[14px] md:text-[14px] font-[family-name:var(--font-manrope)]">
                                <span
                                  className={
                                    m.unread
                                      ? "font-semibold text-white"
                                      : "text-white/75"
                                  }
                                >
                                  {m.subject}
                                </span>
                                {(m.threadCount || 0) > 1 && (
                                  <span className="ml-1.5 text-[11px] text-white/35 font-medium">
                                    {m.threadCount}
                                  </span>
                                )}
                                <span className="text-white/30">
                                  {" "}
                                  — {m.preview}
                                </span>
                              </span>
                            </div>

                            <div className="shrink-0 flex items-center gap-2 pl-1">
                              {m.hasAttachment && (
                                <Paperclip
                                  size={13}
                                  className="text-white/30 hidden sm:block"
                                />
                              )}
                              {(() => {
                                const badge = deliveryBadge(m.deliveryStatus);
                                if (
                                  !badge ||
                                  (folder !== "sent" && m.folder !== "sent")
                                )
                                  return null;
                                return (
                                  <span
                                    className={cn(
                                      "hidden sm:inline text-[11px] font-[family-name:var(--font-manrope)]",
                                      badge.className,
                                    )}
                                    title={m.deliveryDetail || undefined}
                                  >
                                    {badge.text}
                                  </span>
                                );
                              })()}
                              <span className="w-[48px] md:w-[56px] text-right text-[12px] md:text-[13px] text-white/35 font-[family-name:var(--font-manrope)] tabular-nums">
                                {m.time}
                              </span>
                            </div>
                          </div>
                        </SwipeMailRow>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
              </PullToRefresh>
              </div>

              <AnimatePresence initial={false}>
              {openId && (
                <motion.div
                  key="mail-reader"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="flex-1 min-h-0 flex flex-col md:min-w-0 px-2 pb-2 md:px-0 md:pr-3 md:pb-3"
                >
                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-[16px] bg-[#0c0d10] border border-white/10 mx-auto w-full">
                    <div className="shrink-0 flex items-center gap-2 px-3 md:px-5 h-12">
                      <button
                        type="button"
                        className="md:hidden h-8 w-8 rounded-full flex items-center justify-center text-white/50 hover:bg-white/5"
                        onClick={() => {
                          setOpenId(null);
                          openIdRef.current = null;
                          setDetail(null);
                          setThread([]);
                          setRecipientsOpen(false);
                        }}
                        aria-label="Назад к списку"
                      >
                        <X size={16} />
                      </button>
                      <span className="flex-1 min-w-0 text-[13px] text-white/30 font-[family-name:var(--font-manrope)] truncate px-1 leading-none self-center">
                        {detail?.subject || ""}
                      </span>
                      <button
                        type="button"
                        className="h-8 px-2.5 rounded-full inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:bg-white/5 hover:text-white font-[family-name:var(--font-manrope)]"
                        onClick={() => void replySelected()}
                        aria-label="Ответить"
                      >
                        <Reply size={15} />
                        <span className="hidden sm:inline">Ответить</span>
                      </button>
                      <button
                        type="button"
                        className="h-8 px-2.5 rounded-full inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:bg-white/5 hover:text-white font-[family-name:var(--font-manrope)]"
                        onClick={() => void forwardSelected()}
                        aria-label="Переслать"
                      >
                        <Forward size={15} />
                        <span className="hidden sm:inline">Переслать</span>
                      </button>
                      <button
                        type="button"
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white/40 hover:bg-white/5 hover:text-white"
                        onClick={() => {
                          setOpenId(null);
                          openIdRef.current = null;
                          setDetail(null);
                          setThread([]);
                          setRecipientsOpen(false);
                        }}
                        aria-label="Закрыть письмо"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div
                      className="flex-1 overflow-y-auto mail-scroll"
                      key={`scroll-${openId}`}
                    >
                      <div className="mx-auto w-full max-w-[680px] px-3 sm:px-6 md:px-8 pt-4 md:pt-6 pb-10">
                        {detailLoading && !detail?.bodyHtml ? (
                          <div className="space-y-6">
                            <div className="h-8 w-[72%] rounded-xl bg-white/[0.06] animate-pulse" />
                            <div className="flex items-center gap-3.5">
                              <div className="h-12 w-12 rounded-full bg-white/[0.06] animate-pulse" />
                              <div className="flex-1 space-y-2.5">
                                <div className="h-3.5 w-[48%] rounded-md bg-white/[0.06] animate-pulse" />
                                <div className="h-3 w-[28%] rounded-md bg-white/[0.04] animate-pulse" />
                              </div>
                            </div>
                            <div className="rounded-[20px] bg-white/[0.04] p-6 space-y-3 min-h-[220px]">
                              <div className="h-3 rounded-md bg-white/[0.07] w-[88%] animate-pulse" />
                              <div className="h-3 rounded-md bg-white/[0.05] w-[70%] animate-pulse" />
                              <div className="h-3 rounded-md bg-white/[0.05] w-[78%] animate-pulse" />
                            </div>
                          </div>
                        ) : (
                          <>
                            <h2 className="text-[24px] md:text-[28px] font-bold tracking-[-0.035em] leading-[1.2] text-white font-[family-name:var(--font-unbounded)]">
                              {detail?.subject || "…"}
                            </h2>
                            {thread.length > 1 && (
                              <p className="mt-1.5 text-[13px] text-white/35 font-[family-name:var(--font-manrope)]">
                                {thread.length} писем в переписке
                              </p>
                            )}

                            <div className="mt-6 space-y-0">
                              {(thread.length > 0 ? thread : detail ? [detail] : []).map(
                                (msg, idx, list) => {
                                  const isLast = idx === list.length - 1;
                                  return (
                                    <div
                                      key={msg.id}
                                      className={cn(
                                        "pt-5",
                                        idx > 0 && "border-t border-white/8",
                                      )}
                                    >
                                      <div className="flex items-start gap-3.5">
                                        <SenderAvatar
                                          from={msg.from || "?"}
                                          fromEmail={msg.fromEmail}
                                          avatarColor={
                                            msg.avatarColor || "#3b82f6"
                                          }
                                          avatarUrl={avatarForSender(
                                            msg.fromEmail,
                                            msg.avatarUrl,
                                            accounts,
                                          )}
                                          size={44}
                                        />

                                        <div className="min-w-0 flex-1 pt-0.5">
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <span className="text-[15px] font-semibold text-white font-[family-name:var(--font-manrope)]">
                                                  {msg.from || "—"}
                                                </span>
                                                <span className="text-[13px] text-white/40 font-[family-name:var(--font-manrope)]">
                                                  {msg.fromEmail || ""}
                                                </span>
                                                {msg.folder === "sent" ? (
                                                  <span className="text-[11px] text-white/30 font-[family-name:var(--font-manrope)]">
                                                    вы
                                                  </span>
                                                ) : (
                                                  <VerifiedBadge />
                                                )}
                                              </div>

                                              {isLast && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setRecipientsOpen((v) => !v)
                                                  }
                                                  className="mt-1.5 inline-flex items-center gap-1 text-[13px] text-white/35 hover:text-white/60 font-[family-name:var(--font-manrope)] transition-colors"
                                                >
                                                  {(() => {
                                                    const nList = [
                                                      ...(msg.to || "")
                                                        .split(/[,;]+/)
                                                        .map((s) => s.trim())
                                                        .filter(Boolean),
                                                      ...(msg.cc || "")
                                                        .split(/[,;]+/)
                                                        .map((s) => s.trim())
                                                        .filter(Boolean),
                                                    ];
                                                    const n = nList.length || 1;
                                                    return `${n} получател${n === 1 ? "ь" : n < 5 ? "я" : "ей"}`;
                                                  })()}
                                                  <span
                                                    className={cn(
                                                      "inline-block text-[10px] opacity-70 transition-transform",
                                                      recipientsOpen &&
                                                        "rotate-180",
                                                    )}
                                                  >
                                                    ▾
                                                  </span>
                                                </button>
                                              )}

                                              {isLast && recipientsOpen && (
                                                <div className="mt-2 rounded-[12px] bg-white/[0.04] px-3 py-2 space-y-1">
                                                  {(
                                                    (msg.to ||
                                                      activeAccount.email)
                                                      .split(/[,;]+/)
                                                      .map((s) => s.trim())
                                                      .filter(Boolean) || []
                                                  ).map((addr) => (
                                                    <p
                                                      key={addr}
                                                      className="text-[13px] text-white/70 font-[family-name:var(--font-manrope)]"
                                                    >
                                                      {addr}
                                                    </p>
                                                  ))}
                                                  {msg.cc
                                                    ?.split(/[,;]+/)
                                                    .map((s) => s.trim())
                                                    .filter(Boolean)
                                                    .map((addr) => (
                                                      <p
                                                        key={`cc-${addr}`}
                                                        className="text-[13px] text-white/40 font-[family-name:var(--font-manrope)]"
                                                      >
                                                        Копия: {addr}
                                                      </p>
                                                    ))}
                                                </div>
                                              )}
                                            </div>

                                            <span className="shrink-0 text-[13px] text-white/30 font-[family-name:var(--font-manrope)] tabular-nums pt-1">
                                              {msg.time || ""}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div
                                        className={cn(
                                          "mt-2.5 relative",
                                          !isLast && "pb-4",
                                        )}
                                      >
                                        {detailLoading && isLast && (
                                          <div className="absolute inset-0 z-10 rounded-[12px] bg-[#0c0d10]/50 flex items-center justify-center">
                                            <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-[#0066ff] animate-spin" />
                                          </div>
                                        )}
                                        {msg.bodyHtml ? (
                                          <MailBodyFrame html={msg.bodyHtml} />
                                        ) : (
                                          <div className="rounded-[12px] bg-white/[0.03] p-6 space-y-3 animate-pulse min-h-[80px]">
                                            <div className="h-3 rounded-md bg-white/[0.06] w-[90%]" />
                                            <div className="h-3 rounded-md bg-white/[0.05] w-[72%]" />
                                          </div>
                                        )}
                                        <MailAttachmentsList
                                          items={extractAttachmentsFromHtml(
                                            msg.bodyHtml || "",
                                          )}
                                        />
                                      </div>
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      <ComposeEditor
        open={composeOpen}
        onClose={() => {
          setComposeOpen(false);
          setSendError("");
          setComposeDraft(null);
        }}
        fromEmail={activeAccount.email}
        fromName={activeAccount.name}
        contacts={accounts.map((a) => ({
          email: a.email,
          name: a.name,
          avatarUrl: a.avatarUrl,
          color: a.color,
        }))}
        labels={mailLabels}
        draftId={composeDraft?.id}
        initialTo={composeDraft?.to || ""}
        initialCc={composeDraft?.cc || ""}
        initialSubject={composeDraft?.subject || ""}
        initialBodyHtml={composeDraft?.bodyHtml || ""}
        onToast={showToast}
        onSaveDraft={saveDraft}
        onSend={async ({
          to,
          subject,
          bodyHtml,
          cc,
          labelIds,
          remindNoReply,
          notifyDelivery,
          hasAttachment,
          attachments,
        }) => {
          setSendError("");
          const replyToId = composeDraft?.replyToId || undefined;
          const openAfter = openId;
          const res = await fetch("/api/mail/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to,
              cc,
              subject,
              bodyHtml,
              replyToId,
              labelIds,
              notifyDelivery,
              hasAttachment,
              attachments,
            }),
          });
          const json = await res.json();
          if (!json.ok) {
            setSendError(json.error?.message || "Не удалось отправить");
            throw new Error("send failed");
          }
          if (json.data?.transportWarning) {
            setSendError(
              `Письмо не доставлено наружу: ${json.data.transportWarning}`,
            );
            throw new Error("transport failed");
          }
          const sentId = (json.data?.message?.id as string) || "";
          if (sentId && remindNoReply) {
            await patchMessages([sentId], "remind");
          }
          if (notifyDelivery) {
            showToast("Следим за доставкой");
          }
          if (labelIds?.length) {
            showToast("Метки добавлены");
          }
          setComposeDraft(null);
          detailCache.current.clear();
          if (replyToId && openAfter) {
            await loadMessages(folder);
            openIdRef.current = null;
            await openMessage(openAfter);
          } else {
            setFolder("sent");
            await loadMessages("sent");
          }
        }}
      />

      <BottomSheet
        open={Boolean(nameModal)}
        onClose={() => {
          if (nameModalBusy) return;
          setNameModal(null);
          setNameModalValue("");
        }}
        labelledBy="name-modal-title"
        dismissible={!nameModalBusy}
        className="sm:max-w-[400px]"
      >
        <h3
          id="name-modal-title"
          className="text-[17px] font-semibold text-white font-[family-name:var(--font-manrope)]"
        >
          {nameModal === "folder" ? "Новая папка" : "Новая метка"}
        </h3>
        <p className="mt-1 text-[13px] text-white/40 font-[family-name:var(--font-manrope)]">
          {nameModal === "folder"
            ? "Введите название папки"
            : "Введите название метки"}
        </p>
        <input
          autoFocus
          value={nameModalValue}
          onChange={(e) => setNameModalValue(e.target.value)}
          placeholder={
            nameModal === "folder" ? "Название папки" : "Название метки"
          }
          disabled={nameModalBusy}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submitNameModal();
            }
          }}
          className="mt-4 w-full h-12 rounded-[12px] bg-[#0f1115] border border-white/10 px-3.5 text-[15px] text-white font-[family-name:var(--font-manrope)] outline-none focus:border-[#0066ff]/60 focus:shadow-[0_0_0_3px_rgba(0,102,255,0.18)] placeholder:text-white/30"
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={nameModalBusy}
            onClick={() => {
              haptic("light");
              setNameModal(null);
              setNameModalValue("");
            }}
            className="h-10 px-4 rounded-full text-[14px] text-white/55 hover:bg-white/5 hover:text-white font-[family-name:var(--font-manrope)] transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={nameModalBusy || !nameModalValue.trim()}
            onClick={() => {
              haptic("medium");
              void submitNameModal();
            }}
            className="h-10 px-5 rounded-full bg-[#0066ff] text-white text-[14px] font-semibold font-[family-name:var(--font-manrope)] hover:bg-[#0052cc] disabled:opacity-40 disabled:cursor-default transition-colors"
          >
            {nameModalBusy ? "Создание…" : "Создать"}
          </button>
        </div>
      </BottomSheet>

      {(sendError || toast) && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 max-w-[min(90vw,420px)] rounded-[14px] bg-[#2a2d36] px-4 py-3 text-[13px] text-white/80 shadow-lg font-[family-name:var(--font-manrope)]"
          style={{ bottom: "calc(5rem + var(--safe-bottom))" }}
        >
          {sendError || toast}
          {sendError && (
            <button
              type="button"
              className="ml-3 text-[#4d9fff]"
              onClick={() => setSendError("")}
            >
              OK
            </button>
          )}
        </div>
      )}

      {!composeOpen && !idOverlayUrl && !idOverlayLoading && (
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="md:hidden fixed right-4 z-30 h-14 w-14 rounded-full bg-[#0066ff] text-white inline-flex items-center justify-center hover:bg-[#0052cc] transition-colors active:scale-[0.94]"
          style={{ bottom: "calc(1rem + var(--safe-bottom))" }}
          aria-label="Написать"
        >
          <Pencil size={22} />
        </button>
      )}

      {/* In-app pnk ID / auth — edge-to-edge, no mail chrome (back lives in ID) */}
      {(idOverlayUrl || idOverlayLoading) && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-[#0c0d10]">
          {idOverlayLoading && !idOverlayUrl ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-[#0066ff] animate-spin" />
            </div>
          ) : (
            <iframe
              title="pnk ID"
              src={idOverlayUrl || "about:blank"}
              className="flex-1 w-full min-h-0 border-0 bg-[#0c0d10]"
              allow="camera *; microphone *; clipboard-read; clipboard-write"
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={(e) => {
                // After OAuth callback the iframe lands back on mail origin
                try {
                  const win = e.currentTarget.contentWindow;
                  const loc = win?.location;
                  if (!loc || loc.origin !== window.location.origin) return;
                  if (
                    loc.pathname.startsWith("/api/auth/callback") ||
                    loc.pathname === "/mail" ||
                    loc.pathname === "/"
                  ) {
                    closeIdOverlay();
                    window.location.assign("/mail");
                  }
                } catch {
                  /* cross-origin ID pages */
                }
              }}
            />
          )}
        </div>
      )}
      <PushSubscribe
        enabled={Boolean(activeAccount)}
        className="hidden md:block"
      />
    </div>
  );
}
