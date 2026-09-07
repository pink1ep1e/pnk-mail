"use client";

import { Logo } from "@/components/shared/logo";
import { DateField } from "@/components/shared/date-field";
import { cn } from "@/lib/utils";
import {
  getPasswordStrength,
  PasswordStrengthBar,
} from "@/lib/password-strength";
import {
  ArrowDown,
  ArrowRight,
  Call,
  Camera,
  Check,
  Clock,
  Globe,
  HardDrive,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Menu,
  Paperclip,
  Pencil,
  Phone,
  QrCode,
  Send,
  Settings,
  Shield,
  Support,
  Trash2,
  User,
  X,
  FileText,
  ImageIcon,
} from "@/lib/icons";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type NavId = "data" | "security" | "support";

type PanelId =
  | "mailbox"
  | "phone"
  | "sender"
  | "notifications"
  | "delete"
  | "login-method"
  | "password"
  | "recovery"
  | "sessions"
  | "apps"
  | "qr";

const PANEL_TITLES: Record<PanelId, string> = {
  mailbox: "Почтовый ящик",
  phone: "Телефон",
  sender: "Адреса для писем",
  notifications: "Уведомления почты",
  delete: "Удалить аккаунт",
  "login-method": "Способ входа",
  password: "Обновить пароль",
  recovery: "Способы восстановления",
  sessions: "Активные сессии",
  apps: "Приложения с доступом",
  qr: "Вход по QR-коду",
};

const navItems: {
  id: NavId;
  label: string;
  icon: typeof User;
}[] = [
  { id: "data", label: "Данные", icon: User },
  { id: "security", label: "Безопасность", icon: Shield },
  { id: "support", label: "Поддержка", icon: Support },
];

const TIMEZONES = [
  "(UTC+02:00) Калининград",
  "(UTC+03:00) Москва",
  "(UTC+04:00) Самара",
  "(UTC+05:00) Екатеринбург",
  "(UTC+06:00) Омск",
  "(UTC+07:00) Красноярск",
  "(UTC+08:00) Иркутск",
  "(UTC+09:00) Якутск",
  "(UTC+10:00) Владивосток",
  "(UTC+11:00) Магадан",
  "(UTC+12:00) Камчатка",
];

const fieldClass =
  "w-full h-12 rounded-[14px] bg-[#0f1115] px-4 text-[15px] text-white outline-none transition-[box-shadow] focus:shadow-[0_0_0_3px_rgba(0,102,255,0.18)] font-[family-name:var(--font-manrope)] placeholder:text-white/30";

function Row({
  icon: Icon,
  title,
  subtitle,
  trailing,
  onClick,
}: {
  icon: typeof Mail;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "w-full flex items-center gap-3.5 min-h-[64px] px-4 py-3 text-left transition-colors",
        onClick && "cursor-pointer hover:bg-white/[0.03]",
      )}
    >
      <span className="h-10 w-10 rounded-[12px] bg-[#24262e] flex items-center justify-center shrink-0 text-white/65">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1 py-0.5">
        <span className="block text-[15px] font-medium font-[family-name:var(--font-manrope)] leading-snug text-white">
          {title}
        </span>
        {subtitle && (
          <span className="block text-[13px] text-white/40 font-[family-name:var(--font-manrope)] mt-0.5 leading-snug">
            {subtitle}
          </span>
        )}
      </span>
      <span className="shrink-0 flex items-center justify-center min-w-6 text-white/30">
        {trailing ?? (onClick ? <ArrowRight size={16} /> : null)}
      </span>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[18px] bg-[#1a1c22] overflow-hidden">
      {children}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="pt-9">
      <h2 className="text-[18px] md:text-[20px] font-semibold font-[family-name:var(--font-unbounded)] tracking-[-0.02em]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1.5 text-[14px] text-white/40 font-[family-name:var(--font-manrope)] max-w-[540px] leading-relaxed">
          {subtitle}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "relative h-7 w-12 rounded-full transition-colors shrink-0",
        checked ? "bg-[#0066ff]" : "bg-[#3a3e48]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
          checked ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

function SwitchRow({
  title,
  subtitle,
  checked,
  onChange,
}: {
  title: string;
  subtitle?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 min-h-[64px] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium font-[family-name:var(--font-manrope)]">
          {title}
        </p>
        {subtitle && (
          <p className="text-[13px] text-white/40 font-[family-name:var(--font-manrope)] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function DetailShell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="pb-16">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-[14px] text-white/45 hover:text-white font-[family-name:var(--font-manrope)] transition-colors mb-5"
      >
        <ArrowRight size={16} className="rotate-180" />
        Назад
      </button>
      <h1 className="text-[24px] md:text-[28px] font-semibold font-[family-name:var(--font-unbounded)] tracking-[-0.03em] mb-6">
        {title}
      </h1>
      {children}
    </div>
  );
}

function PrimaryBtn({
  children,
  onClick,
  variant = "blue",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "blue" | "ghost" | "dark";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full h-12 rounded-full text-[15px] font-semibold font-[family-name:var(--font-manrope)] transition-colors disabled:opacity-40 disabled:pointer-events-none",
        variant === "blue" && "bg-[#0066ff] hover:bg-[#0052cc] text-white",
        variant === "dark" && "bg-[#1c1e24] hover:bg-[#22252c] text-white",
        variant === "ghost" &&
          "bg-transparent hover:bg-white/[0.04] text-white",
      )}
    >
      {children}
    </button>
  );
}

function formatRuPhone(digits: string): string {
  let d = digits.replace(/\D/g, "");
  if (d.startsWith("8")) d = `7${d.slice(1)}`;
  if (d && !d.startsWith("7")) d = `7${d}`;
  d = d.slice(0, 11);
  const a = d.slice(1, 4);
  const b = d.slice(4, 7);
  const c = d.slice(7, 9);
  const e = d.slice(9, 11);
  let out = "+7";
  if (a.length) out += ` (${a}` + (a.length === 3 ? ")" : "");
  if (b.length) out += ` ${b}`;
  if (c.length) out += `-${c}`;
  if (e.length) out += `-${e}`;
  return out;
}

function phoneDigits(value: string): string {
  let d = value.replace(/\D/g, "");
  if (d.startsWith("8")) d = `7${d.slice(1)}`;
  if (d && !d.startsWith("7")) d = `7${d}`;
  return d.slice(0, 11);
}

function RuFlag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-7 overflow-hidden rounded-[4px] shrink-0",
        className,
      )}
      aria-hidden
    >
      <span className="flex flex-col w-full h-full">
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-[#0039a6]" />
        <span className="flex-1 bg-[#d52b1e]" />
      </span>
    </span>
  );
}

function PhoneField({
  value,
  onChange,
  label = "Номер телефона",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const applyDigits = (digits: string) => {
    const d = phoneDigits(digits);
    if (d.length <= 1) {
      onChange("+7");
      return;
    }
    onChange(formatRuPhone(d));
  };

  return (
    <label className="block">
      <span className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
        {label}
      </span>
      <div
        className={cn(
          fieldClass,
          "mt-2 flex items-center gap-3 px-3 focus-within:shadow-[0_0_0_3px_rgba(0,102,255,0.18)]",
        )}
      >
        <RuFlag />
        <span className="text-white/35 text-[14px] font-[family-name:var(--font-manrope)] select-none">
          RU
        </span>
        <span className="h-5 w-px bg-white/10 shrink-0" />
        <input
          inputMode="tel"
          autoComplete="tel"
          value={value}
          placeholder="+7 (___) ___-__-__"
          onChange={(e) => {
            const next = e.target.value;
            const prevDigits = phoneDigits(value);
            const nextDigits = phoneDigits(next);
            // Backspace hit a mask char ( ), -, space — remove a real digit instead
            if (
              next.length < value.length &&
              nextDigits.length >= prevDigits.length
            ) {
              applyDigits(
                prevDigits.slice(0, Math.max(1, prevDigits.length - 1)),
              );
              return;
            }
            applyDigits(nextDigits);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Backspace") return;
            const input = e.currentTarget;
            const start = input.selectionStart ?? 0;
            const end = input.selectionEnd ?? 0;
            if (start !== end) return;
            if (start <= 2) {
              e.preventDefault();
              return;
            }
            const before = value.slice(0, start);
            if (/\d/.test(before.slice(-1))) return;
            // Cursor is after a formatting char — delete previous digit
            e.preventDefault();
            const digits = phoneDigits(value);
            applyDigits(digits.slice(0, Math.max(1, digits.length - 1)));
          }}
          onFocus={(e) => {
            if (phoneDigits(value).length <= 1) onChange("+7");
            requestAnimationFrame(() => {
              const el = e.target;
              el.setSelectionRange(el.value.length, el.value.length);
            });
          }}
          className="flex-1 min-w-0 bg-transparent outline-none text-[15px] text-white font-[family-name:var(--font-manrope)] placeholder:text-white/25 tracking-wide"
        />
      </div>
    </label>
  );
}

function InfoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[16px] bg-[#0066ff]/10 px-4 py-3 text-[13px] text-[#9ec5ff] font-[family-name:var(--font-manrope)] leading-relaxed">
      {children}
    </div>
  );
}

function PanelView({
  panel,
  onBack,
  qrLogin,
  setQrLogin,
}: {
  panel: PanelId;
  onBack: () => void;
  qrLogin: boolean;
  setQrLogin: (v: boolean) => void;
}) {
  const [phone, setPhone] = useState(formatRuPhone("79000000000"));
  const [senderName, setSenderName] = useState("Пётр Николаев");
  const [signature, setSignature] = useState("С уважением,\nПётр");
  const [notifyLogin, setNotifyLogin] = useState(true);
  const [notifyImportant, setNotifyImportant] = useState(true);
  const [notifyPromo, setNotifyPromo] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [deletePass, setDeletePass] = useState("");
  const [loginMethod, setLoginMethod] = useState<"password" | "sms" | "otp">(
    "password",
  );
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [showRecoveryEmail, setShowRecoveryEmail] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [sessions, setSessions] = useState([
    {
      id: "1",
      title: "Это устройство",
      device: "pc" as const,
      browser: "Chrome",
      os: "Windows 11",
      location: "Москва",
      time: "Сейчас",
      current: true,
    },
    {
      id: "2",
      title: "iPhone 15",
      device: "phone" as const,
      browser: "Safari",
      os: "iOS 18",
      location: "Москва",
      time: "Вчера, 18:42",
      current: false,
    },
  ]);

  const flashSaved = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const phoneOk = phoneDigits(phone).length === 11;
  const strength = getPasswordStrength(password);
  const passOk =
    currentPass.length >= 4 &&
    password.length >= 8 &&
    strength.score >= 2 &&
    password === password2;

  return (
    <DetailShell title={PANEL_TITLES[panel]} onBack={onBack}>
      {panel === "mailbox" && (
        <div className="space-y-4">
          <div className="rounded-[22px] bg-gradient-to-br from-[#1a3a8f]/40 via-[#1a1c22] to-[#1a1c22] p-5">
            <div className="flex items-start gap-4">
              <span className="h-12 w-12 rounded-[14px] bg-[#0066ff]/20 text-[#4d9fff] flex items-center justify-center shrink-0">
                <Mail size={22} />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] text-white/40 font-[family-name:var(--font-manrope)]">
                  Основной ящик
                </p>
                <p className="mt-1 text-[20px] font-semibold font-[family-name:var(--font-manrope)] break-all">
                  pnk@pnkmail.ru
                </p>
                <p className="mt-2 text-[13px] text-white/40 font-[family-name:var(--font-manrope)]">
                  Создан в 2024 · 1,8 ГБ из 15 ГБ
                </p>
              </div>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-[12%] rounded-full bg-[#0066ff]" />
            </div>
          </div>
          <Card>
            <Row
              icon={Check}
              title="Основной адрес"
              subtitle="Используется для входа и писем"
              trailing={<Check size={16} className="text-[#4d9fff]" />}
            />
            <Row
              icon={Mail}
              title="Скопировать адрес"
              subtitle="pnk@pnkmail.ru"
              onClick={() => {
                void navigator.clipboard?.writeText("pnk@pnkmail.ru");
                flashSaved();
              }}
            />
          </Card>
          {saved && <InfoBanner>Адрес скопирован в буфер обмена</InfoBanner>}
          <InfoBanner>
            Дополнительные ящики добавляются из меню аккаунта в почте.
          </InfoBanner>
        </div>
      )}

      {panel === "phone" && (
        <div className="space-y-4">
          <div className="rounded-[18px] bg-[#1a1c22] p-4">
            <PhoneField value={phone} onChange={setPhone} />
          </div>
          <PrimaryBtn disabled={!phoneOk} onClick={flashSaved}>
            {saved ? "Номер сохранён" : "Сохранить номер"}
          </PrimaryBtn>
        </div>
      )}

      {panel === "sender" && (
        <div className="space-y-4">
          <div className="rounded-[18px] bg-[#1a1c22] p-4 space-y-4">
            <label className="block">
              <span className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
                Имя отправителя
              </span>
              <input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className={cn(fieldClass, "mt-2")}
              />
            </label>
            <label className="block">
              <span className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
                Подпись в письмах
              </span>
              <textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                rows={4}
                className={cn(
                  fieldClass,
                  "mt-2 h-auto py-3 resize-none leading-relaxed",
                )}
              />
            </label>
          </div>
          <div className="rounded-[18px] bg-[#0f1115] overflow-hidden">
            <div className="px-4 py-2.5 text-[12px] text-white/35 font-[family-name:var(--font-manrope)]">
              Предпросмотр письма
            </div>
            <div className="p-4">
              <p className="text-[12px] text-white/35 font-[family-name:var(--font-manrope)]">
                От
              </p>
              <p className="text-[14px] font-medium font-[family-name:var(--font-manrope)] mt-0.5">
                {senderName || "Без имени"}{" "}
                <span className="text-white/40">&lt;pnk@pnkmail.ru&gt;</span>
              </p>
              <div className="my-3 h-px bg-white/[0.06]" />
              <pre className="text-[13px] text-white/55 font-[family-name:var(--font-manrope)] whitespace-pre-wrap leading-relaxed">
                {signature || "Подпись не задана"}
              </pre>
            </div>
          </div>
          <PrimaryBtn onClick={flashSaved} disabled={!senderName.trim()}>
            {saved ? "Сохранено" : "Сохранить"}
          </PrimaryBtn>
        </div>
      )}

      {panel === "notifications" && (
        <div className="space-y-4">
          <InfoBanner>
            Уведомления приходят на pnk@pnkmail.ru. Их можно отключить в любой
            момент.
          </InfoBanner>
          <Card>
            <SwitchRow
              title="Вход в аккаунт"
              subtitle="Письмо при новом входе с устройства"
              checked={notifyLogin}
              onChange={setNotifyLogin}
            />
            <SwitchRow
              title="Важные события"
              subtitle="Смена пароля и восстановление доступа"
              checked={notifyImportant}
              onChange={setNotifyImportant}
            />
            <SwitchRow
              title="Новости pnk почты"
              subtitle="Обновления продукта и советы"
              checked={notifyPromo}
              onChange={setNotifyPromo}
            />
          </Card>
          <PrimaryBtn onClick={flashSaved}>
            {saved ? "Сохранено" : "Сохранить настройки"}
          </PrimaryBtn>
        </div>
      )}

      {panel === "delete" && (
        <div className="space-y-4">
          <div className="rounded-[18px] bg-[#1a1c22] p-5 space-y-3">
            <p className="text-[15px] font-semibold font-[family-name:var(--font-manrope)]">
              Что будет удалено
            </p>
            <ul className="space-y-2 text-[14px] text-white/55 font-[family-name:var(--font-manrope)]">
              <li>• Все письма и папки ящика pnk@pnkmail.ru</li>
              <li>• Настройки фильтров и подписи</li>
              <li>• Активные сессии и доступы приложений</li>
            </ul>
            <p className="text-[13px] text-white/40 font-[family-name:var(--font-manrope)] pt-1">
              Действие необратимо. Перед удалением скачайте нужные письма.
            </p>
          </div>
          <label className="block">
            <span className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
              Пароль для подтверждения
            </span>
            <input
              type="password"
              value={deletePass}
              onChange={(e) => setDeletePass(e.target.value)}
              placeholder="Введите пароль"
              className={cn(fieldClass, "mt-2")}
            />
          </label>
          <PrimaryBtn variant="dark" disabled={deletePass.length < 4}>
            Удалить аккаунт
          </PrimaryBtn>
          <PrimaryBtn variant="ghost" onClick={onBack}>
            Отмена
          </PrimaryBtn>
        </div>
      )}

      {panel === "login-method" && (
        <div className="space-y-4">
          <InfoBanner>
            Выберите, как входить в почту. Более защищённые способы требуют
            подтверждения на телефоне.
          </InfoBanner>
          <Card>
            {(
              [
                {
                  id: "password" as const,
                  icon: KeyRound,
                  title: "Обычный пароль",
                  subtitle: "Только пароль от аккаунта",
                },
                {
                  id: "sms" as const,
                  icon: Shield,
                  title: "Пароль + SMS",
                  subtitle: "Код на телефон при входе",
                },
                {
                  id: "otp" as const,
                  icon: Lock,
                  title: "Пароль + одноразовый код",
                  subtitle: "Из приложения-аутентификатора",
                },
              ] as const
            ).map((m) => (
              <Row
                key={m.id}
                icon={m.icon}
                title={m.title}
                subtitle={m.subtitle}
                onClick={() => setLoginMethod(m.id)}
                trailing={
                  loginMethod === m.id ? (
                    <Check size={16} className="text-[#4d9fff]" />
                  ) : undefined
                }
              />
            ))}
          </Card>
          <PrimaryBtn onClick={flashSaved}>
            {saved ? "Способ сохранён" : "Применить способ входа"}
          </PrimaryBtn>
        </div>
      )}

      {panel === "password" && (
        <div className="space-y-4">
          <div className="rounded-[18px] bg-[#1a1c22] p-4 space-y-3">
            <label className="block">
              <span className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
                Текущий пароль
              </span>
              <input
                type={showPass ? "text" : "password"}
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                placeholder="Введите текущий пароль"
                className={cn(fieldClass, "mt-2")}
              />
            </label>
            <label className="block">
              <span className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
                Новый пароль
              </span>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Не меньше 8 символов"
                className={cn(fieldClass, "mt-2")}
              />
              <PasswordStrengthBar password={password} />
            </label>
            <label className="block">
              <span className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
                Повторите пароль
              </span>
              <input
                type={showPass ? "text" : "password"}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="Ещё раз"
                className={cn(fieldClass, "mt-2")}
              />
            </label>
            {password2 && password !== password2 && (
              <p className="text-[12px] text-red-400 font-[family-name:var(--font-manrope)]">
                Пароли не совпадают
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="text-[13px] text-[#4d9fff] font-[family-name:var(--font-manrope)]"
            >
              {showPass ? "Скрыть пароли" : "Показать пароли"}
            </button>
          </div>
          <PrimaryBtn disabled={!passOk} onClick={flashSaved}>
            {saved ? "Пароль обновлён" : "Обновить пароль"}
          </PrimaryBtn>
        </div>
      )}

      {panel === "recovery" && (
        <div className="space-y-4">
          <Card>
            <Row
              icon={Call}
              title="Телефон"
              subtitle={`${formatRuPhone(phoneDigits(phone))} · подключён`}
            />
            <Row
              icon={Mail}
              title="Резервная почта"
              subtitle={recoveryEmail || "Не указана"}
              onClick={() => setShowRecoveryEmail(true)}
            />
            <Row
              icon={Shield}
              title="Коды восстановления"
              subtitle={
                codes
                  ? `${codes.length} кодов готовы`
                  : "Сгенерировать запасные коды"
              }
              onClick={() =>
                setCodes([
                  "A7K2-9MQ1",
                  "P3LX-8R2T",
                  "H5N0-4WQE",
                  "B9CZ-1YUF",
                  "M2KD-7SPA",
                ])
              }
            />
          </Card>
          {showRecoveryEmail && (
            <div className="rounded-[18px] bg-[#1a1c22] p-4 space-y-3">
              <label className="block">
                <span className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
                  Резервный email
                </span>
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={cn(fieldClass, "mt-2")}
                />
              </label>
              <PrimaryBtn
                disabled={!recoveryEmail.includes("@")}
                onClick={() => {
                  setShowRecoveryEmail(false);
                  flashSaved();
                }}
              >
                Сохранить почту
              </PrimaryBtn>
            </div>
          )}
          {codes && (
            <div className="rounded-[18px] bg-[#0f1115] p-4">
              <p className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)] mb-3">
                Сохраните коды в надёжном месте. Каждый код работает один раз.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {codes.map((c) => (
                  <code
                    key={c}
                    className="rounded-[12px] bg-[#1a1c22] px-3 py-2.5 text-[14px] font-mono text-white/80 tracking-wider"
                  >
                    {c}
                  </code>
                ))}
              </div>
            </div>
          )}
          {!showRecoveryEmail && (
            <PrimaryBtn
              variant="dark"
              onClick={() => setShowRecoveryEmail(true)}
            >
              Добавить резервную почту
            </PrimaryBtn>
          )}
        </div>
      )}

      {panel === "sessions" && (
        <div className="space-y-4">
          <p className="text-[14px] text-white/45 font-[family-name:var(--font-manrope)] leading-relaxed">
            Здесь видны устройства, где открыта почта. Завершите чужие сессии,
            если не узнаёте устройство.
          </p>

          <div className="space-y-3">
            {sessions.map((s) => {
              const DeviceIcon = s.device === "phone" ? Phone : HardDrive;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "rounded-[20px] p-4 md:p-5 transition-colors",
                    s.current ? "bg-[#0066ff]/10 " : "bg-[#1a1c22] ",
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    <span
                      className={cn(
                        "h-12 w-12 rounded-[14px] flex items-center justify-center shrink-0",
                        s.current
                          ? "bg-[#0066ff]/20 text-[#4d9fff]"
                          : "bg-[#24262e] text-white/55",
                      )}
                    >
                      <DeviceIcon size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[16px] font-semibold font-[family-name:var(--font-manrope)]">
                            {s.title}
                          </p>
                          <p className="mt-0.5 text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
                            {s.os} · {s.browser}
                          </p>
                        </div>
                        {s.current ? (
                          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#0066ff]/20 text-[#9ec5ff] px-2.5 py-1 text-[12px] font-medium font-[family-name:var(--font-manrope)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#4d9fff]" />
                            Сейчас
                          </span>
                        ) : (
                          <span className="shrink-0 text-[12px] text-white/35 font-[family-name:var(--font-manrope)] inline-flex items-center gap-1">
                            <Clock size={12} />
                            {s.time}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/40 font-[family-name:var(--font-manrope)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Globe size={12} />
                          {s.location}
                        </span>
                        <span className="text-white/20">·</span>
                        <span>
                          {s.current ? "Активна" : `Последний вход · ${s.time}`}
                        </span>
                      </div>
                      {!s.current && (
                        <button
                          type="button"
                          onClick={() =>
                            setSessions((list) =>
                              list.filter((x) => x.id !== s.id),
                            )
                          }
                          className="mt-4 h-10 px-4 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-[13px] font-medium font-[family-name:var(--font-manrope)] inline-flex items-center gap-2 transition-colors"
                        >
                          <LogOut size={14} />
                          Завершить сессию
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {sessions.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setSessions((list) => list.filter((s) => s.current))
              }
              className="w-full h-12 rounded-full bg-transparent hover:bg-white/[0.04] text-[14px] font-semibold font-[family-name:var(--font-manrope)] inline-flex items-center justify-center gap-2 text-white/75 hover:text-white transition-colors"
            >
              <LogOut size={16} />
              Выйти на всех других устройствах
            </button>
          )}
        </div>
      )}

      {panel === "apps" && (
        <div className="space-y-4">
          <Card>
            <Row
              icon={Mail}
              title="pnk почта"
              subtitle="Полный доступ · это приложение"
              trailing={<Check size={16} className="text-[#4d9fff]" />}
            />
          </Card>
          <div className="rounded-[18px] bg-[#1a1c22]/60 px-4 py-8 text-center">
            <Settings size={28} className="mx-auto text-white/30" />
            <p className="mt-3 text-[15px] font-medium font-[family-name:var(--font-manrope)]">
              Сторонних приложений нет
            </p>
            <p className="mt-1.5 text-[13px] text-white/40 font-[family-name:var(--font-manrope)] max-w-[360px] mx-auto leading-relaxed">
              Когда подключите IMAP/SMTP или другое приложение к почте, оно
              появится здесь — доступ можно будет отозвать.
            </p>
          </div>
        </div>
      )}

      {panel === "qr" && (
        <div className="space-y-4">
          <div className="rounded-[22px] bg-[#1a1c22] p-5">
            <p className="text-[14px] text-white/50 font-[family-name:var(--font-manrope)] leading-relaxed text-center max-w-[400px] mx-auto">
              Отсканируйте QR-код на другом устройстве, чтобы войти в почту без
              пароля.
            </p>
            <div className="mt-5 mx-auto h-44 w-44 rounded-[20px] bg-white p-4 flex items-center justify-center">
              <div className="h-full w-full rounded-[12px] bg-[repeating-linear-gradient(90deg,#0c0d10_0_2px,transparent_2px_6px),repeating-linear-gradient(0deg,#0c0d10_0_2px,transparent_2px_6px)] opacity-90 flex items-center justify-center">
                <QrCode size={64} className="text-[#0c0d10]" />
              </div>
            </div>
            <p className="mt-4 text-center text-[12px] text-white/35 font-[family-name:var(--font-manrope)]">
              Код обновится через 60 сек
            </p>
          </div>
          <Card>
            <SwitchRow
              title="Разрешить вход по QR"
              subtitle="Можно отключить в любой момент"
              checked={qrLogin}
              onChange={setQrLogin}
            />
          </Card>
        </div>
      )}
    </DetailShell>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <p className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)] mb-2">
        {label}
      </p>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          fieldClass,
          "flex items-center justify-between gap-3 text-left cursor-pointer",
          open && " shadow-[0_0_0_3px_rgba(0,102,255,0.18)]",
        )}
      >
        <span className="truncate">{value}</span>
        <ArrowDown
          size={16}
          className={cn(
            "shrink-0 text-white/40 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-[240px] overflow-y-auto rounded-[16px] bg-[#12141a] shadow-[0_16px_48px_rgba(0,0,0,0.55)] p-1.5"
        >
          {options.map((opt) => {
            const active = opt === value;
            return (
              <li key={opt}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 rounded-[12px] px-3.5 py-2.5 text-left text-[14px] font-[family-name:var(--font-manrope)] transition-colors",
                    active
                      ? "bg-[#0066ff]/20 text-white"
                      : "text-white/75 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <span className="truncate">{opt}</span>
                  {active && (
                    <Check size={15} className="text-[#4d9fff] shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AvatarCropper({
  src,
  onCancel,
  onDone,
}: {
  src: string;
  onCancel: () => void;
  onDone: (dataUrl: string) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [stage, setStage] = useState({ w: 360, h: 360 });
  const [crop, setCrop] = useState({ x: 40, y: 40, size: 200 });
  const drag = useRef<
    | null
    | { type: "move"; startX: number; startY: number; ox: number; oy: number }
    | {
        type: "resize";
        corner: "nw" | "ne" | "sw" | "se";
        startX: number;
        startY: number;
        ox: number;
        oy: number;
        osize: number;
      }
  >(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setStage({ w: r.width, h: r.height });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setStage({ w: r.width, h: r.height });
    return () => ro.disconnect();
  }, []);

  // Contain image inside stage (no overflow beyond padded frame)
  const fit = useMemo(() => {
    if (!natural.w || !stage.w)
      return { w: 0, h: 0, left: 0, top: 0, scale: 1 };
    const pad = 12;
    const availW = Math.max(1, stage.w - pad * 2);
    const availH = Math.max(1, stage.h - pad * 2);
    const scale = Math.min(availW / natural.w, availH / natural.h);
    const w = natural.w * scale;
    const h = natural.h * scale;
    return {
      w,
      h,
      left: (stage.w - w) / 2,
      top: (stage.h - h) / 2,
      scale,
    };
  }, [natural, stage]);

  useEffect(() => {
    if (!fit.w || !fit.h) return;
    const size = Math.min(fit.w, fit.h) * 0.78;
    setCrop({
      x: fit.left + (fit.w - size) / 2,
      y: fit.top + (fit.h - size) / 2,
      size,
    });
  }, [fit.w, fit.h, fit.left, fit.top]);

  const cropRef = useRef(crop);
  cropRef.current = crop;
  const fitRef = useRef(fit);
  fitRef.current = fit;

  const clampCrop = (next: { x: number; y: number; size: number }) => {
    const f = fitRef.current;
    const min = 72;
    const max = Math.min(f.w, f.h);
    const size = Math.max(min, Math.min(max, next.size));
    const x = Math.max(f.left, Math.min(f.left + f.w - size, next.x));
    const y = Math.max(f.top, Math.min(f.top + f.h - size, next.y));
    return { x, y, size };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (d.type === "move") {
        setCrop(
          clampCrop({
            x: d.ox + dx,
            y: d.oy + dy,
            size: cropRef.current.size,
          }),
        );
        return;
      }
      const signX = d.corner.includes("e") ? 1 : -1;
      const signY = d.corner.includes("s") ? 1 : -1;
      const delta = Math.abs(dx) > Math.abs(dy) ? dx * signX : dy * signY;
      let size = d.osize + delta;
      let x = d.ox;
      let y = d.oy;
      if (d.corner.includes("w")) x = d.ox + (d.osize - size);
      if (d.corner.includes("n")) y = d.oy + (d.osize - size);
      setCrop(clampCrop({ x, y, size }));
    };
    const onUp = () => {
      drag.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const exportCrop = () => {
    const img = imgRef.current;
    if (!img || !fit.scale) return;
    const c = cropRef.current;
    const sx = (c.x - fit.left) / fit.scale;
    const sy = (c.y - fit.top) / fit.scale;
    const sSize = c.size / fit.scale;
    const out = 512;
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, out, out);
    onDone(canvas.toDataURL("image/png"));
  };

  const corners = [
    { id: "nw" as const, style: { left: -6, top: -6 } },
    { id: "ne" as const, style: { right: -6, top: -6 } },
    { id: "sw" as const, style: { left: -6, bottom: -6 } },
    { id: "se" as const, style: { right: -6, bottom: -6 } },
  ];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal
        aria-label="Обрезка аватара"
        className="w-full max-w-[420px] rounded-[24px] bg-[#12141a] shadow-[0_24px_80px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3.5 flex items-center justify-between shrink-0">
          <p className="text-[15px] font-medium font-[family-name:var(--font-manrope)] text-white/85">
            Выберите область
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="h-9 w-9 rounded-full flex items-center justify-center text-white/45 hover:bg-white/10 hover:text-white"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div
          ref={stageRef}
          className="relative mx-4 mt-4 mb-2 h-[min(52vh,340px)] rounded-[16px] overflow-hidden bg-black touch-none select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget;
              setNatural({ w: el.naturalWidth, h: el.naturalHeight });
            }}
            className="absolute max-w-none pointer-events-none"
            style={{
              width: fit.w,
              height: fit.h,
              left: fit.left,
              top: fit.top,
            }}
          />

          {/* Square dim overlay via 4 panels */}
          <div
            className="absolute left-0 right-0 top-0 bg-black/55 pointer-events-none"
            style={{ height: Math.max(0, crop.y) }}
          />
          <div
            className="absolute left-0 right-0 bottom-0 bg-black/55 pointer-events-none"
            style={{ height: Math.max(0, stage.h - crop.y - crop.size) }}
          />
          <div
            className="absolute left-0 bg-black/55 pointer-events-none"
            style={{
              top: crop.y,
              height: crop.size,
              width: Math.max(0, crop.x),
            }}
          />
          <div
            className="absolute right-0 bg-black/55 pointer-events-none"
            style={{
              top: crop.y,
              height: crop.size,
              width: Math.max(0, stage.w - crop.x - crop.size),
            }}
          />

          <div
            className="absolute cursor-move rounded-[4px]"
            style={{
              left: crop.x,
              top: crop.y,
              width: crop.size,
              height: crop.size,
              boxShadow: "0 0 0 2px #fff, 0 0 0 3px rgba(0,0,0,0.35)",
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              drag.current = {
                type: "move",
                startX: e.clientX,
                startY: e.clientY,
                ox: crop.x,
                oy: crop.y,
              };
            }}
          >
            {corners.map((c) => (
              <span
                key={c.id}
                className="absolute h-3.5 w-3.5 rounded-full bg-white shadow cursor-nwse-resize"
                style={c.style}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  drag.current = {
                    type: "resize",
                    corner: c.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    ox: crop.x,
                    oy: crop.y,
                    osize: crop.size,
                  };
                }}
              />
            ))}
          </div>
        </div>

        <div className="shrink-0 px-4 py-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 px-5 rounded-full bg-[#2a2d36] hover:bg-[#32363f] text-white text-[14px] font-semibold font-[family-name:var(--font-manrope)] inline-flex items-center gap-2 transition-colors"
          >
            <X size={15} />
            Отмена
          </button>
          <button
            type="button"
            onClick={exportCrop}
            className="h-11 px-5 rounded-full bg-white hover:bg-white/90 text-[#0c0d10] text-[14px] font-semibold font-[family-name:var(--font-manrope)] inline-flex items-center gap-2 transition-colors"
          >
            <Check size={15} />
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}

function EditProfileModal({
  open,
  onClose,
  avatarUrl,
  onAvatarChange,
}: {
  open: boolean;
  onClose: () => void;
  avatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
}) {
  const [displayName, setDisplayName] = useState("Пётр");
  const [firstName, setFirstName] = useState("Пётр");
  const [lastName, setLastName] = useState("Николаев");
  const [gender, setGender] = useState<"m" | "f" | null>("m");
  const [birthDate, setBirthDate] = useState("");
  const [timezone, setTimezone] = useState(TIMEZONES[1]);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (cropSrc) {
        URL.revokeObjectURL(cropSrc);
        setCropSrc(null);
      } else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, cropSrc]);

  if (!open) return null;

  const pickFile = (file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setCropSrc(url);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/65 backdrop-blur-sm"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !cropSrc) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal
          aria-labelledby="pnk-id-edit-title"
          className="w-full sm:max-w-[520px] max-h-[92vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-[#1a1c22] shadow-[0_24px_80px_rgba(0,0,0,0.55)] p-5 md:p-7"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 mb-6">
            <h2
              id="pnk-id-edit-title"
              className="text-[22px] font-semibold font-[family-name:var(--font-unbounded)] tracking-[-0.02em]"
            >
              Ваши данные
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-full flex items-center justify-center text-white/40 hover:bg-white/[0.06] hover:text-white transition-colors"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <div
                className={cn(
                  "h-24 w-24 rounded-[22px] overflow-hidden flex items-center justify-center text-white text-[36px] font-semibold font-[family-name:var(--font-manrope)]",
                  !avatarUrl && "bg-[#0066ff]",
                )}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "П"
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-[#0c0d10] flex items-center justify-center text-white/80 hover:bg-[#16181e] transition-colors"
                aria-label="Сменить аватар"
              >
                <Camera size={15} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  pickFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-[13px] text-[#4d9fff] font-[family-name:var(--font-manrope)] hover:underline"
              >
                Загрузить фото
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => onAvatarChange(null)}
                  className="text-[13px] text-white/40 font-[family-name:var(--font-manrope)] hover:text-white/70"
                >
                  Убрать
                </button>
              )}
            </div>
          </div>

          <div className="rounded-[18px] bg-[#0f1115] p-4 mb-3">
            <label className="block">
              <span className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
                Как к вам обращаться?
              </span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={cn(fieldClass, "mt-2")}
              />
              <span className="mt-1.5 block text-[12px] text-white/35 font-[family-name:var(--font-manrope)]">
                Это имя отображается в письмах
              </span>
            </label>
          </div>

          <div className="rounded-[18px] bg-[#0f1115] p-4 mb-3 space-y-4">
            <p className="text-[15px] font-semibold font-[family-name:var(--font-manrope)]">
              Персональные данные
            </p>
            <div>
              <p className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)] mb-2">
                Имя и фамилия
              </p>
              <div className="grid grid-cols-1 gap-2">
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Имя"
                  className={fieldClass}
                />
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Фамилия"
                  className={fieldClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)] mb-2">
                  Пол
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "m" as const, label: "М" },
                      { id: "f" as const, label: "Ж" },
                    ] as const
                  ).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGender(g.id)}
                      className={cn(
                        "h-12 rounded-[14px] text-[15px] font-semibold font-[family-name:var(--font-manrope)] transition-colors ",
                        gender === g.id
                          ? "bg-[#24262e] text-white"
                          : "bg-[#1a1c22] text-white/50 hover:bg-[#22252c]",
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <DateField
                label="Дата рождения"
                value={birthDate}
                onChange={setBirthDate}
                size="md"
              />
            </div>
          </div>

          <div className="rounded-[18px] bg-[#0f1115] p-4 mb-6">
            <SelectField
              label="Часовой пояс"
              value={timezone}
              options={TIMEZONES}
              onChange={setTimezone}
            />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-full bg-[#0066ff] hover:bg-[#0052cc] transition-colors text-[15px] font-semibold font-[family-name:var(--font-manrope)]"
          >
            Сохранить
          </button>
        </div>
      </div>

      {cropSrc && (
        <AvatarCropper
          src={cropSrc}
          onCancel={() => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }}
          onDone={(dataUrl) => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
            onAvatarChange(dataUrl);
          }}
        />
      )}
    </>
  );
}

function DataPanel({
  onEdit,
  avatarUrl,
  onOpen,
}: {
  onEdit: () => void;
  avatarUrl: string | null;
  onOpen: (id: PanelId) => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onEdit}
        className="w-full rounded-[22px] bg-[#1a1c22] p-4 md:p-5 flex items-center gap-4 text-left hover:bg-[#1e2028] transition-colors"
      >
        <div
          className={cn(
            "h-14 w-14 md:h-16 md:w-16 rounded-[18px] overflow-hidden flex items-center justify-center text-white text-[22px] font-semibold font-[family-name:var(--font-manrope)] shrink-0",
            !avatarUrl && "bg-[#0066ff]",
          )}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            "П"
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] md:text-[18px] font-semibold font-[family-name:var(--font-manrope)] truncate">
            Пётр Николаев
          </p>
          <p className="text-[14px] text-white/40 font-[family-name:var(--font-manrope)] mt-0.5">
            Зовите меня: Пётр
          </p>
        </div>
        <span className="h-10 w-10 rounded-full bg-[#0f1115] flex items-center justify-center shrink-0 text-white/55">
          <Pencil size={16} />
        </span>
      </button>

      <Section
        title="Почта и контакты"
        subtitle="Адрес ящика и телефон для восстановления доступа"
      >
        <Card>
          <Row icon={Mail} title="pnk@pnkmail.ru" subtitle="Основной ящик" />
          <Row
            icon={Call}
            title="Телефон"
            subtitle="+7 (900) 000-00-00"
            onClick={() => onOpen("phone")}
          />
        </Card>
      </Section>

      <Section
        title="Управление аккаунтом"
        subtitle="Настройки, связанные с почтовым профилем"
      >
        <Card>
          <Row
            icon={Mail}
            title="Адреса для писем"
            subtitle="Подпись и имя отправителя"
            onClick={() => onOpen("sender")}
          />
          <Row
            icon={Settings}
            title="Уведомления почты"
            subtitle="Письма о входе и важных событиях"
            onClick={() => onOpen("notifications")}
          />
          <Row
            icon={Trash2}
            title="Удалить аккаунт"
            onClick={() => onOpen("delete")}
          />
        </Card>
      </Section>
    </div>
  );
}

function SecurityPanel({
  onOpen,
  qrLogin,
  setQrLogin,
}: {
  onOpen: (id: PanelId) => void;
  qrLogin: boolean;
  setQrLogin: (v: boolean) => void;
}) {
  return (
    <div className="pb-8">
      <Section title="Способ входа" subtitle="Как вы входите в почту pnk">
        <Card>
          <Row
            icon={KeyRound}
            title="Текущий способ"
            subtitle="Обычный пароль"
            trailing={<Check size={16} className="text-[#4d9fff]" />}
            onClick={() => onOpen("login-method")}
          />
          <Row
            icon={Lock}
            title="Обновить пароль"
            subtitle="Менялся 6 месяцев назад"
            onClick={() => onOpen("password")}
          />
          <Row
            icon={Shield}
            title="Способы восстановления"
            subtitle="Телефон и резервная почта"
            onClick={() => onOpen("recovery")}
          />
        </Card>
      </Section>

      <Section
        title="Телефон для входа"
        subtitle="SMS с кодом для входа и восстановления"
      >
        <Card>
          <Row
            icon={Call}
            title="+7 (900) 000-00-00"
            subtitle="Основной номер"
            onClick={() => onOpen("phone")}
          />
        </Card>
      </Section>

      <Section title="Сессии и доступ" subtitle="Где открыта ваша почта">
        <Card>
          <Row
            icon={Settings}
            title="Активные сессии"
            subtitle="Это устройство и ещё 1"
            onClick={() => onOpen("sessions")}
          />
          <Row
            icon={Lock}
            title="Приложения с доступом к почте"
            onClick={() => onOpen("apps")}
          />
        </Card>
      </Section>

      <Section
        title="Вход по QR-коду"
        subtitle="Отсканируйте код телефоном, чтобы открыть почту"
      >
        <Card>
          <Row
            icon={QrCode}
            title="Входить с QR"
            subtitle={qrLogin ? "Включено" : "Выключено"}
            onClick={() => onOpen("qr")}
            trailing={<Toggle checked={qrLogin} onChange={setQrLogin} />}
          />
        </Card>
      </Section>
    </div>
  );
}

function SupportChat({ userAvatar }: { userAvatar: string | null }) {
  type Attachment = {
    id: string;
    name: string;
    size: number;
    type: string;
    url?: string;
  };
  type Msg = {
    id: string;
    from: "user" | "support";
    text: string;
    time: string;
    attachments?: Attachment[];
  };

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "1",
      from: "support",
      text: "Здравствуйте! Вы написали в поддержку pnk Mail. Чем можем помочь?",
      time: "14:02",
    },
    {
      id: "2",
      from: "user",
      text: "Не приходят письма на pnk@pnkmail.ru уже пару часов.",
      time: "14:05",
    },
    {
      id: "3",
      from: "support",
      text: "Проверили ящик — входящие доставляются. Возможно, письмо попало в «Спам» или отфильтровалось. Можете прислать адрес отправителя?",
      time: "14:07",
    },
    {
      id: "4",
      from: "user",
      text: "Отправитель shop@example.com. В спаме тоже пусто.",
      time: "14:10",
      attachments: [
        {
          id: "a1",
          name: "screenshot.png",
          size: 240_000,
          type: "image/png",
        },
      ],
    },
    {
      id: "5",
      from: "support",
      text: "Приняли обращение №4821. Обычно разбираем такие случаи в течение 1–2 часов — напишем сюда, когда будет ответ.",
      time: "14:12",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Attachment[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingUrls = useRef<string[]>([]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  useEffect(() => {
    return () => {
      pendingUrls.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const formatSize = (n: number) => {
    if (n < 1024) return `${n} Б`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} КБ`;
    return `${(n / (1024 * 1024)).toFixed(1)} МБ`;
  };

  const nowTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const next: Attachment[] = [];
    Array.from(files).forEach((file) => {
      const url = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined;
      if (url) pendingUrls.current.push(url);
      next.push({
        id: `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        url,
      });
    });
    setPending((list) => [...list, ...next].slice(0, 8));
  };

  const removePending = (id: string) => {
    setPending((list) => {
      const item = list.find((a) => a.id === id);
      if (item?.url) {
        URL.revokeObjectURL(item.url);
        pendingUrls.current = pendingUrls.current.filter((u) => u !== item.url);
      }
      return list.filter((a) => a.id !== id);
    });
  };

  const send = () => {
    const text = draft.trim();
    if (!text && pending.length === 0) return;
    setMessages((list) => [
      ...list,
      {
        id: String(Date.now()),
        from: "user",
        text,
        time: nowTime(),
        attachments: pending.length ? pending : undefined,
      },
    ]);
    setDraft("");
    setPending([]);
  };

  const AttachmentChip = ({
    file,
    onRemove,
    tone,
  }: {
    file: Attachment;
    onRemove?: () => void;
    tone: "mine" | "theirs" | "draft";
  }) => {
    const isImage = file.type.startsWith("image/");
    return (
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-left min-w-0",
          tone === "mine" && "bg-white/15",
          tone === "theirs" && "bg-[#0f1115] ",
          tone === "draft" && "bg-[#1a1c22] ",
        )}
      >
        <span
          className={cn(
            "h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0 overflow-hidden",
            tone === "mine" ? "bg-white/20" : "bg-[#24262e]",
          )}
        >
          {isImage && file.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={file.url} alt="" className="h-full w-full object-cover" />
          ) : isImage ? (
            <ImageIcon size={16} className="text-white/70" />
          ) : (
            <FileText size={16} className="text-white/70" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium font-[family-name:var(--font-manrope)] truncate">
            {file.name}
          </p>
          <p className="text-[11px] text-white/45 font-[family-name:var(--font-manrope)]">
            {formatSize(file.size)}
          </p>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="h-7 w-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 shrink-0"
            aria-label="Убрать файл"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-[22px] bg-[#12141a] overflow-hidden flex flex-col h-[min(72vh,640px)] shadow-[0_16px_48px_rgba(0,0,0,0.35)]">
      <div className="px-4 md:px-5 py-3.5 bg-[#1a1c22] flex items-center gap-3 shrink-0">
        <span className="relative h-11 w-11 rounded-full bg-[#0066ff] flex items-center justify-center shrink-0 text-white">
          <Support size={18} />
          <span
            aria-hidden
            className="absolute right-0 bottom-0 h-3 w-3 translate-x-1/4 translate-y-1/4 rounded-full bg-[#3dd68c] ring-[2.5px] ring-[#1a1c22]"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold font-[family-name:var(--font-manrope)]">
            Поддержка pnk
          </p>
          <p className="text-[12px] text-white/40 font-[family-name:var(--font-manrope)]">
            Онлайн · отвечаем за несколько минут
          </p>
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 md:px-5 py-4 space-y-4 bg-[#0f1115]"
      >
        <div className="flex justify-center">
          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] text-white/40 font-[family-name:var(--font-manrope)]">
            Сегодня
          </span>
        </div>

        {messages.map((m) => {
          const mine = m.from === "user";
          return (
            <div
              key={m.id}
              className={cn(
                "flex items-end gap-2.5",
                mine ? "justify-end" : "justify-start",
              )}
            >
              {!mine && (
                <span className="h-8 w-8 rounded-full bg-[#0066ff] flex items-center justify-center shrink-0 text-white mb-0.5">
                  <Support size={14} />
                </span>
              )}
              <div
                className={cn(
                  "max-w-[min(100%,420px)] rounded-[18px] px-3.5 py-2.5",
                  mine
                    ? "bg-[#0066ff] text-white rounded-br-[6px]"
                    : "bg-[#1a1c22] text-white/90 rounded-bl-[6px]",
                )}
              >
                {!mine && (
                  <p className="text-[11px] text-[#9ec5ff] font-[family-name:var(--font-manrope)] mb-1">
                    Поддержка pnk
                  </p>
                )}
                {m.text ? (
                  <p className="text-[14px] font-[family-name:var(--font-manrope)] leading-relaxed whitespace-pre-wrap">
                    {m.text}
                  </p>
                ) : null}
                {m.attachments && m.attachments.length > 0 && (
                  <div
                    className={cn("space-y-2", m.text ? "mt-2.5" : undefined)}
                  >
                    {m.attachments.map((file) => (
                      <AttachmentChip
                        key={file.id}
                        file={file}
                        tone={mine ? "mine" : "theirs"}
                      />
                    ))}
                  </div>
                )}
                <p
                  className={cn(
                    "mt-1.5 text-[11px] font-[family-name:var(--font-manrope)]",
                    mine ? "text-white/55 text-right" : "text-white/35",
                  )}
                >
                  {m.time}
                </p>
              </div>
              {mine && (
                <span
                  className={cn(
                    "h-8 w-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-white text-[12px] font-semibold font-[family-name:var(--font-manrope)] mb-0.5",
                    !userAvatar && "bg-[#0066ff]",
                  )}
                >
                  {userAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={userAvatar}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "П"
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 bg-[#1a1c22] p-3 md:p-4 space-y-2.5">
        {pending.length > 0 && (
          <div className="flex flex-col gap-2">
            {pending.map((file) => (
              <AttachmentChip
                key={file.id}
                file={file}
                tone="draft"
                onRemove={() => removePending(file.id)}
              />
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="h-12 w-12 rounded-[14px] bg-[#0f1115] hover:bg-[#16181e] text-white/60 hover:text-white flex items-center justify-center shrink-0 transition-colors"
            aria-label="Прикрепить файл"
          >
            <Paperclip size={18} />
          </button>
          <div className="flex-1 min-w-0 h-12 flex items-center gap-2 rounded-[14px] bg-[#0f1115] pl-3.5 pr-1.5 ">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Напишите сообщение…"
              className="flex-1 min-w-0 h-full bg-transparent outline-none text-[14px] leading-none text-white font-[family-name:var(--font-manrope)] placeholder:text-white/30"
            />
            <button
              type="button"
              onClick={send}
              disabled={!draft.trim() && pending.length === 0}
              className="h-9 w-9 rounded-full bg-[#0066ff] hover:bg-[#0052cc] disabled:opacity-35 disabled:pointer-events-none flex items-center justify-center text-white shrink-0 transition-colors"
              aria-label="Отправить"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PnkIdPage() {
  const [nav, setNav] = useState<NavId>("data");
  const [editOpen, setEditOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [qrLogin, setQrLogin] = useState(true);

  const title = useMemo(() => {
    if (panel) return PANEL_TITLES[panel];
    return navItems.find((n) => n.id === nav)?.label ?? "pnk ID";
  }, [nav, panel]);

  const openPanel = (id: PanelId) => setPanel(id);
  const closePanel = () => setPanel(null);

  const switchNav = (id: NavId) => {
    setPanel(null);
    setNav(id);
  };

  return (
    <div className="h-dvh bg-[#0c0d10] text-white flex overflow-hidden">
      <aside className="hidden md:flex w-[240px] shrink-0 flex-col px-3 py-5 min-h-0">
        <div className="px-2 mb-6 shrink-0">
          <Logo variant="id" href="/id" priority className="w-[96px]" />
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = !panel && nav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => switchNav(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-[14px] font-[family-name:var(--font-manrope)] transition-colors",
                  active
                    ? "bg-[#1a1c22] text-white "
                    : "text-white/55 hover:bg-white/[0.04] hover:text-white/85 ",
                )}
              >
                <Icon
                  size={18}
                  className={active ? "text-white" : "text-white/45"}
                />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-2 pt-4 text-[12px] text-white/30 font-[family-name:var(--font-manrope)] space-y-2 shrink-0">
          <Link
            href="/mail"
            className="block hover:text-white/50 transition-colors"
          >
            ← В почту
          </Link>
          <p>
            <Link
              href="/help"
              className="hover:text-white/50 transition-colors"
            >
              Справка
            </Link>
            {" · "}
            <Link
              href="/legal/terms"
              className="hover:text-white/50 transition-colors"
            >
              Условия
            </Link>
          </p>
          <p>© {new Date().getFullYear()} pnk</p>
        </div>
      </aside>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-3 bg-[#0c0d10]/95 backdrop-blur shrink-0">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="h-10 w-10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/[0.05]"
            aria-label="Меню"
          >
            <Menu size={20} />
          </button>
          <Logo variant="id" href="/id" className="w-[88px]" />
          <Link
            href="/mail"
            className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)] hover:text-white/70"
          >
            Почта
          </Link>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-10 lg:px-14 py-6 md:py-10">
          <div className="max-w-[720px] pb-16">
            {!panel && (
              <>
                <div className="hidden md:flex items-center justify-between mb-8">
                  <h1 className="text-[28px] font-semibold font-[family-name:var(--font-unbounded)] tracking-[-0.03em]">
                    {title}
                  </h1>
                  <Link
                    href="/mail"
                    className="text-[14px] text-white/40 hover:text-white/70 font-[family-name:var(--font-manrope)] transition-colors"
                  >
                    Вернуться в почту
                  </Link>
                </div>
                <h1 className="md:hidden text-[24px] font-semibold font-[family-name:var(--font-unbounded)] tracking-[-0.03em] mb-6">
                  {title}
                </h1>
              </>
            )}

            {panel ? (
              <PanelView
                panel={panel}
                onBack={closePanel}
                qrLogin={qrLogin}
                setQrLogin={setQrLogin}
              />
            ) : (
              <>
                {nav === "data" && (
                  <DataPanel
                    onEdit={() => setEditOpen(true)}
                    avatarUrl={avatarUrl}
                    onOpen={openPanel}
                  />
                )}
                {nav === "security" && (
                  <SecurityPanel
                    onOpen={openPanel}
                    qrLogin={qrLogin}
                    setQrLogin={setQrLogin}
                  />
                )}
                {nav === "support" && <SupportChat userAvatar={avatarUrl} />}
              </>
            )}
          </div>
        </main>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Закрыть меню"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-[#12141a] p-4 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <Logo variant="id" href="" className="w-[92px]" />
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="h-9 w-9 rounded-full flex items-center justify-center text-white/50 hover:bg-white/[0.06]"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = !panel && nav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      switchNav(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-[14px] font-[family-name:var(--font-manrope)]",
                      active
                        ? "bg-[#1a1c22] "
                        : "text-white/60 hover:bg-white/[0.04]",
                    )}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <Link
              href="/mail"
              className="mt-auto pt-4 text-[13px] text-white/40 hover:text-white/60"
            >
              ← В почту
            </Link>
          </div>
        </div>
      )}

      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        avatarUrl={avatarUrl}
        onAvatarChange={setAvatarUrl}
      />
    </div>
  );
}
