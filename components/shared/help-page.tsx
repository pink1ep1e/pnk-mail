"use client";

import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Call,
  KeyRound,
  Lock,
  Mail,
  Shield,
  Support,
  User,
  X,
} from "@/lib/icons";
import Link from "next/link";
import { useMemo, useState } from "react";

type Article = {
  id: string;
  title: string;
  body: string[];
};

type Category = {
  id: string;
  title: string;
  description: string;
  icon: typeof Shield;
  articles: Article[];
};

const CATEGORIES: Category[] = [
  {
    id: "security",
    title: "Безопасность почты",
    description: "Пароль, сессии и защита ящика",
    icon: Shield,
    articles: [
      {
        id: "password",
        title: "Как сменить пароль",
        body: [
          "Откройте pnk ID → Безопасность → Обновить пароль.",
          "Введите текущий пароль и дважды новый. Новый пароль должен быть не короче 8 символов.",
          "После смены пароля рекомендуем завершить сессии на других устройствах, если вход выполняли не только вы.",
        ],
      },
      {
        id: "sessions",
        title: "Активные сессии",
        body: [
          "В разделе «Активные сессии» видно, где сейчас открыта почта: устройство, браузер и примерное место входа.",
          "Если устройство незнакомо — завершите сессию. Можно выйти сразу на всех других устройствах.",
          "Текущая сессия (это устройство) завершить из списка нельзя — для выхода используйте выход из аккаунта в почте.",
        ],
      },
      {
        id: "suspicious",
        title: "Подозрительный вход",
        body: [
          "Если получили письмо о входе с нового устройства, проверьте раздел сессий.",
          "Смените пароль, завершите чужие сессии и убедитесь, что к аккаунту привязан актуальный телефон.",
          "Не переходите по ссылкам из писем, которые просят «подтвердить пароль» на сторонних сайтах.",
        ],
      },
    ],
  },
  {
    id: "login",
    title: "Вход в почту",
    description: "Логин, QR и способы входа",
    icon: KeyRound,
    articles: [
      {
        id: "how-login",
        title: "Как войти в pnk Mail",
        body: [
          "На странице входа укажите адрес ящика (или логин) и пароль.",
          "Также можно войти по QR-коду: откройте код на одном устройстве и отсканируйте его в приложении или на телефоне, где уже выполнен вход.",
          "Если включена проверка по SMS, введите код из сообщения.",
        ],
      },
      {
        id: "forgot-password",
        title: "Не помню пароль",
        body: [
          "На экране входа выберите восстановление доступа.",
          "Подтвердите личность кодом на привязанный телефон или резервную почту.",
          "После проверки задайте новый пароль и сохраните его в надёжном месте.",
        ],
      },
      {
        id: "qr",
        title: "Вход по QR-коду",
        body: [
          "QR-вход удобен, когда на одном устройстве уже открыта почта.",
          "Код действует ограниченное время. Не показывайте его посторонним — по нему можно войти в ваш ящик.",
          "Вход по QR можно отключить в pnk ID → Безопасность.",
        ],
      },
    ],
  },
  {
    id: "phone",
    title: "Телефон и восстановление",
    description: "Номер для SMS и резервная почта",
    icon: Call,
    articles: [
      {
        id: "bind-phone",
        title: "Привязать номер телефона",
        body: [
          "В pnk ID откройте раздел телефона и укажите номер в формате +7 (999) 123-45-67.",
          "Подтвердите номер кодом из SMS. Номер нужен для входа и восстановления доступа.",
          "Один номер можно использовать для ограниченного числа ящиков.",
        ],
      },
      {
        id: "no-sms",
        title: "Не приходит SMS",
        body: [
          "Проверьте, что номер указан верно и на телефоне есть связь оператора.",
          "Подождите 1–2 минуты и запросите код снова. Не запрашивайте код слишком часто — возможна временная блокировка.",
          "Если SMS так и не приходят, напишите в чат поддержки в разделе «Поддержка» в pnk ID.",
        ],
      },
      {
        id: "recovery-mail",
        title: "Резервная почта",
        body: [
          "Добавьте запасной адрес в способах восстановления — на него можно получить ссылку или код при потере доступа.",
          "Не указывайте тот же ящик pnk Mail, который пытаетесь восстановить.",
          "Подтвердите резервный адрес письмом со ссылкой.",
        ],
      },
    ],
  },
  {
    id: "mail",
    title: "Работа с письмами",
    description: "Отправка, получение, спам и вложения",
    icon: Mail,
    articles: [
      {
        id: "not-receiving",
        title: "Не приходят письма",
        body: [
          "Проверьте папки «Спам» и другие фильтры. Иногда нужные письма попадают туда по ошибке.",
          "Попросите отправителя проверить адрес и отсутствие блокировок на его стороне.",
          "Если письма не приходят долго, напишите в поддержку и укажите адрес отправителя и примерное время.",
        ],
      },
      {
        id: "not-sending",
        title: "Не уходит письмо",
        body: [
          "Убедитесь, что заполнены поля «Кому» и тема, а размер вложений не превышает лимит ящика.",
          "Проверьте подключение к интернету и повторите отправку.",
          "При постоянных ошибках SMTP/отправки обратитесь в поддержку с текстом ошибки.",
        ],
      },
      {
        id: "spam",
        title: "Спам и фильтры",
        body: [
          "Пометьте письмо как спам — похожие сообщения будут чаще попадать в эту папку.",
          "Если важное письмо оказалось в спаме, отметьте его как «не спам» и при необходимости добавьте отправителя в контакты.",
          "Не открывайте вложения и ссылки из писем от неизвестных отправителей.",
        ],
      },
      {
        id: "attachments",
        title: "Вложения",
        body: [
          "В одно письмо можно прикрепить несколько файлов в пределах доступного лимита размера.",
          "Для очень больших файлов используйте облачное хранилище и пришлите ссылку.",
          "Вирусы часто маскируются под документы — скачивайте вложения только от доверенных людей.",
        ],
      },
    ],
  },
  {
    id: "account",
    title: "Данные аккаунта",
    description: "Имя, аватар и профиль pnk ID",
    icon: User,
    articles: [
      {
        id: "profile",
        title: "Имя и аватар",
        body: [
          "В разделе «Данные» можно изменить отображаемое имя, имя и фамилию, пол, дату рождения и часовой пояс.",
          "Аватар загружается как фото: выберите область и сохраните квадратное изображение.",
          "Имя отправителя в письмах берётся из профиля — его можно обновить отдельно в настройках ящика.",
        ],
      },
      {
        id: "delete",
        title: "Удаление аккаунта",
        body: [
          "Удаление ящика необратимо: письма и настройки будут удалены.",
          "Перед удалением сохраните важные письма и отвяжите сторонние приложения.",
          "Подтверждение удаления выполняется паролем в разделе управления аккаунтом.",
        ],
      },
    ],
  },
  {
    id: "access",
    title: "Нет доступа к ящику",
    description: "Восстановление и частые проблемы",
    icon: Lock,
    articles: [
      {
        id: "cant-login",
        title: "Не могу войти",
        body: [
          "Проверьте раскладку клавиатуры и Caps Lock. Попробуйте сбросить пароль через телефон.",
          "Если номер недоступен, используйте резервную почту или чат поддержки.",
          "Укажите в обращении логин ящика, когда последний раз входили и что именно происходит на экране.",
        ],
      },
      {
        id: "forgot-login",
        title: "Не помню адрес почты",
        body: [
          "Вспомните имя ящика — обычно это логин@pnkmail.ru.",
          "Если помните телефон, попробуйте восстановить доступ по номеру — система подскажет связанные ящики, если они есть.",
          "Иначе напишите в поддержку и опишите, когда создавали ящик и какие данные указывали.",
        ],
      },
    ],
  },
];

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<{
    categoryId: string;
    articleId: string;
  } | null>(null);

  const active = useMemo(() => {
    if (!open) return null;
    const category = CATEGORIES.find((c) => c.id === open.categoryId);
    const article = category?.articles.find((a) => a.id === open.articleId);
    if (!category || !article) return null;
    return { category, article };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.map((cat) => ({
      ...cat,
      articles: cat.articles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.body.some((p) => p.toLowerCase().includes(q)) ||
          cat.title.toLowerCase().includes(q),
      ),
    })).filter((cat) => cat.articles.length > 0);
  }, [query]);

  return (
    <div className="h-dvh overflow-y-auto overscroll-contain bg-[#0c0d10] text-white">
      <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0c0d10]/95 backdrop-blur">
        <div className="mx-auto max-w-[1080px] px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <Logo variant="id" href="/id" className="w-[88px] md:w-[96px]" />
          <div className="flex items-center gap-4 text-[13px] md:text-[14px] font-[family-name:var(--font-manrope)]">
            <Link
              href="/legal/terms"
              className="text-white/45 hover:text-white/80 transition-colors"
            >
              Условия
            </Link>
            <Link
              href="/id"
              className="text-white/45 hover:text-white/80 transition-colors"
            >
              pnk ID
            </Link>
            <Link
              href="/mail"
              className="text-[#4d9fff] hover:text-white transition-colors"
            >
              В почту
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-[1080px] px-4 md:px-8 py-8 md:py-12">
        {active ? (
          <article>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="inline-flex items-center gap-2 text-[14px] text-white/45 hover:text-white font-[family-name:var(--font-manrope)] transition-colors mb-6"
            >
              ← Назад к справке
            </button>
            <p className="text-[13px] text-white/40 font-[family-name:var(--font-manrope)] mb-2">
              {active.category.title}
            </p>
            <h1 className="text-[28px] md:text-[34px] font-semibold font-[family-name:var(--font-unbounded)] tracking-[-0.03em]">
              {active.article.title}
            </h1>
            <div className="mt-8 rounded-[22px] border border-white/10 bg-[#1a1c22] p-5 md:p-8 space-y-4">
              {active.article.body.map((p) => (
                <p
                  key={p}
                  className="text-[15px] md:text-[16px] text-white/70 font-[family-name:var(--font-manrope)] leading-relaxed"
                >
                  {p}
                </p>
              ))}
            </div>
            <div className="mt-6 rounded-[18px] border border-white/10 bg-[#12141a] p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-10 w-10 rounded-[12px] bg-[#0066ff]/20 text-[#4d9fff] flex items-center justify-center shrink-0">
                  <Support size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium font-[family-name:var(--font-manrope)]">
                    Не нашли ответ?
                  </p>
                  <p className="text-[13px] text-white/40 font-[family-name:var(--font-manrope)]">
                    Напишите в чат поддержки в pnk ID
                  </p>
                </div>
              </div>
              <Link
                href="/id"
                className="h-11 px-5 rounded-full bg-[#0066ff] hover:bg-[#0052cc] text-[14px] font-semibold font-[family-name:var(--font-manrope)] inline-flex items-center justify-center transition-colors shrink-0"
              >
                Открыть поддержку
              </Link>
            </div>
          </article>
        ) : (
          <>
            <div className="max-w-[640px]">
              <h1 className="text-[32px] md:text-[40px] font-semibold font-[family-name:var(--font-unbounded)] tracking-[-0.03em]">
                Справка pnk Mail
              </h1>
              <p className="mt-3 text-[15px] md:text-[16px] text-white/50 font-[family-name:var(--font-manrope)] leading-relaxed">
                Ответы по входу, безопасности ящика, письмам и данным аккаунта.
                pnk ID — единый профиль для почты.
              </p>
            </div>

            <div className="mt-8 relative max-w-[560px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по справке"
                className="w-full h-12 rounded-[14px] bg-[#1a1c22] border border-white/10 pl-4 pr-11 text-[15px] text-white outline-none focus:border-[#0066ff]/60 focus:shadow-[0_0_0_3px_rgba(0,102,255,0.18)] font-[family-name:var(--font-manrope)] placeholder:text-white/30"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10"
                  aria-label="Очистить"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {filtered.map((cat) => {
                const Icon = cat.icon;
                return (
                  <section
                    key={cat.id}
                    className="rounded-[22px] border border-white/10 bg-[#1a1c22] p-5 md:p-6"
                  >
                    <div className="flex items-start gap-3.5 mb-4">
                      <span className="h-12 w-12 rounded-[14px] bg-[#0066ff]/15 text-[#4d9fff] flex items-center justify-center shrink-0">
                        <Icon size={22} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-[17px] font-semibold font-[family-name:var(--font-manrope)]">
                          {cat.title}
                        </h2>
                        <p className="mt-0.5 text-[13px] text-white/40 font-[family-name:var(--font-manrope)]">
                          {cat.description}
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {cat.articles.map((article) => (
                        <li key={article.id}>
                          <button
                            type="button"
                            onClick={() =>
                              setOpen({
                                categoryId: cat.id,
                                articleId: article.id,
                              })
                            }
                            className={cn(
                              "w-full flex items-center justify-between gap-3 rounded-[12px] px-3 py-2.5 text-left",
                              "text-[14px] text-white/75 hover:text-white hover:bg-white/[0.05] font-[family-name:var(--font-manrope)] transition-colors",
                            )}
                          >
                            <span>{article.title}</span>
                            <ArrowRight
                              size={14}
                              className="text-white/30 shrink-0"
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <p className="mt-10 text-[15px] text-white/45 font-[family-name:var(--font-manrope)]">
                Ничего не найдено. Попробуйте другой запрос или откройте чат
                поддержки.
              </p>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-white/[0.06] py-6">
        <div className="mx-auto max-w-[1080px] px-4 md:px-8 flex flex-wrap items-center justify-between gap-3 text-[12px] text-white/35 font-[family-name:var(--font-manrope)]">
          <p>© {new Date().getFullYear()} pnk</p>
          <div className="flex gap-4">
            <Link href="/help" className="hover:text-white/60">
              Справка
            </Link>
            <Link href="/legal/terms" className="hover:text-white/60">
              Условия использования
            </Link>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
