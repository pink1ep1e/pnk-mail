import type { Metadata } from "next";
import TermsPage from "@/components/shared/terms-page";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Условия использования",
  description:
    "Условия использования сервиса pnk почта (@pnkmail.ru): правила аккаунта, конфиденциальность и ответственность.",
  path: "/legal/terms",
});

export default function Page() {
  return <TermsPage />;
}
