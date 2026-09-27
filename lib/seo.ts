import type { Metadata } from "next";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  SITE_SEARCH_ALIASES,
  SITE_DOMAIN,
  SITE_NAME,
  SITE_NAME_SHORT,
  getSiteUrl,
} from "@/lib/site";

type PageSeo = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
};

export function buildPageMetadata({
  title,
  description,
  path = "/",
  keywords = DEFAULT_KEYWORDS,
  noIndex = false,
}: PageSeo): Metadata {
  const base = getSiteUrl();
  const url = `${base}${path === "/" ? "" : path}`;
  const fullTitle =
    title === SITE_NAME || title === SITE_NAME_SHORT
      ? `${SITE_NAME} — электронная почта @pnkmail.ru`
      : `${title} · ${SITE_NAME}`;

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      url,
      siteName: SITE_NAME_SHORT,
      title: fullTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

export function organizationJsonLd() {
  const base = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME_SHORT,
    alternateName: SITE_SEARCH_ALIASES,
    legalName: "pnk почта",
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
      alternateName: SITE_SEARCH_ALIASES,
    },
    url: base,
    logo: `${base}/icon-512.png`,
    image: `${base}/icon-512.png`,
    email: `hello@${SITE_DOMAIN}`,
    description: DEFAULT_DESCRIPTION,
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: `hello@${SITE_DOMAIN}`,
      availableLanguage: ["Russian", "ru"],
      areaServed: "RU",
    },
  };
}

export function websiteJsonLd() {
  const base = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME_SHORT,
    alternateName: SITE_SEARCH_ALIASES,
    url: base,
    inLanguage: "ru-RU",
    description: DEFAULT_DESCRIPTION,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME_SHORT,
      alternateName: SITE_SEARCH_ALIASES,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${base}/help?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function softwareApplicationJsonLd() {
  const base = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME_SHORT,
    alternateName: SITE_SEARCH_ALIASES,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "EmailClient",
    operatingSystem: "Web, iOS, Android",
    url: base,
    image: `${base}/icon-512.png`,
    description: DEFAULT_DESCRIPTION,
    featureList: [
      "Адрес @pnkmail.ru",
      "Письма и вложения",
      "Веб-интерфейс и PWA",
      "Вход через pnk ID",
      "Обмен с Gmail, Яндекс и Mail.ru",
    ],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "RUB",
    },
    inLanguage: "ru-RU",
    countriesSupported: "RU",
  };
}

export function emailServiceJsonLd() {
  const base = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${SITE_NAME} — электронная почта`,
    alternateName: SITE_SEARCH_ALIASES,
    serviceType: "Email hosting",
    provider: {
      "@type": "Organization",
      name: SITE_NAME_SHORT,
    },
    url: base,
    description: DEFAULT_DESCRIPTION,
    areaServed: {
      "@type": "Country",
      name: "Russia",
    },
    audience: {
      "@type": "Audience",
      audienceType: "Individuals and businesses",
    },
  };
}

export function faqJsonLd(
  items: Array<{ question: string; answer: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export const HOME_FAQ = [
  {
    question: "Что такое pnk почта?",
    answer:
      "pnk почта — современный почтовый сервис с адресом вида имя@pnkmail.ru: веб-ящик, приложение, письма, вложения и вход через pnk ID. Если в поиске писали «пнк почта» или pnk mail — это тот же сервис.",
  },
  {
    question: "Чем pnk почта отличается от обычной почты?",
    answer:
      "Это отдельный бренд почты на домене pnkmail.ru: быстрый русскоязычный интерфейс, крупные кнопки, удобные вложения и один аккаунт pnk ID для входа с телефона или компьютера.",
  },
  {
    question: "Как создать почту на pnkmail.ru?",
    answer:
      "Откройте pnkmail.ru, нажмите «Открыть почту» и войдите или зарегистрируйтесь через pnk ID. Ящик @pnkmail.ru создаётся автоматически.",
  },
  {
    question: "Можно ли писать на Gmail, Яндекс и Mail.ru?",
    answer:
      "Да. С адреса @pnkmail.ru можно отправлять и получать письма с Gmail, Яндекс Почты, Mail.ru и других сервисов по всему миру.",
  },
  {
    question: "pnk почта бесплатная?",
    answer:
      "Личный ящик @pnkmail.ru можно открыть бесплатно. Для команд и магазинов есть pnk почта для бизнеса с корпоративными адресами.",
  },
  {
    question: "Есть ли почта для бизнеса?",
    answer:
      "Да. На странице «Для бизнеса» можно оформить корпоративную почту на базе pnk для сотрудников и клиентов.",
  },
];
