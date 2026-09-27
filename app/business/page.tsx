import type { Metadata } from "next";
import BusinessPage from "@/components/shared/business-page";
import { JsonLd } from "@/components/shared/json-ld";
import { buildPageMetadata, softwareApplicationJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Почта для бизнеса",
  description:
    "Корпоративная почта pnk для магазина и бренда. Адреса на вашем домене, ящики команды, письма клиентам с @вашего бизнеса.",
  path: "/business",
  keywords: [
    "почта для бизнеса",
    "корпоративная почта",
    "почта на своём домене",
    "бизнес email",
    "pnk почта бизнес",
    "пнк почта для бизнеса",
    "pnkmail бизнес",
    "корпоративная почта pnk",
  ],
});

export default function Page() {
  return (
    <>
      <JsonLd data={softwareApplicationJsonLd()} />
      <BusinessPage />
    </>
  );
}
