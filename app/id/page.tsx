import type { Metadata } from "next";
import PnkIdPage from "@/components/shared/pnk-id-page";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "pnk ID",
  description: "Управление аккаунтом pnk ID",
  path: "/id",
  noIndex: true,
});

export default function Page() {
  return <PnkIdPage />;
}
