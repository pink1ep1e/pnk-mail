import type { Metadata } from "next";
import { Unbounded, Manrope } from "next/font/google";
import { PwaRegister } from "@/components/shared/pwa-register";
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
  applicationName: "pnk почта",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  keywords: ["pnk почта", "пнк почта", "электронная почта", "mail", "почта"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "pnk почта",
  },
  other: {
    "mobile-web-app-capable": "yes",
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
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
