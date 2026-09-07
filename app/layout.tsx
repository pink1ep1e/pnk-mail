import type { Metadata } from "next";
import { Unbounded, Manrope } from "next/font/google";
import "./globals.css";

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-unbounded",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "pnk почта — письма и вложения без границ",
  description:
    "Быстрая и защищённая почта с крупным интерфейсом. Войдите по логину, QR или телефону.",
  icons: {
    icon: "/logo-big-mail.svg",
    apple: "/logo-big-mail.svg",
  },
  keywords: ["pnk почта", "пнк почта", "электронная почта", "mail", "почта"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "pnk почта",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#0c0d10",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${unbounded.variable} ${manrope.variable} antialiased bg-[#0a1a3a] text-white`}
      >
        {children}
      </body>
    </html>
  );
}
