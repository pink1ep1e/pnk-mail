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

export const DEFAULT_DESCRIPTION =
  "pnk почта — быстрая российская электронная почта @pnkmail.ru. Письма и вложения без границ, вход через pnk ID, веб и приложение.";

export const DEFAULT_KEYWORDS = [
  "pnk почта",
  "пнк почта",
  "pnkmail",
  "pnkmail.ru",
  "электронная почта",
  "почта онлайн",
  "создать почту",
  "российская почта",
  "веб-почта",
  "почта с вложениями",
  "почта для бизнеса",
  "корпоративная почта",
];
