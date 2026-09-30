import type { Metadata } from "next";
import ResumePage from "@/components/shared/resume-page";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Резюме — продуктовый аналитик",
  description:
    "Резюме продуктового аналитика с техническим бэкграундом: SQL, метрики, Next.js, собственные продукты PNK VPN и PNK Почта.",
  path: "/resume",
  keywords: [
    "резюме продуктовый аналитик",
    "product analyst",
    "SQL аналитик",
    "pnk почта",
    "продуктовая аналитика",
  ],
});

export default function Page() {
  return <ResumePage />;
}
