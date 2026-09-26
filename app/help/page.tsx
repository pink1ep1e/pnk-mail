import type { Metadata } from "next";
import HelpPage from "@/components/shared/help-page";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Справка",
  description:
    "Справка pnk почты: вход, безопасность, вложения, уведомления и ответы на частые вопросы по @pnkmail.ru.",
  path: "/help",
  keywords: [
    "справка pnk почта",
    "помощь почта",
    "как пользоваться pnkmail",
    "вход в почту",
  ],
});

export default function Page() {
  return <HelpPage />;
}
