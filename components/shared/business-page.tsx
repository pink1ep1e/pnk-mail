"use client";

import { Header } from "@/components/shared/header";
import { AppSplash } from "@/components/shared/app-splash";
import { mailAuthStartUrl } from "@/lib/id-auth";
import { haptic } from "@/lib/haptic";
import Image from "next/image";
import { useEffect, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

export default function BusinessPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [hint, setHint] = useState("Готовим корпоративную почту…");

  const hints = [
    "Создаём домен для вашего магазина…",
    "Настраиваем ящики команды…",
    "Почта для бизнеса почти готова…",
    "Ещё секунда — и можно писать клиентам…",
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
    }, 1600);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const handleButtonClick = (url: string) => {
    haptic("medium");
    setIsLoading(true);
    window.location.href = url;
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#07111f] text-white">
      {isLoading && <AppSplash hint={hint} />}

      <section className="relative min-h-[100svh] overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 15% 40%, rgba(0,102,255,0.35), transparent 60%), radial-gradient(ellipse 50% 45% at 85% 70%, rgba(0,71,204,0.25), transparent 55%), linear-gradient(165deg, #0a1628 0%, #07111f 45%, #050d18 100%)",
          }}
        />

        <Header active="business" />

        <div className="relative max-w-[1280px] mx-auto px-5 md:px-8 min-h-[100svh] grid grid-cols-1 lg:grid-cols-2 items-center gap-6 pt-24 md:pt-28">
          <div
            data-aos="fade-up"
            className="relative z-10 max-w-[600px] py-10 lg:py-0"
          >
            <h1 className="font-[family-name:var(--font-unbounded)] font-bold text-[36px] sm:text-[48px] md:text-[58px] lg:text-[62px] leading-[1.08] tracking-[-0.03em] text-white">
              Почта под ваш
              <br />
              магазин и бренд
            </h1>
            <p className="mt-5 max-w-[480px] text-[16px] md:text-[18px] text-white/80 font-[family-name:var(--font-manrope)] leading-relaxed">
              Создадим корпоративные адреса на вашем домене — например{" "}
              <span className="font-semibold text-white">info@bussines.ru</span>{" "}
              или{" "}
              <span className="font-semibold text-white">shop@bussines.ru</span>
              . Клиенты сразу видят, что письмо от вашего бизнеса.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => handleButtonClick(mailAuthStartUrl("register"))}
                className="h-[52px] px-8 rounded-full bg-white text-[#002a80] font-[family-name:var(--font-manrope)] font-semibold text-[16px] md:text-[17px] inline-flex items-center justify-center gap-2 hover:bg-white/90 transition-colors"
              >
                Подключить для бизнеса
              </button>
              <button
                onClick={() => handleButtonClick(mailAuthStartUrl("login"))}
                className="h-[52px] px-8 rounded-full bg-white/15 text-white font-[family-name:var(--font-manrope)] font-semibold text-[16px] md:text-[17px] inline-flex items-center justify-center hover:bg-white/25 transition-colors"
              >
                Войти
              </button>
            </div>
          </div>

          <div
            data-aos="fade-up"
            data-aos-delay="100"
            className="relative z-0 w-full h-[55svh] sm:h-[60svh] lg:h-[calc(100svh-4rem)] lg:absolute lg:right-0 lg:bottom-0 lg:w-[52%] xl:w-[48%] pointer-events-none"
          >
            <Image
              src="/bussines-dark.png"
              alt="pnk почта для бизнеса"
              fill
              className="object-contain object-bottom lg:object-right-bottom select-none scale-105 lg:scale-110 origin-bottom translate-y-[6%] md:translate-y-[8%] lg:translate-y-[10%]"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
