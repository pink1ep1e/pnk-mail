import DOMPurify from "isomorphic-dompurify";

/** Allow safe HTML + inline styles (needed for branded / rich email). */
export function sanitizeMailHtml(html: string, wholeDocument = false): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    WHOLE_DOCUMENT: wholeDocument,
    FORBID_TAGS: ["iframe", "object", "embed", "form", "input", "script"],
    ALLOW_DATA_ATTR: false,
    ADD_TAGS: wholeDocument
      ? ["html", "head", "body", "meta", "style", "title", "link"]
      : ["style"],
    ADD_ATTR: ["target", "style", "charset", "content", "name", "http-equiv", "rel", "href"],
  });
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isFullHtmlDocument(html: string): boolean {
  return /<html[\s>]/i.test(html) || /<!DOCTYPE/i.test(html);
}

/** Dark reader chrome for fragments / docs that lost their styles. */
const READER_BASE_CSS = `
  html, body {
    margin: 0;
    padding: 0;
    background: #0c0d10 !important;
    color: rgba(255,255,255,0.90);
    font-family: Manrope, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  body { padding: 0 2px 8px; }
  a {
    color: #4d9fff !important;
    text-decoration: underline !important;
    cursor: pointer !important;
    pointer-events: auto !important;
  }
  a:hover { color: #7db8ff !important; }
  a[href="#"], a:not([href]) {
    color: inherit !important;
    text-decoration: none !important;
    cursor: default !important;
  }
  img, video { max-width: 100%; height: auto; }
  p { margin: 0 0 0.55em; }
  p:last-child { margin-bottom: 0; }
  h1, h2, h3, h4 { color: #fff; line-height: 1.25; }
  ul, ol { padding-left: 1.25em; }
  blockquote,
  .gmail_quote,
  .gmail_quote blockquote,
  .yahoo_quoted,
  .protonmail_quote,
  [class*="gmail_quote"] {
    margin: 0.55em 0 0 !important;
    padding: 0.2em 0 0.2em 0.85em !important;
    border-left: 3px solid rgba(255,255,255,0.22) !important;
    color: rgba(255,255,255,0.72) !important;
  }
  blockquote *,
  .gmail_quote *,
  .yahoo_quoted *,
  .protonmail_quote *,
  [class*="gmail_quote"] * {
    color: rgba(255,255,255,0.72) !important;
  }
  .gmail_attr,
  .gmail_attr * {
    color: rgba(255,255,255,0.48) !important;
    margin-bottom: 0.35em !important;
  }
  /* Collapse Gmail's empty spacer lines at the top of replies */
  body > br:first-child,
  body > div:empty:first-child,
  body > p:empty:first-child {
    display: none !important;
  }
  table { border-collapse: collapse; max-width: 100%; }
  pre, code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.92em;
  }
  pre {
    overflow: auto;
    padding: 12px 14px;
    border-radius: 12px;
    background: #1a1c22;
  }
`;

/** True if a CSS color is too dark for our dark reader canvas. */
function isDarkCssColor(raw: string): boolean {
  const c = raw.trim().toLowerCase();
  if (!c || c === "transparent" || c === "inherit" || c === "currentcolor") {
    return false;
  }
  if (
    /^(black|#000|#000000|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)|#111|#111111|#222|#222222|#333|#333333|#444|#444444|#555|#555555)$/i.test(
      c,
    )
  ) {
    return true;
  }
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    // relative luminance
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 90;
  }
  const rgb = c.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/i,
  );
  if (rgb) {
    const r = Number(rgb[1]);
    const g = Number(rgb[2]);
    const b = Number(rgb[3]);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 90;
  }
  return /^(gray|grey|dimgray|dimgrey|darkgray|darkgrey|maroon|navy|purple|teal|olive|green|blue)$/i.test(
    c,
  );
}

/** Rewrite dark inline/font colors so quotes stay readable on dark canvas. */
function lightenDarkTextColors(html: string): string {
  let out = html.replace(/\bstyle\s*=\s*(["'])(.*?)\1/gi, (_m, q: string, style: string) => {
    const next = style.replace(/(^|;)\s*color\s*:\s*([^;]+)/gi, (seg, pre: string, color: string) => {
      if (isDarkCssColor(color)) {
        return `${pre}color: rgba(255,255,255,0.78)`;
      }
      return seg;
    });
    return `style=${q}${next}${q}`;
  });
  out = out.replace(
    /<font\b([^>]*?)\bcolor\s*=\s*(["']?)([^"'>\s]+)\2([^>]*)>/gi,
    (_m, pre: string, _q: string, color: string, post: string) => {
      if (isDarkCssColor(color)) {
        return `<font${pre}color="#c8cdd6"${post}>`;
      }
      return `<font${pre}color="${color}"${post}>`;
    },
  );
  return out;
}

/** Drop leading empty paragraphs / brs that push reply text down. */
function trimLeadingEmptyMarkup(html: string): string {
  let s = html.trim();
  for (let i = 0; i < 12; i++) {
    const next = s
      .replace(/^(?:\s|&nbsp;|<br\s*\/?>)+/i, "")
      .replace(/^<(p|div)(?:\s[^>]*)?>\s*(?:<br\s*\/?>|\s|&nbsp;)*<\/\1>/i, "")
      .trim();
    if (next === s) break;
    s = next;
  }
  return s || html;
}

const URL_IN_TEXT_RE =
  /\b((?:https?:\/\/|www\.)[^\s<>"'`]+[^\s<>"'`.,;:!?\])}])/gi;

function normalizeHref(href: string): string | null {
  const raw = href.trim().replace(/^['"]|['"]$/g, "");
  if (!raw || /^javascript:/i.test(raw) || /^data:/i.test(raw)) return null;
  if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw;
  if (/^\/\//.test(raw)) return `https:${raw}`;
  if (/^www\./i.test(raw)) return `https://${raw}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(raw)) return `https://${raw}`;
  return raw;
}

/** Wrap bare http(s)/www URLs that are not already inside an <a>. */
function linkifyBareUrls(html: string): string {
  const parts = html.split(/(<a\b[^>]*>[\s\S]*?<\/a>|<[^>]+>)/gi);
  return parts
    .map((part) => {
      if (!part || part.startsWith("<")) return part;
      return part.replace(URL_IN_TEXT_RE, (url) => {
        const href = normalizeHref(url);
        if (!href) return url;
        return `<a href="${escapeHtml(href)}">${url}</a>`;
      });
    })
    .join("");
}

/** Force safe external navigation for every link in reader HTML. */
function ensureClickableLinks(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (_m, attrs: string) => {
    let next = attrs;
    const hrefMatch = next.match(/\bhref\s*=\s*(["']?)([^"'>\s]*)\1/i);
    if (!hrefMatch) return `<a${attrs}>`;
    const normalized = normalizeHref(hrefMatch[2] || "");
    if (!normalized) {
      next = next.replace(/\bhref\s*=\s*(["']?)([^"'>\s]*)\1/i, 'href="#"');
    } else {
      next = next.replace(
        /\bhref\s*=\s*(["']?)([^"'>\s]*)\1/i,
        `href="${escapeHtml(normalized)}"`,
      );
    }
    if (/\btarget\s*=/i.test(next)) {
      next = next.replace(/\btarget\s*=\s*(["']).*?\1/i, 'target="_blank"');
    } else {
      next += ' target="_blank"';
    }
    if (/\brel\s*=/i.test(next)) {
      next = next.replace(/\brel\s*=\s*(["']).*?\1/i, 'rel="noopener noreferrer"');
    } else {
      next += ' rel="noopener noreferrer"';
    }
    return `<a${next}>`;
  });
}

/**
 * Build srcDoc for the in-app reader: real HTML support on a dark canvas.
 * Does not strip the author's markup — only adds a safe base stylesheet.
 */
export function prepareMailReaderSrcDoc(html: string): string {
  const raw = (html || "").trim() || "<p></p>";
  const cleaned = isFullHtmlDocument(raw)
    ? sanitizeMailHtml(raw, true)
    : sanitizeMailHtml(raw, false);
  const trimmed = isFullHtmlDocument(cleaned)
    ? cleaned.replace(
        /<body([^>]*)>([\s\S]*?)<\/body>/i,
        (_m, attrs: string, body: string) =>
          `<body${attrs}>${trimLeadingEmptyMarkup(body)}</body>`,
      )
    : trimLeadingEmptyMarkup(cleaned);
  const safe = lightenDarkTextColors(
    ensureClickableLinks(linkifyBareUrls(trimmed)),
  );

  if (isFullHtmlDocument(safe)) {
    if (/<head[\s>]/i.test(safe)) {
      return safe.replace(
        /<head([^>]*)>/i,
        `<head$1><style data-pnk-reader>${READER_BASE_CSS}</style>`,
      );
    }
    return safe.replace(
      /<html([^>]*)>/i,
      `<html$1><head><meta charset="utf-8"/><style data-pnk-reader>${READER_BASE_CSS}</style></head>`,
    );
  }

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style data-pnk-reader>${READER_BASE_CSS}</style>
</head>
<body>${safe}</body>
</html>`;
}

/**
 * Minimal HTML document for external clients (no branding shell).
 * Prefer sending author HTML as-is via sanitize + this only when a full doc is needed.
 */
export function outboundMailHtml(bodyHtml: string): string {
  const body = sanitizeMailHtml(bodyHtml);
  if (isFullHtmlDocument(body)) return body;
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#222;">
${body}
</body>
</html>`;
}

/** @deprecated Branding wrap removed — use outboundMailHtml / author HTML as-is. */
export function wrapMailHtml(params: {
  bodyHtml: string;
  preheader?: string;
  title?: string;
}): string {
  return outboundMailHtml(params.bodyHtml);
}

/** Welcome letter — short dark greeting with mail logo. */
export function welcomeMailHtml(address: string): string {
  const safe = escapeHtml(address);
  const base = process.env.NEXT_PUBLIC_MAIL_URL?.replace(/\/$/, "");
  const logoSrc = `${base || ""}/logo-blue-text.svg`;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Добро пожаловать в pnk почту</title>
</head>
<body style="margin:0;padding:0;background:#0c0d10;font-family:Manrope,Segoe UI,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;" data-pnk-welcome="v3">Добро пожаловать в pnk почту · ${safe}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0d10;padding:48px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;">
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <img src="${escapeHtml(logoSrc)}" alt="pnk почта" width="160" height="85" style="display:block;margin:0 auto;border:0;width:160px;height:auto;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="background:#1a1c22;border-radius:20px;padding:36px 28px;">
              <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.03em;margin-bottom:12px;">Добро пожаловать</div>
              <div style="color:rgba(255,255,255,0.55);font-size:15px;line-height:1.55;">
                Ящик <span style="color:#4d9fff;">${safe}</span> готов.<br />
                Пишите на @pnkmail.ru — письма доставляются сразу.
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:20px;color:rgba(255,255,255,0.28);font-size:12px;">
              pnkmail.ru
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
