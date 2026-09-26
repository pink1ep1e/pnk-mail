export type MailAttachmentMeta = {
  id: string;
  name: string;
  size: number;
  type: string;
  /** data: URL or https download URL */
  href: string;
};

const ATTACH_MARKER = "data-pnk-attachments";

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
  return `${(n / (1024 * 1024)).toFixed(1)} МБ`;
}

/** Escape for HTML attributes / text. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Build a visible attachment block appended to outbound / stored HTML. */
export function buildAttachmentsHtml(
  items: Array<{ name: string; size: number; type: string; dataUrl: string }>,
): string {
  if (!items.length) return "";
  const rows = items
    .map((a) => {
      const safeName = esc(a.name);
      return `<li style="margin:0 0 8px;list-style:none;">
  <a ${ATTACH_MARKER}="1" href="${a.dataUrl}" download="${safeName}" data-name="${safeName}" data-size="${a.size}" data-type="${esc(a.type || "application/octet-stream")}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:rgba(0,102,255,0.12);border:1px solid rgba(0,102,255,0.25);text-decoration:none;color:#4d9fff;">
    <span style="font-size:18px;line-height:1;">📎</span>
    <span style="min-width:0;flex:1;">
      <span style="display:block;font-size:14px;font-weight:600;color:#e8eaef;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeName}</span>
      <span style="display:block;font-size:12px;color:rgba(255,255,255,0.45);margin-top:2px;">${formatBytes(a.size)} · скачать</span>
    </span>
  </a>
</li>`;
    })
    .join("");
  return `<div ${ATTACH_MARKER}-wrap="1" style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.12);">
<p style="margin:0 0 10px;font-size:13px;color:rgba(255,255,255,0.55);font-weight:600;">Вложения (${items.length})</p>
<ul style="margin:0;padding:0;">${rows}</ul>
</div>`;
}

/** Parse downloadable attachments from message HTML (ours + generic download links). */
export function extractAttachmentsFromHtml(html: string): MailAttachmentMeta[] {
  if (!html) return [];
  const out: MailAttachmentMeta[] = [];
  const seen = new Set<string>();

  const re =
    /<a\b[^>]*\bhref=["'](data:[^"']+|https?:[^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const href = m[1];
    const isOurs = tag.includes(ATTACH_MARKER) || /download=/i.test(tag);
    const looksFile =
      href.startsWith("data:") ||
      /\.(pdf|zip|docx?|xlsx?|pptx?|png|jpe?g|gif|webp|txt|csv|rar|7z)(\?|#|$)/i.test(
        href,
      );
    if (!isOurs && !looksFile) continue;

    const nameMatch =
      tag.match(/download=["']([^"']+)["']/i) ||
      tag.match(/data-name=["']([^"']+)["']/i);
    const sizeMatch = tag.match(/data-size=["'](\d+)["']/i);
    const typeMatch = tag.match(/data-type=["']([^"']+)["']/i);
    let name = nameMatch?.[1] || "файл";
    try {
      name = decodeURIComponent(name);
    } catch {
      /* keep */
    }
    const key = `${name}:${href.slice(0, 64)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `att-${out.length}-${name}`,
      name,
      size: sizeMatch ? Number(sizeMatch[1]) : 0,
      type: typeMatch?.[1] || "application/octet-stream",
      href,
    });
  }
  return out;
}

/** Strip our attachment block from HTML before re-appending (optional). */
export function stripAttachmentsBlock(html: string): string {
  return html.replace(
    new RegExp(
      `<div[^>]*${ATTACH_MARKER}-wrap=["']1["'][^>]*>[\\s\\S]*?<\\/div>`,
      "i",
    ),
    "",
  );
}

export function dataUrlToBase64Parts(dataUrl: string): {
  contentType: string;
  content: string;
} | null {
  const m = /^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,([\s\S]*)$/i.exec(
    dataUrl,
  );
  if (!m) return null;
  const contentType = m[1] || "application/octet-stream";
  const isB64 = Boolean(m[2]);
  const payload = m[3] || "";
  if (isB64) return { contentType, content: payload };
  try {
    const bin = unescape(encodeURIComponent(decodeURIComponent(payload)));
    const b64 =
      typeof Buffer !== "undefined"
        ? Buffer.from(bin, "binary").toString("base64")
        : btoa(bin);
    return { contentType, content: b64 };
  } catch {
    return null;
  }
}
