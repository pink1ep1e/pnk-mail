/** Public site origin for SEO, OAuth redirects, etc. */
export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_MAIL_URL?.replace(/\/$/, "") ||
    "https://pnkmail.ru"
  );
}

/** Official brand — always use this in UI and primary titles */
export const SITE_NAME = "pnk почта";
export const SITE_NAME_SHORT = "pnk Почта";
export const SITE_DOMAIN = "pnkmail.ru";

/**
 * How people may type the brand in Google (not the official name).
 * Used in keywords, alternateName, FAQ — not as the main title on the page.
 */
export const SITE_SEARCH_ALIASES = [
  "пнк почта",
  "ПНК почта",
  "pnk mail",
  "pnk Mail",
  "pnkmail",
  "почта pnk",
  "почта пнк",
];

export const DEFAULT_DESCRIPTION =
  "pnk почта — современный почтовый сервис с адресом @pnkmail.ru. Бесплатный ящик: письма и вложения, веб и приложение, вход через pnk ID. Обмен с Gmail, Яндекс Почтой и Mail.ru.";

export const DEFAULT_KEYWORDS = [
  "pnk почта",
  ...SITE_SEARCH_ALIASES,
  "pnkmail.ru",
  "@pnkmail.ru",
  "создать почту pnk",
  "создать почту @pnkmail.ru",
  "регистрация pnk почта",
  "открыть почту pnkmail",
  "электронная почта pnk",
  "веб-почта",
  "онлайн почта",
  "бесплатная почта",
  "российская электронная почта",
  "почта онлайн на русском",
  "почта с вложениями",
  "почта для бизнеса",
  "корпоративная почта",
  "альтернатива gmail",
  "альтернатива яндекс почте",
  "альтернатива mail.ru",
  "почта через браузер",
  "pnk ID почта",
];
