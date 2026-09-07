"use client";

import { Header } from "@/components/shared/header";
import { mailAuthStartUrl } from "@/lib/id-auth";
import Image from "next/image";
import { useEffect, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [hint, setHint] = useState("Готовим ваш почтовый ящик...");

  const hints = [
    "Скоро откроем ваш ящик...",
    "Шифруем соединение...",
    "Почта без границ ждёт вас.",
    "Почти готово — ещё секунда.",
  ];

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: false,
    });
  }, []);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * hints.length);
      setHint(hints[randomIndex]);
    }, 1800);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const handleButtonClick = (url: string) => {
    setIsLoading(true);
    window.location.href = url;
  };

  return (
    <div style={{ overflow: "hidden" }} className="min-h-screen bg-[#0066ff] text-white">
      {isLoading && (
        <div className="fixed inset-0 bg-[#0a1a3a] flex items-center justify-center z-[9999]">
          <div className="flex flex-col items-center px-6">
            <div className="flex items-center font-[family-name:var(--font-unbounded)] font-bold text-[36px] md:text-[64px] gap-3 select-none">
              <h1>pnk</h1>
              <h1 className="text-white/50">почта</h1>
            </div>
            <div className="animate-spin rounded-full mt-10 h-20 w-20 border-t-4 border-b-4 border-white" />
            <div className="mt-10 text-lg text-center font-[family-name:var(--font-manrope)] text-white/60">
              {hint}
            </div>
          </div>
        </div>
      )}

      <section className="relative min-h-[100svh] bg-[#0066ff] overflow-hidden">
        <Header active="all" />

        <div className="relative max-w-[1280px] mx-auto px-5 md:px-8 min-h-[100svh] grid grid-cols-1 lg:grid-cols-2 items-center gap-6 pt-24 md:pt-28">
          <div data-aos="fade-up" className="relative z-10 max-w-[560px] py-10 lg:py-0">
            <h1 className="font-[family-name:var(--font-unbounded)] font-bold text-[40px] sm:text-[52px] md:text-[64px] lg:text-[68px] leading-[1.08] tracking-[-0.03em] text-white">
              Письма и вложения
              <br />
              без границ
            </h1>
            <button
              onClick={() => handleButtonClick(mailAuthStartUrl("login"))}
              className="mt-8 h-[52px] px-8 rounded-full bg-white text-[#003399] font-[family-name:var(--font-manrope)] font-semibold text-[16px] md:text-[17px] inline-flex items-center gap-2 hover:bg-white/90 transition-colors"
            >
              Открыть почту
            </button>
          </div>

          <div
            data-aos="fade-up"
            data-aos-delay="100"
            className="relative z-0 w-full h-[55svh] sm:h-[60svh] lg:h-[calc(100svh-4rem)] lg:absolute lg:right-0 lg:bottom-0 lg:w-[55%] xl:w-[52%] pointer-events-none"
          >
            <Image
              src="/hero-girl.png"
              alt="pnk почта"
              fill
              className="object-contain object-bottom lg:object-right-bottom select-none mix-blend-lighten scale-110 lg:scale-125 origin-bottom"
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
