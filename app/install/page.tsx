import type { Metadata } from "next";
import InstallPage from "@/components/shared/install-page";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Установить приложение",
  description:
    "Установите pnk почту на телефон или компьютер: быстрый доступ к @pnkmail.ru, уведомления о письмах, работа как приложение.",
  path: "/install",
  keywords: [
    "установить pnk почта",
    "приложение почта",
    "PWA почта",
    "pnkmail установить",
  ],
});

export default function Page() {
  return <InstallPage />;
}
