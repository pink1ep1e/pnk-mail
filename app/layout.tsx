import type { Metadata, Viewport } from "next";
import { Unbounded, Manrope } from "next/font/google";
import { OfflineProvider } from "@/components/shared/offline-provider";
import { InstallPrompt } from "@/components/shared/install-prompt";
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
  title: "pnk почта",
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
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(display-mode: standalone)", color: "#0c0d10" },
    { color: "#0c0d10" },
  ],
};

const offlineBootScript = `(()=>{try{
  var boot=document.getElementById('offline-boot');
  var btn=document.getElementById('offline-boot-reload');
  if(!boot)return;
  function show(){boot.hidden=false}
  function hide(){boot.hidden=true}
  if(navigator.onLine===false)show();
  window.addEventListener('offline',show);
  window.addEventListener('online',hide);
  if(btn)btn.addEventListener('click',function(){location.reload()});
  if(window.matchMedia('(display-mode:standalone)').matches||window.navigator.standalone)document.documentElement.classList.add('standalone');
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(function(r){try{r.update()}catch(e){}}).catch(function(){});
}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${unbounded.variable} ${manrope.variable} antialiased bg-[#0c0d10] text-white font-[family-name:var(--font-manrope)]`}
      >
        <div
          id="offline-boot"
          hidden
          suppressHydrationWarning
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "#0c0d10",
            color: "#fff",
            fontFamily:
              'var(--font-manrope, -apple-system), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          }}
        >
          <div style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>
            <div
              style={{
                width: 72,
                height: 72,
                margin: "0 auto 24px",
                borderRadius: 18,
                overflow: "hidden",
              }}
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-192.png"
                alt=""
                width={72}
                height={72}
                style={{ width: "100%", height: "100%", display: "block" }}
              />
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                letterSpacing: "-0.03em",
                fontWeight: 600,
              }}
            >
              Нет интернета
            </h1>
            <p
              style={{
                margin: "12px 0 0",
                fontSize: 15,
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.45)",
              }}
            >
              Проверьте подключение или выключите VPN и обновите страницу.
            </p>
            <button
              id="offline-boot-reload"
              type="button"
              style={{
                marginTop: 32,
                width: "100%",
                height: 48,
                border: 0,
                borderRadius: 14,
                background: "#0066ff",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              Обновить страницу
            </button>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: offlineBootScript }} />
        <OfflineProvider>
          {children}
          <InstallPrompt />
        </OfflineProvider>
      </body>
    </html>
  );
}
