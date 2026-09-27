import type { Metadata } from "next";
import LandingPage from "@/components/shared/landing";
import { JsonLd } from "@/components/shared/json-ld";
import {
  HOME_FAQ,
  buildPageMetadata,
  emailServiceJsonLd,
  faqJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: SITE_NAME,
  description: DEFAULT_DESCRIPTION,
  path: "/",
});

export default function Home() {
  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(),
          websiteJsonLd(),
          softwareApplicationJsonLd(),
          emailServiceJsonLd(),
          faqJsonLd(HOME_FAQ),
        ]}
      />
      <LandingPage />
    </>
  );
}
