/** Free / consumer mail hosts — prefer initials over provider favicon. */
const PERSONAL_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "mail.ru",
  "inbox.ru",
  "list.ru",
  "bk.ru",
  "internet.ru",
  "yandex.ru",
  "yandex.com",
  "ya.ru",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "gmx.com",
  "gmx.de",
  "gmx.net",
  "zoho.com",
  "fastmail.com",
  "hey.com",
]);

/** Our own product domain — never use site favicon as a person avatar. */
function isPnkMailProductDomain(domain: string): boolean {
  const root = rootDomain(domain);
  const configured = (
    process.env.MAIL_FROM_DOMAIN ||
    process.env.NEXT_PUBLIC_MAIL_FROM_DOMAIN ||
    "pnkmail.ru"
  )
    .replace(/^\./, "")
    .toLowerCase();
  return (
    domain === "pnkmail.ru" ||
    root === "pnkmail.ru" ||
    domain === configured ||
    root === configured
  );
}

/**
 * High-quality brand marks (prefer over generic favicon when known).
 * Values are absolute https URLs safe for <img>.
 */
const KNOWN_BRAND_LOGOS: Record<string, string> = {
  "reg.ru": "https://www.google.com/s2/favicons?domain=reg.ru&sz=128",
  "hosting.reg.ru": "https://www.google.com/s2/favicons?domain=reg.ru&sz=128",
  "github.com": "https://www.google.com/s2/favicons?domain=github.com&sz=128",
  "github.io": "https://www.google.com/s2/favicons?domain=github.com&sz=128",
  "google.com": "https://www.google.com/s2/favicons?domain=google.com&sz=128",
  "accounts.google.com":
    "https://www.google.com/s2/favicons?domain=google.com&sz=128",
  "apple.com": "https://www.google.com/s2/favicons?domain=apple.com&sz=128",
  "id.apple.com": "https://www.google.com/s2/favicons?domain=apple.com&sz=128",
  "microsoft.com":
    "https://www.google.com/s2/favicons?domain=microsoft.com&sz=128",
  "amazon.com": "https://www.google.com/s2/favicons?domain=amazon.com&sz=128",
  "amazon.ru": "https://www.google.com/s2/favicons?domain=amazon.ru&sz=128",
  "ozon.ru": "https://www.google.com/s2/favicons?domain=ozon.ru&sz=128",
  "wildberries.ru":
    "https://www.google.com/s2/favicons?domain=wildberries.ru&sz=128",
  "tinkoff.ru": "https://www.google.com/s2/favicons?domain=tbank.ru&sz=128",
  "tbank.ru": "https://www.google.com/s2/favicons?domain=tbank.ru&sz=128",
  "sberbank.ru": "https://www.google.com/s2/favicons?domain=sber.ru&sz=128",
  "sber.ru": "https://www.google.com/s2/favicons?domain=sber.ru&sz=128",
  "vk.com": "https://www.google.com/s2/favicons?domain=vk.com&sz=128",
  "telegram.org":
    "https://www.google.com/s2/favicons?domain=telegram.org&sz=128",
  "noreply.github.com":
    "https://www.google.com/s2/favicons?domain=github.com&sz=128",
  "facebook.com":
    "https://www.google.com/s2/favicons?domain=facebook.com&sz=128",
  "meta.com": "https://www.google.com/s2/favicons?domain=meta.com&sz=128",
  "twitter.com": "https://www.google.com/s2/favicons?domain=x.com&sz=128",
  "x.com": "https://www.google.com/s2/favicons?domain=x.com&sz=128",
  "linkedin.com":
    "https://www.google.com/s2/favicons?domain=linkedin.com&sz=128",
  "netflix.com": "https://www.google.com/s2/favicons?domain=netflix.com&sz=128",
  "spotify.com": "https://www.google.com/s2/favicons?domain=spotify.com&sz=128",
  "stripe.com": "https://www.google.com/s2/favicons?domain=stripe.com&sz=128",
  "paypal.com": "https://www.google.com/s2/favicons?domain=paypal.com&sz=128",
  "cloudflare.com":
    "https://www.google.com/s2/favicons?domain=cloudflare.com&sz=128",
  "vercel.com": "https://www.google.com/s2/favicons?domain=vercel.com&sz=128",
  "notion.so": "https://www.google.com/s2/favicons?domain=notion.so&sz=128",
  "slack.com": "https://www.google.com/s2/favicons?domain=slack.com&sz=128",
  "discord.com": "https://www.google.com/s2/favicons?domain=discord.com&sz=128",
  "booking.com": "https://www.google.com/s2/favicons?domain=booking.com&sz=128",
  "avito.ru": "https://www.google.com/s2/favicons?domain=avito.ru&sz=128",
  "hh.ru": "https://www.google.com/s2/favicons?domain=hh.ru&sz=128",
  "dns-shop.ru": "https://www.google.com/s2/favicons?domain=dns-shop.ru&sz=128",
  "mts.ru": "https://www.google.com/s2/favicons?domain=mts.ru&sz=128",
  "megafon.ru": "https://www.google.com/s2/favicons?domain=megafon.ru&sz=128",
  "beeline.ru": "https://www.google.com/s2/favicons?domain=beeline.ru&sz=128",
  "alfabank.ru":
    "https://www.google.com/s2/favicons?domain=alfabank.ru&sz=128",
  "vtb.ru": "https://www.google.com/s2/favicons?domain=vtb.ru&sz=128",
};

export function emailDomain(fromEmail: string): string | null {
  const raw = (fromEmail || "").trim().toLowerCase();
  const at = raw.lastIndexOf("@");
  if (at < 0) return null;
  const domain = raw.slice(at + 1).replace(/[>\]]+$/, "").trim();
  if (!domain || !domain.includes(".")) return null;
  return domain;
}

/** mail.notify.reg.ru → reg.ru */
export function rootDomain(domain: string): string {
  const parts = domain.toLowerCase().split(".").filter(Boolean);
  if (parts.length <= 2) return domain.toLowerCase();
  const multi = new Set(["co.uk", "com.au", "com.br", "co.jp", "com.tr"]);
  const last2 = parts.slice(-2).join(".");
  if (multi.has(last2) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }
  return last2;
}

function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i");
  const m = tag.match(re);
  if (m) return m[2].trim();
  const bare = tag.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, "i"));
  return bare ? bare[1].replace(/^["']|["']$/g, "").trim() : null;
}

function parsePx(raw: string | null): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function isTrackingOrSpacer(tag: string, src: string): boolean {
  const w = parsePx(attr(tag, "width"));
  const h = parsePx(attr(tag, "height"));
  if ((w != null && w <= 3) || (h != null && h <= 3)) return true;
  if (/\/(pixel|track|open|beacon|spacer|blank|transparent)\b/i.test(src)) {
    return true;
  }
  if (/\.(gif)(?:\?|$)/i.test(src) && (w == null || w < 8) && (h == null || h < 8)) {
    return true;
  }
  return false;
}

function normalizeImageUrl(src: string): string | null {
  const s = src.trim().replace(/&amp;/g, "&");
  if (!s || /^data:/i.test(s) || /^cid:/i.test(s) || /^javascript:/i.test(s)) {
    return null;
  }
  if (/^https?:\/\//i.test(s)) return s;
  if (/^\/\//.test(s)) return `https:${s}`;
  return null;
}

/**
 * Pick the best logo-like image from branded HTML
 * (alt/class/src containing "logo", early in the document, reasonable size).
 */
export function extractLogoFromHtml(html: string): string | null {
  if (!html || html.length < 40) return null;
  // Only scan the first ~80KB — logos live in the header
  const slice = html.slice(0, 80_000);
  const tags = slice.match(/<img\b[^>]*>/gi) || [];
  let bestScore = -1;
  let bestSrc: string | null = null;

  for (let index = 0; index < tags.length; index++) {
    const tag = tags[index];
    const rawSrc = attr(tag, "src");
    if (!rawSrc) continue;
    const src = normalizeImageUrl(rawSrc);
    if (!src || isTrackingOrSpacer(tag, src)) continue;

    const alt = (attr(tag, "alt") || "").toLowerCase();
    const cls = `${attr(tag, "class") || ""} ${attr(tag, "id") || ""}`.toLowerCase();
    const hay = `${src} ${alt} ${cls}`.toLowerCase();

    let score = 0;
    if (/\blogo\b/.test(hay)) score += 12;
    if (/\b(brand|header|emblem|mark)\b/.test(hay)) score += 6;
    if (/\.(svg|png|webp)(?:\?|$)/i.test(src)) score += 3;
    if (/\.(jpe?g)(?:\?|$)/i.test(src)) score += 1;

    const w = parsePx(attr(tag, "width"));
    const h = parsePx(attr(tag, "height"));
    if (w != null && h != null) {
      if (w >= 40 && w <= 320 && h >= 20 && h <= 160) score += 4;
      if (w > 480 || h > 240) score -= 4; // hero / banner
      if (w < 16 || h < 16) score -= 6;
    }

    // Prefer earlier images (header logos)
    score += Math.max(0, 5 - Math.floor(index / 2));

    if (score > bestScore) {
      bestScore = score;
      bestSrc = src;
    }
  }

  // Require at least a weak logo signal to avoid random photos
  if (!bestSrc || bestScore < 6) return null;
  return bestSrc;
}

/**
 * Resolve avatar URL for a sender.
 * Priority: stored → HTML logo → known brand → domain favicon → null (initials).
 */
export function resolveSenderAvatarUrl(
  fromEmail: string,
  opts?: { html?: string | null; stored?: string | null },
): string | null {
  const stored = (opts?.stored || "").trim();
  if (stored) {
    if (/^https?:\/\//i.test(stored)) return stored;
    if (stored.startsWith("/")) {
      const base = (
        process.env.NEXT_PUBLIC_MAIL_URL ||
        process.env.MAIL_PUBLIC_URL ||
        ""
      ).replace(/\/$/, "");
      return base ? `${base}${stored}` : stored;
    }
  }

  if (opts?.html) {
    const fromHtml = extractLogoFromHtml(opts.html);
    if (fromHtml) return fromHtml;
  }

  const domain = emailDomain(fromEmail);
  if (!domain) return null;

  const root = rootDomain(domain);
  if (KNOWN_BRAND_LOGOS[domain]) return KNOWN_BRAND_LOGOS[domain];
  if (KNOWN_BRAND_LOGOS[root]) return KNOWN_BRAND_LOGOS[root];

  // System mail from pnk почта (welcome, daemon) → product mark
  if (isPnkMailProductDomain(domain)) {
    const local = (fromEmail.split("@")[0] || "").toLowerCase();
    if (
      local === "hello" ||
      local === "noreply" ||
      local === "mailer-daemon" ||
      local === "support" ||
      local === "postmaster"
    ) {
      const base = (
        process.env.NEXT_PUBLIC_MAIL_URL ||
        process.env.MAIL_PUBLIC_URL ||
        ""
      ).replace(/\/$/, "");
      return base ? `${base}/icon-192.png` : "/icon-192.png";
    }
    return null;
  }

  if (PERSONAL_MAIL_DOMAINS.has(domain) || PERSONAL_MAIL_DOMAINS.has(root)) {
    return null;
  }

  return faviconUrl(root);
}
