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
    color: rgba(255,255,255,0.88);
    font-family: Manrope, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }
  body { padding: 4px 2px 20px; }
  a { color: #4d9fff; }
  img, video { max-width: 100%; height: auto; }
  p { margin: 0 0 0.85em; }
  h1, h2, h3, h4 { color: #fff; line-height: 1.25; }
  ul, ol { padding-left: 1.25em; }
  blockquote {
    margin: 0.75em 0;
    padding: 0.35em 0 0.35em 0.9em;
    border-left: 3px solid rgba(255,255,255,0.18);
    color: rgba(255,255,255,0.65);
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

/**
 * Build srcDoc for the in-app reader: real HTML support on a dark canvas.
 * Does not strip the author's markup — only adds a safe base stylesheet.
 */
export function prepareMailReaderSrcDoc(html: string): string {
  const raw = (html || "").trim() || "<p></p>";
  const safe = isFullHtmlDocument(raw)
    ? sanitizeMailHtml(raw, true)
    : sanitizeMailHtml(raw, false);

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
 * Light-neutral shell for external clients (Gmail/Yandex).
 * In-app we store author HTML separately and render with prepareMailReaderSrcDoc.
 */
export function wrapMailHtml(params: {
  bodyHtml: string;
  preheader?: string;
  title?: string;
}): string {
  const preheader = escapeHtml(params.preheader || "");
  const title = escapeHtml(params.title || "pnk почта");
  const body = sanitizeMailHtml(params.bodyHtml);
  const base = process.env.NEXT_PUBLIC_MAIL_URL?.replace(/\/$/, "");
  const logoSrc = `${base || ""}/logo-blue-text.svg`;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0c0d10;font-family:Manrope,Segoe UI,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0d10;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding-bottom:18px;">
              <img src="${escapeHtml(logoSrc)}" alt="pnk почта" width="132" height="70" style="display:block;margin:0 auto;border:0;width:132px;height:auto;" />
            </td>
          </tr>
          <tr>
            <td style="background:#1a1c22;border-radius:18px;padding:24px 22px;">
              <div style="color:rgba(255,255,255,0.9);font-size:15px;line-height:1.65;">
                ${body}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 8px 0;color:rgba(255,255,255,0.28);font-size:12px;text-align:center;">
              Отправлено через pnk почту · pnkmail.ru
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
