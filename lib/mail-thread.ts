/** Normalize RFC Message-ID: strip whitespace and angle brackets. */
export function normalizeRfcMessageId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/^<|>$/g, "").trim();
  return s ? s.slice(0, 500) : null;
}

/** Wrap a bare id as `<id>` (id may already include @domain). */
export function formatRfcMessageId(id: string): string {
  const bare = normalizeRfcMessageId(id) || id.trim();
  return `<${bare}>`;
}

/** Conversation key for list grouping. */
export function conversationKey(row: {
  id: string;
  threadId?: string | null;
}): string {
  return row.threadId || row.id;
}

/** Extract Message-IDs from In-Reply-To / References header values. */
export function parseMessageIdList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const matches = raw.match(/<[^>]+>/g);
  if (matches?.length) {
    return [
      ...new Set(
        matches
          .map((m) => normalizeRfcMessageId(m))
          .filter((x): x is string => Boolean(x)),
      ),
    ];
  }
  const one = normalizeRfcMessageId(raw);
  return one ? [one] : [];
}

/** Case-insensitive header lookup. */
export function headerValue(
  headers: Record<string, string> | undefined | null,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const want = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === want && typeof v === "string") return v;
  }
  return undefined;
}

/** Strip Re:/Fwd: for weak subject threading. */
export function normalizeSubject(subject: string): string {
  return subject
    .replace(/^\s*((re|fw|fwd|aw|sv|antw)\s*:\s*)+/gi, "")
    .trim()
    .toLowerCase()
    .slice(0, 500);
}
