"use client";

import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { ArrowRight, Mail } from "@/lib/icons";
import Link from "next/link";

const SUMMARY = [
  "Разработчик, который самостоятельно создаёт и запускает продукты и использует данные для принятия продуктовых решений. Запустил несколько собственных сервисов: VPN-сервис, почтовый сервис и единую систему аккаунтов.",
  "Сам проектирую сбор данных, структуру базы данных и логику их обработки. Работаю с SQL, анализирую поведение пользователей и продуктовые метрики, формулирую гипотезы и ищу причины изменений в данных.",
  "Понимаю весь путь данных: от действия пользователя и backend-логики до записи в БД и итоговой метрики. Поэтому могу не только найти расхождение в данных, но и разобраться, почему оно возникло и как исправить проблему на уровне продукта или системы.",
  "Ищу позицию продуктового аналитика, где технический опыт разработки позволит глубже работать с данными и эффективнее взаимодействовать с разработчиками и продуктовой командой.",
];

const SKILL_GROUPS: { title: string; items: string[] }[] = [
  {
    title: "Продуктовая аналитика",
    items: [
      "Продуктовые метрики и их декомпозиция",
      "Воронки и конверсия",
      "Сегментация пользователей",
      "Формулирование и проверка продуктовых гипотез",
      "Анализ поведения пользователей",
      "Поиск причин изменений в метриках",
      "Подготовка данных для принятия продуктовых решений",
    ],
  },
  {
    title: "SQL и работа с данными",
    items: [
      "PostgreSQL, MySQL",
      "JOIN, CTE, оконные функции, агрегации",
      "Работа со сложными выборками",
      "Проектирование структуры данных",
      "Проверка корректности данных",
    ],
  },
  {
    title: "Разработка",
    items: ["TypeScript", "Next.js", "Node.js", "Prisma", "Python"],
  },
  {
    title: "Инфраструктура и инструменты",
    items: [
      "Деплой, миграции, мониторинг собственных сервисов",
      "Git",
      "Excel, Google Sheets",
    ],
  },
  {
    title: "Коммуникация",
    items: [
      "Объясняю технические вещи простым языком",
      "Самостоятельно декомпозирую задачи",
      "Перевожу бизнес-вопрос в техническую и аналитическую задачу",
      "Довожу задачи от идеи до результата",
    ],
  },
];

const EXPERIENCE: {
  name: string;
  role: string;
  bullets: string[];
}[] = [
  {
    name: "PNK VPN",
    role: "Полный цикл разработки и развития продукта: от проектирования и реализации до деплоя, сбора данных и поддержки.",
    bullets: [
      "Разработал Telegram WebApp и веб-версию сервиса.",
      "Проектировал структуру базы данных и логику взаимодействия между frontend, backend и БД.",
      "Настраивал сбор данных о действиях пользователей.",
      "Анализировал пользовательские сценарии и продуктовые метрики.",
      "Использовал SQL для получения и анализа данных.",
      "Искал причины расхождений и некорректных данных на уровне backend-логики и структуры БД.",
      "Формулировал гипотезы по улучшению пользовательского пути и проверял их на данных.",
      "Самостоятельно разворачивал продукт на VPS, настраивал Nginx и выполнял миграции.",
    ],
  },
  {
    name: "PNK Почта",
    role: "Собственный веб-почтовый сервис — разработка продукта с нуля.",
    bullets: [
      "Спроектировал архитектуру сервиса и структуру базы данных.",
      "Реализовал пользовательские сценарии работы с почтой.",
      "Разработал авторизацию и управление пользовательскими данными.",
      "Настроил взаимодействие frontend, backend и базы данных.",
      "Анализировал данные сервиса и пользовательскую активность.",
      "Самостоятельно выполнял деплой и поддержку продукта.",
    ],
  },
];

const VALUE = [
  "Технический опыт позволяет смотреть на продукт одновременно с двух сторон: как пользователь взаимодействует с продуктом и как это действие превращается в данные внутри системы.",
  "Могу самостоятельно пройти путь от вопроса «почему изменилась метрика» до проверки данных, поиска причины на уровне продукта или технической реализации и формулирования дальнейшей гипотезы.",
  "Интересна именно продуктовая часть аналитики: понимание поведения пользователей, поиск точек роста, оценка изменений и использование данных для принятия решений.",
  "Готов развиваться в продуктовой аналитике, углублять знания в статистике и инструментах визуализации данных и применять их непосредственно в продуктовых задачах.",
];

export default function ResumePage() {
  return (
    <div className="min-h-[100dvh] bg-[#0c0d10] text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 40% at 20% 0%, rgba(0,102,255,0.22), transparent 55%), radial-gradient(ellipse 40% 35% at 90% 20%, rgba(0,71,204,0.14), transparent 50%), linear-gradient(180deg, #0e1118 0%, #0c0d10 40%, #0a0b0e 100%)",
        }}
      />

      <div className="relative mx-auto max-w-[820px] px-5 md:px-8 pb-20">
        <header className="flex items-center justify-between gap-4 pt-8 md:pt-10 pb-10 md:pb-14">
          <Link href="/" className="shrink-0" aria-label="pnk почта">
            <Logo
              variant="text"
              priority
              width={108}
              height={57}
              className="h-10 md:h-12 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 text-[13px] sm:text-[14px] font-[family-name:var(--font-manrope)]">
            <Link
              href="/mail"
              className="h-9 px-3 rounded-full text-white/55 hover:text-white hover:bg-white/5 inline-flex items-center transition-colors"
            >
              Почта
            </Link>
            <Link
              href="/help"
              className="h-9 px-3 rounded-full text-white/55 hover:text-white hover:bg-white/5 inline-flex items-center transition-colors"
            >
              Справка
            </Link>
            <a
              href="mailto:hello@pnkmail.ru?subject=Резюме%20/%20продуктовый%20аналитик"
              className="h-9 px-3.5 rounded-full bg-[#0066ff] text-white font-semibold inline-flex items-center gap-1.5 hover:bg-[#0052cc] transition-colors"
            >
              <Mail size={14} />
              <span className="hidden sm:inline">Написать</span>
            </a>
          </nav>
        </header>

        <p className="text-[13px] md:text-[14px] font-semibold tracking-[-0.02em] text-[#4d9fff] font-[family-name:var(--font-manrope)]">
          Резюме · продуктовая аналитика
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-unbounded)] font-bold text-[28px] sm:text-[36px] md:text-[42px] leading-[1.15] tracking-[-0.03em]">
          Аналитик с техническим бэкграундом
        </h1>

        <div className="mt-6 space-y-4 text-[15px] md:text-[16px] text-white/70 font-[family-name:var(--font-manrope)] leading-relaxed">
          {SUMMARY.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>

        <section className="mt-14 md:mt-16">
          <h2 className="font-[family-name:var(--font-unbounded)] font-semibold text-[20px] md:text-[24px] tracking-[-0.02em]">
            Ключевые навыки
          </h2>
          <div className="mt-6 space-y-8">
            {SKILL_GROUPS.map((g) => (
              <div key={g.title}>
                <h3 className="text-[14px] font-semibold text-white/90 font-[family-name:var(--font-manrope)] mb-3">
                  {g.title}
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {g.items.map((item) => (
                    <li
                      key={item}
                      className={cn(
                        "rounded-[10px] border border-white/10 bg-white/[0.03] px-3 py-1.5",
                        "text-[13px] text-white/70 font-[family-name:var(--font-manrope)]",
                      )}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 md:mt-16">
          <h2 className="font-[family-name:var(--font-unbounded)] font-semibold text-[20px] md:text-[24px] tracking-[-0.02em]">
            Опыт
          </h2>
          <div className="mt-6 space-y-10">
            {EXPERIENCE.map((job) => (
              <article key={job.name}>
                <h3 className="text-[18px] md:text-[20px] font-bold font-[family-name:var(--font-manrope)] text-white">
                  {job.name}
                </h3>
                <p className="mt-1.5 text-[14px] md:text-[15px] text-white/50 font-[family-name:var(--font-manrope)] leading-relaxed">
                  {job.role}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {job.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex gap-3 text-[14px] md:text-[15px] text-white/70 font-[family-name:var(--font-manrope)] leading-relaxed"
                    >
                      <span
                        className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0066ff]"
                        aria-hidden
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 md:mt-16 pb-4">
          <h2 className="font-[family-name:var(--font-unbounded)] font-semibold text-[20px] md:text-[24px] tracking-[-0.02em]">
            Что могу дать продуктовой команде
          </h2>
          <div className="mt-5 space-y-4 text-[15px] md:text-[16px] text-white/70 font-[family-name:var(--font-manrope)] leading-relaxed">
            {VALUE.map((p) => (
              <p key={p.slice(0, 48)}>{p}</p>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:hello@pnkmail.ru?subject=Резюме%20/%20продуктовый%20аналитик"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0066ff] px-6 text-[15px] font-semibold font-[family-name:var(--font-manrope)] text-white hover:bg-[#0052cc] transition-colors"
            >
              Связаться
              <ArrowRight size={16} />
            </a>
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-full bg-white/10 px-6 text-[15px] font-semibold font-[family-name:var(--font-manrope)] text-white hover:bg-white/15 transition-colors"
            >
              На главную pnk почты
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
