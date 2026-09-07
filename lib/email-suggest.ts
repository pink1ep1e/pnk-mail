const CYRILLIC_MAP: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

export const MAIL_DOMAIN = "pnk.mail";

export function transliterate(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split("")
    .map((char) => {
      if (CYRILLIC_MAP[char] !== undefined) return CYRILLIC_MAP[char];
      if (/[a-z0-9]/.test(char)) return char;
      if (char === " " || char === "-" || char === "_") return "";
      return "";
    })
    .join("");
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

/** Local-part suggestions from first + last name (Mail.ru / Yandex style). */
export function suggestEmailLocals(firstName: string, lastName: string): string[] {
  const first = transliterate(firstName);
  const last = transliterate(lastName);

  if (!first && !last) return [];

  const suggestions: string[] = [];

  if (first && last) {
    suggestions.push(
      `${first}.${last}`,
      `${first}_${last}`,
      `${first[0]}.${last}`,
      `${first}${last}`,
      `${last}.${first}`,
      `${last}_${first}`,
      `${first}.${last[0]}`,
      last,
      first,
    );
  } else {
    suggestions.push(first || last);
  }

  return unique(suggestions).slice(0, 6);
}

export function formatEmail(local: string): string {
  return `${local}@${MAIL_DOMAIN}`;
}

export function sanitizeLocal(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 32);
}
