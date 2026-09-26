import type { Metadata } from "next";
import MailApp from "@/components/mail/mail-app";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Входящие",
  description: "Ваш ящик pnk почты",
  path: "/mail",
  noIndex: true,
});

export default function Page() {
  return <MailApp />;
}
