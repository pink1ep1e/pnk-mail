import { prisma } from "@/lib/db";
import { emailDomain, rootDomain } from "@/lib/sender-avatar";

export type VerifiedDomainInfo = {
  domain: string;
  label: string;
};

/** Seed list until admin UI exists. Safe to re-run (upsert). */
export const DEFAULT_VERIFIED_DOMAINS: VerifiedDomainInfo[] = [
  { domain: "pnkmail.ru", label: "pnk Почта" },
  { domain: "steampowered.com", label: "Steam" },
  { domain: "steamcommunity.com", label: "Steam" },
  { domain: "valvesoftware.com", label: "Valve" },
  { domain: "apple.com", label: "Apple" },
  { domain: "google.com", label: "Google" },
  { domain: "github.com", label: "GitHub" },
  { domain: "microsoft.com", label: "Microsoft" },
  { domain: "paypal.com", label: "PayPal" },
  { domain: "spotify.com", label: "Spotify" },
  { domain: "discord.com", label: "Discord" },
  { domain: "telegram.org", label: "Telegram" },
  { domain: "meta.com", label: "Meta" },
  { domain: "facebook.com", label: "Facebook" },
  { domain: "instagram.com", label: "Instagram" },
  { domain: "amazon.com", label: "Amazon" },
  { domain: "amazon.ru", label: "Amazon" },
  { domain: "netflix.com", label: "Netflix" },
  { domain: "riotgames.com", label: "Riot Games" },
  { domain: "epicgames.com", label: "Epic Games" },
  { domain: "blizzard.com", label: "Blizzard" },
  { domain: "ubisoft.com", label: "Ubisoft" },
  { domain: "ea.com", label: "EA" },
  { domain: "playstation.com", label: "PlayStation" },
  { domain: "nintendo.com", label: "Nintendo" },
  { domain: "tiktok.com", label: "TikTok" },
  { domain: "linkedin.com", label: "LinkedIn" },
  { domain: "dropbox.com", label: "Dropbox" },
  { domain: "adobe.com", label: "Adobe" },
  { domain: "zoom.us", label: "Zoom" },
  { domain: "slack.com", label: "Slack" },
  { domain: "notion.so", label: "Notion" },
  { domain: "vercel.com", label: "Vercel" },
  { domain: "stripe.com", label: "Stripe" },
  { domain: "resend.com", label: "Resend" },
  { domain: "openai.com", label: "OpenAI" },
  { domain: "anthropic.com", label: "Anthropic" },
  { domain: "cursor.com", label: "Cursor" },
  { domain: "cursor.sh", label: "Cursor" },
  { domain: "yandex.ru", label: "Яндекс" },
  { domain: "sberbank.ru", label: "Сбер" },
  { domain: "tinkoff.ru", label: "Т-Банк" },
  { domain: "tbank.ru", label: "Т-Банк" },
  { domain: "gosuslugi.ru", label: "Госуслуги" },
  { domain: "vk.com", label: "VK" },
  { domain: "mail.vk.com", label: "VK" },
];

type Cache = {
  byDomain: Map<string, VerifiedDomainInfo>;
  loadedAt: number;
};

const CACHE_TTL_MS = 60_000;
let cache: Cache | null = null;
let seedPromise: Promise<void> | null = null;

export async function seedVerifiedDomains(): Promise<number> {
  let n = 0;
  for (const row of DEFAULT_VERIFIED_DOMAINS) {
    const domain = row.domain.trim().toLowerCase();
    if (!domain) continue;
    await prisma.verifiedDomain.upsert({
      where: { domain },
      create: { domain, label: row.label },
      update: { label: row.label || undefined },
    });
    n += 1;
  }
  cache = null;
  return n;
}

async function ensureSeeded() {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    try {
      const count = await prisma.verifiedDomain.count();
      if (count === 0) await seedVerifiedDomains();
    } catch {
      /* table may not exist yet before db push */
    }
  })().finally(() => {
    seedPromise = null;
  });
  return seedPromise;
}

export async function loadVerifiedDomainMap(): Promise<
  Map<string, VerifiedDomainInfo>
> {
  await ensureSeeded();
  const now = Date.now();
  if (cache && now - cache.loadedAt < CACHE_TTL_MS) {
    return cache.byDomain;
  }
  try {
    const rows = await prisma.verifiedDomain.findMany({
      select: { domain: true, label: true },
    });
    const byDomain = new Map<string, VerifiedDomainInfo>();
    for (const r of rows) {
      const domain = r.domain.trim().toLowerCase();
      byDomain.set(domain, { domain, label: r.label || "" });
    }
    cache = { byDomain, loadedAt: now };
    return byDomain;
  } catch {
    return new Map();
  }
}

export function matchVerifiedDomain(
  fromEmail: string,
  map: Map<string, VerifiedDomainInfo>,
): VerifiedDomainInfo | null {
  if (!map.size) return null;
  const full = emailDomain(fromEmail);
  if (!full) return null;
  const hit = map.get(full) || map.get(rootDomain(full));
  return hit || null;
}

export async function resolveVerifiedDomain(
  fromEmail: string,
): Promise<VerifiedDomainInfo | null> {
  const map = await loadVerifiedDomainMap();
  return matchVerifiedDomain(fromEmail, map);
}

/** Attach senderVerified / verifiedLabel onto message DTOs. */
export async function attachVerifiedSenderFlags<
  T extends { fromEmail: string },
>(
  messages: T[],
): Promise<(T & { senderVerified: boolean; verifiedLabel?: string })[]> {
  if (!messages.length) return [];
  const map = await loadVerifiedDomainMap();
  return messages.map((m) => {
    const hit = matchVerifiedDomain(m.fromEmail, map);
    return {
      ...m,
      senderVerified: Boolean(hit),
      verifiedLabel: hit?.label || undefined,
    };
  });
}

export function invalidateVerifiedDomainCache() {
  cache = null;
}
