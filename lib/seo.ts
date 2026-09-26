import type { Metadata } from "next";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
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
    legalName: "pnk почта",
    url: base,
    logo: `${base}/icon-512.png`,
    email: `hello@${SITE_DOMAIN}`,
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: `hello@${SITE_DOMAIN}`,
      availableLanguage: ["Russian"],
    },
  };
}

export function websiteJsonLd() {
  const base = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME_SHORT,
    url: base,
    inLanguage: "ru-RU",
    description: DEFAULT_DESCRIPTION,
    publisher: { "@type": "Organization", name: SITE_NAME_SHORT },
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
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Email",
    operatingSystem: "Web, iOS, Android",
    url: base,
    image: `${base}/icon-512.png`,
    description: DEFAULT_DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "RUB",
    },
    inLanguage: "ru-RU",
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
      "pnk почта — российский почтовый сервис с адресами @pnkmail.ru. Письма, вложения, веб-интерфейс и вход через pnk ID.",
  },
  {
    question: "Как создать почту на pnkmail.ru?",
    answer:
      "Откройте pnkmail.ru, нажмите «Открыть почту» и войдите или зарегистрируйтесь через pnk ID. Ящик @pnkmail.ru создаётся автоматически.",
  },
  {
    question: "Можно ли писать на Gmail и Яндекс?",
    answer:
      "Да. С @pnkmail.ru можно отправлять и получать письма с Gmail, Яндекс, Mail.ru и других сервисов.",
  },
  {
    question: "Есть ли почта для бизнеса?",
    answer:
      "Да. На странице «Для бизнеса» можно оформить корпоративную почту для команды и клиентов.",
  },
];
