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

/**
 * Hidden storage block for attachments (data URLs).
 * Not shown in the reader iframe — UI is MailAttachmentsList only.
 */
export function buildAttachmentsHtml(
  items: Array<{ name: string; size: number; type: string; dataUrl: string }>,
): string {
  if (!items.length) return "";
  const rows = items
    .map((a) => {
      const safeName = esc(a.name);
      return `<a ${ATTACH_MARKER}="1" href="${a.dataUrl}" download="${safeName}" data-name="${safeName}" data-size="${a.size}" data-type="${esc(a.type || "application/octet-stream")}"></a>`;
    })
    .join("");
  return `<div ${ATTACH_MARKER}-wrap="1" hidden style="display:none!important;height:0;overflow:hidden;font-size:0;line-height:0;opacity:0;pointer-events:none" aria-hidden="true">${rows}</div>`;
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
      /\.(pdf|zip|docx?|xlsx?|pptx?|png|jpe?g|gif|webp|txt|csv|rar|7z|mp[34]|wav|avi|mkv)(\?|#|$)/i.test(
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
    const key = `${name}:${href.slice(0, 80)}`;
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

/** Remove attachment storage/UI from HTML shown inside the reader iframe. */
export function stripAttachmentsBlock(html: string): string {
  if (!html) return html;
  let out = html.replace(
    new RegExp(
      `<div[^>]*${ATTACH_MARKER}-wrap=["']1["'][^>]*>[\\s\\S]*?<\\/div>`,
      "gi",
    ),
    "",
  );
  // Legacy visible attachment sections from older builds
  out = out.replace(
    /<div[^>]*>\s*<p[^>]*>Вложения[^<]*<\/p>\s*<ul[\s\S]*?<\/ul>\s*<\/div>/gi,
    "",
  );
  out = out.replace(
    /<hr[^>]*>\s*<p[^>]*>Вложения<\/p>\s*<ul[\s\S]*?<\/ul>/gi,
    "",
  );
  return out;
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
