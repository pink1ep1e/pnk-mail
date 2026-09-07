"use client";

import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { ArrowRight, Globe, Info, Save } from "@/lib/icons";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

type OS = "android" | "ios";

const steps = [
  {
    title: "Откройте почту в браузере",
    text: "Зайдите на сайт pnk почты с телефона — в Chrome, Safari или другом браузере.",
  },
  {
    title: "Откройте меню браузера",
    text: "Нажмите «Поделиться» в Safari или меню «⋮» в Chrome и других браузерах.",
  },
  {
    title: "Добавьте на экран «Домой»",
    text: "Выберите «На экран „Домой“» / «Add to Home Screen» — ярлык появится рядом с приложениями.",
  },
];

function InstallContent() {
  const searchParams = useSearchParams();
  const initial =
    searchParams.get("os") === "ios" ? "ios" : ("android" as OS);
  const [os, setOs] = useState<OS>(initial);

  return (
    <div className="min-h-screen bg-[#0c0d10] text-white flex flex-col">
      <header className="pt-8 md:pt-10 pb-8 flex flex-col items-center px-4">
        <Logo
          variant="bg"
          priority
          width={160}
          height={86}
          className="w-[120px] md:w-[150px]"
        />
        <h1 className="mt-8 max-w-[640px] text-center font-[family-name:var(--font-unbounded)] font-bold text-[24px] md:text-[34px] leading-[1.2] tracking-[-0.02em]">
          Установите pnk почту на экран «Домой»
        </h1>
        <p className="mt-3 max-w-[520px] text-center text-[15px] md:text-[16px] text-white/50 font-[family-name:var(--font-manrope)] leading-relaxed">
          Ярлык на телефоне работает как приложение — без магазинов и
          скачивания файлов. Инструкция одинаковая для iPhone и Android.
        </p>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 pb-12">
        <div className="w-full max-w-[920px] bg-[#1a1c22] rounded-[28px] md:rounded-[36px] p-5 md:p-10">
          <div className="text-center">
            <h2 className="font-[family-name:var(--font-unbounded)] font-bold text-[18px] md:text-[22px] tracking-[-0.02em]">
              Как установить приложение
            </h2>
            <p className="mt-2 text-[14px] text-white/45 font-[family-name:var(--font-manrope)]">
              Выберите операционную систему вашего телефона
            </p>

            <div className="mt-5 inline-flex p-1 rounded-full bg-[#0f1115]">
              {(["android", "ios"] as OS[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setOs(item)}
                  className={cn(
                    "min-w-[110px] md:min-w-[128px] h-10 px-5 rounded-full text-[15px] font-semibold font-[family-name:var(--font-manrope)] transition-colors",
                    os === item
                      ? "bg-[#0066ff] text-white"
                      : "text-white/50 hover:text-white",
                  )}
                >
                  {item === "android" ? "Android" : "iOS"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-[22px] md:rounded-[28px] bg-[#0f1115] grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr] overflow-hidden">
            <div className="flex flex-col justify-center p-5 md:p-8 md:pr-4">
              <h3 className="font-[family-name:var(--font-unbounded)] font-bold text-[20px] md:text-[26px] leading-tight tracking-[-0.02em]">
                Добавьте ярлык на экран «Домой»
              </h3>
              <p className="mt-3 text-[14px] md:text-[15px] text-white/50 font-[family-name:var(--font-manrope)] leading-relaxed max-w-[420px]">
                Откройте сайт в браузере на телефоне и сохраните pnk почту как
                приложение. Шаги одинаковые на {os === "ios" ? "iPhone" : "Android"}{" "}
                — без App Store и Google Play.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                <Link
                  href="/login"
                  className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-[#0066ff] px-6 text-[16px] font-semibold font-[family-name:var(--font-manrope)] text-white hover:bg-[#0052cc] transition-colors"
                >
                  Открыть почту
                  <ArrowRight size={18} />
                </Link>
                <a
                  href="#steps"
                  className="inline-flex items-center gap-1 text-[15px] font-semibold font-[family-name:var(--font-manrope)] text-white hover:text-[#4d9fff] transition-colors"
                >
                  Как установить
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>

            <div className="relative max-md:h-[200px] overflow-hidden">
              <Image
                src="/install.png"
                alt="Установка pnk почты на экран Домой"
                width={420}
                height={420}
                className="absolute bottom-0 left-1/2 md:left-auto md:right-2 w-[260px] md:w-[300px] h-auto max-w-none select-none pointer-events-none -translate-x-1/2 translate-y-[18%] md:translate-x-0 md:translate-y-[20%]"
                priority
              />
            </div>
          </div>

          <div
            id="steps"
            className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4"
          >
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="rounded-[20px] bg-[#0f1115] p-5 flex flex-col min-h-[180px]"
              >
                <div className="h-9 w-9 rounded-full bg-[#0066ff]/20 text-[#4d9fff] flex items-center justify-center text-[14px] font-bold font-[family-name:var(--font-manrope)]">
                  {i + 1}
                </div>
                <h4 className="mt-4 font-[family-name:var(--font-manrope)] font-semibold text-[16px] leading-snug">
                  {step.title}
                </h4>
                <p className="mt-2 text-[13px] text-white/45 font-[family-name:var(--font-manrope)] leading-relaxed flex-1">
                  {step.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="rounded-[20px] bg-[#0f1115] p-5 md:p-6 flex flex-col">
              <div className="h-10 w-10 rounded-full bg-[#0066ff]/15 flex items-center justify-center text-[#4d9fff]">
                <Globe size={20} />
              </div>
              <h4 className="mt-4 font-[family-name:var(--font-manrope)] font-semibold text-[17px]">
                Пользуйтесь веб-версией
              </h4>
              <p className="mt-2 text-[14px] text-white/45 font-[family-name:var(--font-manrope)] leading-relaxed flex-1">
                С телефона, компьютера или планшета — в любом современном
                браузере, без установки.
              </p>
              <Link
                href="/login"
                className="mt-5 inline-flex items-center gap-1 text-[15px] font-semibold font-[family-name:var(--font-manrope)] text-white hover:text-[#4d9fff] transition-colors"
              >
                Войти в почту
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="rounded-[20px] bg-[#0f1115] p-5 md:p-6 flex flex-col">
              <div className="h-10 w-10 rounded-full bg-[#0066ff]/15 flex items-center justify-center text-[#4d9fff]">
                <Save size={20} />
              </div>
              <h4 className="mt-4 font-[family-name:var(--font-manrope)] font-semibold text-[17px]">
                Ярлык как приложение
              </h4>
              <p className="mt-2 text-[14px] text-white/45 font-[family-name:var(--font-manrope)] leading-relaxed flex-1">
                После добавления на экран «Домой» почта открывается в отдельном
                окне — быстро и без адреса браузера.
              </p>
              <a
                href="#steps"
                className="mt-5 inline-flex items-center gap-1 text-[15px] font-semibold font-[family-name:var(--font-manrope)] text-white hover:text-[#4d9fff] transition-colors"
              >
                Смотреть шаги
                <ArrowRight size={16} />
              </a>
            </div>
          </div>

          <div className="mt-5 rounded-[18px] border border-white/10 px-4 py-4 md:px-5 md:py-4 flex gap-3 items-start text-[#4d9fff]">
            <Info size={24} className="shrink-0 mt-0.5" />
            <p className="text-[14px] text-white/55 font-[family-name:var(--font-manrope)] leading-relaxed">
              Отдельного приложения в App Store и Google Play пока нет. Ярлык
              на экране «Домой» — основной способ установить pnk почту на
              телефон. Инструкция одинаковая для Android и iOS.
            </p>
          </div>

          <div className="mt-8 md:mt-10">
            <h3 className="font-[family-name:var(--font-manrope)] font-semibold text-[17px] md:text-[18px]">
              Как сохранить доступ к приложению?
            </h3>
            <p className="mt-2 text-[14px] text-white/45 font-[family-name:var(--font-manrope)] leading-relaxed max-w-[640px]">
              Не удаляйте ярлык с экрана «Домой». Если очищаете кэш браузера —
              ярлык останется, просто снова откройте почту через него. На
              iPhone в настройках можно отключить «Сгружать неиспользуемые»,
              чтобы система не убирала ярлыки.
            </p>
          </div>
        </div>
      </main>

      <footer className="px-5 md:px-10 py-8 mt-auto">
        <div className="max-w-[900px] mx-auto flex flex-col md:flex-row justify-between gap-6 font-[family-name:var(--font-manrope)] text-[12px] md:text-[13px] text-white/35">
          <div>
            <p>pnk почта — сервис электронной почты.</p>
            <p className="mt-1">
              © {new Date().getFullYear()} pnk почта. Все права защищены.
            </p>
          </div>
          <div className="md:text-right">
            <p className="text-[17px] font-semibold text-white/70">
              support@pnkmail.ru
            </p>
            <p className="mt-1">Круглосуточная поддержка</p>
          </div>
        </div>
        <div className="max-w-[900px] mx-auto mt-6 flex flex-wrap gap-4">
          <Link
            href="/login"
            className="text-[14px] font-[family-name:var(--font-manrope)] text-white/35 hover:text-white transition-colors"
          >
            ← Ко входу
          </Link>
          <Link
            href="/"
            className="text-[14px] font-[family-name:var(--font-manrope)] text-white/35 hover:text-white transition-colors"
          >
            На главную
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function InstallPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0c0d10] flex items-center justify-center text-white/50">
          Загрузка…
        </div>
      }
    >
      <InstallContent />
    </Suspense>
  );
}
