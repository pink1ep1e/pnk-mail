"use client";

import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import {
  formatEmail,
  MAIL_DOMAIN,
  sanitizeLocal,
  suggestEmailLocals,
} from "@/lib/email-suggest";
import {
  getPasswordStrength,
  PasswordStrengthBar,
} from "@/lib/password-strength";
import { ArrowRight, Check, Mail } from "@/lib/icons";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const inputClass =
  "h-[54px] md:h-[56px] w-full rounded-[12px] bg-[#0f1115] px-4 md:px-5 text-[16px] md:text-[17px] font-[family-name:var(--font-manrope)] text-white placeholder:text-white/35 outline-none focus:outline focus:outline-2 focus:outline-[#0066ff]";

const primaryBtn =
  "mt-1 h-[54px] md:h-[56px] w-full rounded-[12px] bg-[#0066ff] text-white font-[family-name:var(--font-manrope)] font-semibold text-[17px] inline-flex items-center justify-center gap-2 hover:bg-[#0052cc] transition-colors disabled:opacity-40 disabled:pointer-events-none";

type Step = "name" | "email" | "password";

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("name");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [local, setLocal] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const suggestions = useMemo(
    () => suggestEmailLocals(firstName, lastName),
    [firstName, lastName],
  );

  const canContinueName =
    firstName.trim().length >= 2 && lastName.trim().length >= 2;
  const canContinueEmail = local.length >= 3;
  const canSubmit =
    password.length >= 8 &&
    getPasswordStrength(password).score >= 2 &&
    password === password2 &&
    canContinueEmail;

  const goToEmail = () => {
    if (!canContinueName) return;
    if (!local && suggestions[0]) setLocal(suggestions[0]);
    setStep("email");
  };

  return (
    <div className="min-h-screen bg-[#0c0d10] text-white flex flex-col">
      <header className="pt-8 md:pt-10 pb-6 flex justify-center px-4">
        <Logo
          variant="mark"
          priority
          width={180}
          height={180}
          className="w-[140px] md:w-[180px] rounded-[32px]"
        />
      </header>

      <main className="flex-1 flex flex-col items-center px-4 pb-10">
        <div className="w-full max-w-[440px] bg-[#1a1c22] rounded-[24px] md:rounded-[28px] p-5 md:p-6">
          <div className="mb-5">
            <h1 className="font-[family-name:var(--font-unbounded)] font-bold text-[20px] md:text-[22px] tracking-[-0.02em]">
              Создание ящика
            </h1>
            <p className="mt-1.5 text-[14px] text-white/45 font-[family-name:var(--font-manrope)]">
              {step === "name" && "Как вас зовут?"}
              {step === "email" && "Выберите адрес почты"}
              {step === "password" && "Придумайте пароль"}
            </p>
          </div>

          <div className="flex gap-1.5 mb-5">
            {(["name", "email", "password"] as Step[]).map((s, i) => (
              <div
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  (["name", "email", "password"] as Step[]).indexOf(step) >= i
                    ? "bg-[#0066ff]"
                    : "bg-[#24262e]",
                )}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === "name" && (
              <motion.form
                key="name"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-3"
                autoComplete="off"
                onSubmit={(e) => {
                  e.preventDefault();
                  goToEmail();
                }}
              >
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Имя"
                  className={inputClass}
                  autoFocus
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore
                  data-bwignore
                  data-form-type="other"
                />
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Фамилия"
                  className={inputClass}
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore
                  data-bwignore
                  data-form-type="other"
                />
                <button
                  type="submit"
                  className={primaryBtn}
                  disabled={!canContinueName}
                >
                  Продолжить
                  <ArrowRight size={18} />
                </button>
              </motion.form>
            )}

            {step === "email" && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-3"
              >
                <div className="relative">
                  <input
                    value={local}
                    onChange={(e) => setLocal(sanitizeLocal(e.target.value))}
                    placeholder="логин"
                    className={cn(inputClass, "pr-[108px]")}
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore
                    data-bwignore
                    data-form-type="other"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[15px] md:text-[16px] text-white/40 font-[family-name:var(--font-manrope)] pointer-events-none">
                    @{MAIL_DOMAIN}
                  </span>
                </div>

                {suggestions.length > 0 && (
                  <div>
                    <p className="mb-2 text-[13px] text-white/40 font-[family-name:var(--font-manrope)]">
                      Предложения из имени и фамилии
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {suggestions.map((s) => {
                        const selected = local === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setLocal(s)}
                            className={cn(
                              "w-full text-left rounded-[12px] px-4 py-3 flex items-center justify-between gap-3 transition-colors font-[family-name:var(--font-manrope)]",
                              selected
                                ? "bg-[#0066ff]/20 outline-1 outline-[#0066ff]"
                                : "bg-[#0f1115] hover:bg-[#24262e]",
                            )}
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <Mail
                                size={16}
                                className={
                                  selected ? "text-[#4d9fff]" : "text-white/35"
                                }
                              />
                              <span className="text-[15px] truncate">
                                <span className="text-white font-medium">
                                  {s}
                                </span>
                                <span className="text-white/35">
                                  @{MAIL_DOMAIN}
                                </span>
                              </span>
                            </span>
                            {selected && (
                              <Check
                                size={16}
                                className="text-[#4d9fff] shrink-0"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className={primaryBtn}
                  disabled={!canContinueEmail}
                  onClick={() => setStep("password")}
                >
                  Продолжить
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setStep("name")}
                  className="h-[48px] rounded-[12px] text-white/45 font-[family-name:var(--font-manrope)] text-[15px] hover:text-white transition-colors"
                >
                  Назад
                </button>
              </motion.div>
            )}

            {step === "password" && (
              <motion.form
                key="password"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-3"
                autoComplete="off"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="rounded-[12px] bg-[#0f1115] px-4 py-3 mb-1">
                  <p className="text-[13px] text-white/40 font-[family-name:var(--font-manrope)]">
                    Ваш адрес
                  </p>
                  <p className="mt-0.5 text-[15px] font-medium font-[family-name:var(--font-manrope)] text-[#4d9fff]">
                    {formatEmail(local)}
                  </p>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Пароль (от 8 символов)"
                  className={inputClass}
                  autoFocus
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore
                  data-bwignore
                  data-form-type="other"
                />
                <PasswordStrengthBar password={password} />
                <input
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="Повторите пароль"
                  className={inputClass}
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore
                  data-bwignore
                  data-form-type="other"
                />
                {password2.length > 0 && password !== password2 && (
                  <p className="text-[13px] text-red-400 font-[family-name:var(--font-manrope)]">
                    Пароли не совпадают
                  </p>
                )}
                <button
                  type="submit"
                  className={primaryBtn}
                  disabled={!canSubmit}
                >
                  Создать ящик
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="h-[48px] rounded-[12px] text-white/45 font-[family-name:var(--font-manrope)] text-[15px] hover:text-white transition-colors"
                >
                  Назад
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-5 px-1 flex items-center justify-between gap-4 font-[family-name:var(--font-manrope)] text-[14px] text-white/40">
            <Link href="/login" className="hover:text-white transition-colors">
              Уже есть ящик?
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Проблемы?
            </Link>
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
        <div className="max-w-[900px] mx-auto mt-6">
          <Link
            href="/"
            className="text-[14px] font-[family-name:var(--font-manrope)] text-white/35 hover:text-white transition-colors"
          >
            ← На главную
          </Link>
        </div>
      </footer>
    </div>
  );
}
