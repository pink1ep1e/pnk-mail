"use client";

import { Header } from "@/components/shared/header";
import { AppSplash } from "@/components/shared/app-splash";
import { mailAuthStartUrl } from "@/lib/id-auth";
import { HOME_FAQ } from "@/lib/seo";
import { haptic } from "@/lib/haptic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [hint, setHint] = useState("Открываем почту…");

  const hints = [
    "Открываем почту…",
    "Готовим вход…",
    "Подключаем pnk ID…",
    "Почти готово…",
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
    <div style={{ overflow: "hidden" }} className="min-h-screen bg-[#0066ff] text-white">
      {isLoading && <AppSplash hint={hint} />}

      <section className="relative min-h-[100svh] bg-[#0066ff] overflow-hidden">
        <Header active="all" />

        <div className="relative max-w-[1280px] mx-auto px-5 md:px-8 min-h-[100svh] grid grid-cols-1 lg:grid-cols-2 items-center gap-6 pt-24 md:pt-28">
          <div data-aos="fade-up" className="relative z-10 max-w-[560px] py-10 lg:py-0">
            <p className="mb-3 text-[15px] md:text-[16px] font-semibold tracking-[-0.02em] text-white/90 font-[family-name:var(--font-manrope)]">
              pnk почта · пнк почта
            </p>
            <h1 className="font-[family-name:var(--font-unbounded)] font-bold text-[40px] sm:text-[52px] md:text-[64px] lg:text-[68px] leading-[1.08] tracking-[-0.03em] text-white">
              Письма и вложения
              <br />
              без границ
            </h1>
            <p className="mt-5 max-w-[480px] text-[16px] md:text-[18px] leading-relaxed text-white/85 font-[family-name:var(--font-manrope)]">
              Современный почтовый сервис{" "}
              <span className="font-semibold text-white">@pnkmail.ru</span>
              {" "}
              (pnk Mail): бесплатный ящик, веб и приложение, вход через pnk ID.
              Пишет на Gmail, Яндекс и Mail.ru.
            </p>
            <button
              type="button"
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
              alt="pnk почта (пнк почта) — электронная почта @pnkmail.ru, веб и приложение"
              fill
              className="object-contain object-bottom lg:object-right-bottom select-none mix-blend-lighten scale-110 lg:scale-125 origin-bottom"
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
          </div>
        </div>
      </section>

      <section className="relative bg-[#0052cc] text-white">
        <div className="max-w-[960px] mx-auto px-5 md:px-8 py-16 md:py-20">
          <h2 className="font-[family-name:var(--font-unbounded)] font-bold text-[28px] md:text-[36px] tracking-[-0.03em] leading-tight">
            Что такое pnk почта
          </h2>
          <p className="mt-3 max-w-[640px] text-[15px] md:text-[16px] text-white/75 font-[family-name:var(--font-manrope)] leading-relaxed">
            <strong className="text-white font-semibold">pnk почта</strong>
            {" "}
            (её также ищут как «пнк почта», pnk Mail или pnkmail) — это не просто
            «ещё одна российская почта», а отдельный сервис на домене{" "}
            <strong className="text-white font-semibold">pnkmail.ru</strong>:
            свой адрес, понятный интерфейс на русском, удобные вложения и единый
            вход через pnk ID с телефона или компьютера.
          </p>
          <ul className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                t: "Адрес @pnkmail.ru",
                d: "Ящик за минуту — пишет на Gmail, Яндекс Почту и Mail.ru.",
              },
              {
                t: "Вложения без боли",
                d: "Файлы любого типа, превью и скачивание в один тап.",
              },
              {
                t: "Вход через pnk ID",
                d: "Один аккаунт для почты — логин, QR или телефон.",
              },
            ].map((item) => (
              <li key={item.t} className="min-w-0">
                <h3 className="font-[family-name:var(--font-unbounded)] font-semibold text-[18px] md:text-[20px] tracking-[-0.02em]">
                  {item.t}
                </h3>
                <p className="mt-2 text-[14px] md:text-[15px] text-white/70 font-[family-name:var(--font-manrope)] leading-relaxed">
                  {item.d}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-[14px] text-white/60 font-[family-name:var(--font-manrope)]">
            Нужна почта для магазина?{" "}
            <Link
              href="/business"
              className="text-white font-semibold underline underline-offset-4 hover:text-white/90"
            >
              pnk почта для бизнеса
            </Link>
            {" · "}
            <Link
              href="/help"
              className="text-white font-semibold underline underline-offset-4 hover:text-white/90"
            >
              Справка
            </Link>
          </p>
        </div>
      </section>

      <section className="relative bg-[#0c0d10] text-white">
        <div className="max-w-[720px] mx-auto px-5 md:px-8 py-16 md:py-20">
          <h2 className="font-[family-name:var(--font-unbounded)] font-bold text-[28px] md:text-[36px] tracking-[-0.03em]">
            Частые вопросы о pnk почте
          </h2>
          <dl className="mt-8 space-y-6">
            {HOME_FAQ.map((item) => (
              <div key={item.question}>
                <dt className="text-[16px] md:text-[17px] font-semibold font-[family-name:var(--font-manrope)]">
                  {item.question}
                </dt>
                <dd className="mt-1.5 text-[14px] md:text-[15px] text-white/55 font-[family-name:var(--font-manrope)] leading-relaxed">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
