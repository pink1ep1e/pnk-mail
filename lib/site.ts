/** Public site origin for SEO, OAuth redirects, etc. */
export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_MAIL_URL?.replace(/\/$/, "") ||
    "https://pnkmail.ru"
  );
}

export const SITE_NAME = "pnk почта";
export const SITE_NAME_SHORT = "pnk Почта";
export const SITE_DOMAIN = "pnkmail.ru";

/** Alternate brand spellings for search / structured data */
export const SITE_ALT_NAMES = [
  "пнк почта",
  "ПНК почта",
  "pnk Mail",
  "pnkmail",
  "pnkmail.ru",
  "почта pnk",
  "почта пнк",
];

export const DEFAULT_DESCRIPTION =
  "pnk почта (пнк почта, pnk Mail) — современный почтовый сервис с адресом @pnkmail.ru. Бесплатный ящик: письма и вложения, веб и приложение, вход через pnk ID. Обмен с Gmail, Яндекс Почтой и Mail.ru.";

export const DEFAULT_KEYWORDS = [
  "pnk почта",
  "пнк почта",
  "ПНК почта",
  "pnk Mail",
  "pnk mail",
  "pnkmail",
  "pnkmail.ru",
  "@pnkmail.ru",
  "почта pnk",
  "почта пнк",
  "создать почту pnk",
  "создать почту пнк",
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
