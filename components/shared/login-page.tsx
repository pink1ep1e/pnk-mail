"use client";

import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { ArrowRight, QrCode } from "@/lib/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type LoginMethod = "password" | "qr";

const inputClass =
  "h-[54px] md:h-[56px] rounded-[12px] bg-[#0f1115] px-4 md:px-5 text-[16px] md:text-[17px] font-[family-name:var(--font-manrope)] text-white placeholder:text-white/35 outline-none transition-[box-shadow,background-color] focus:bg-[#12141a] focus:shadow-[0_0_0_3px_rgba(0,102,255,0.22)]";

const primaryBtn =
  "mt-1 h-[54px] md:h-[56px] rounded-[12px] bg-[#0066ff] text-white font-[family-name:var(--font-manrope)] font-semibold text-[17px] inline-flex items-center justify-center gap-2 hover:bg-[#0052cc] transition-colors";

export default function LoginPage() {
  const router = useRouter();
  const [active, setActive] = useState<LoginMethod | null>(null);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-[#0c0d10] text-white flex flex-col">
      <header className="pt-8 md:pt-10 pb-6 flex justify-center px-4">
        <Logo
          variant="bg"
          priority
          width={180}
          height={96}
          className="w-[140px] md:w-[180px]"
        />
      </header>

      <main className="flex-1 flex flex-col items-center px-4 pb-10">
        <div className="w-full max-w-[440px] bg-[#1a1c22] rounded-[24px] md:rounded-[28px] p-4 md:p-5">
          <div className="grid grid-cols-[1.55fr_1fr] gap-2.5 md:gap-3 items-stretch">
            <button
              type="button"
              onClick={() => setActive("password")}
              className={cn(
                "flex flex-col justify-between text-left rounded-[18px] md:rounded-[20px] min-h-[132px] md:min-h-[148px] p-4 md:p-5 transition-colors overflow-hidden",
                active === "password" || active === null
                  ? "bg-gradient-to-br from-[#3d8fff] via-[#0066ff] to-[#0052cc] text-white"
                  : "bg-[#24262e] text-white/80 hover:bg-[#2a2d36]",
              )}
            >
              <div
                className={cn(
                  "h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0",
                  active === "password" || active === null
                    ? "bg-white text-[#0066ff]"
                    : "bg-white/10 text-white",
                )}
              >
                <ArrowRight size={18} strokeWidth={2.5} />
              </div>
              <p className="font-[family-name:var(--font-manrope)] font-semibold text-[15px] md:text-[16px] leading-tight">
                Войти по логину
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActive("qr")}
              className={cn(
                "flex flex-col justify-between text-left rounded-[18px] md:rounded-[20px] min-h-[132px] md:min-h-[148px] p-4 md:p-5 transition-colors overflow-hidden",
                active === "qr"
                  ? "bg-gradient-to-br from-[#3d8fff] via-[#0066ff] to-[#0052cc] text-white"
                  : "bg-[#24262e] text-white hover:bg-[#2a2d36]",
              )}
            >
              <div
                className={cn(
                  "h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0",
                  active === "qr"
                    ? "bg-white text-[#0066ff]"
                    : "bg-transparent text-white",
                )}
              >
                <QrCode size={20} />
              </div>
              <p className="font-[family-name:var(--font-manrope)] font-semibold text-[15px] md:text-[16px] leading-tight">
                По QR-коду
              </p>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {active && (
              <motion.div
                key={active}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <div className="pt-4">
                  {active === "password" && (
                    <form
                      className="flex flex-col gap-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        router.push("/mail");
                      }}
                      autoComplete="off"
                    >
                      <input
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                        placeholder="Логин или почта"
                        className={inputClass}
                        autoFocus
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        name="pnk-login"
                        data-lpignore="true"
                        data-1p-ignore
                        data-bwignore
                        data-form-type="other"
                      />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Пароль"
                        className={inputClass}
                        autoComplete="new-password"
                        name="pnk-password"
                        data-lpignore="true"
                        data-1p-ignore
                        data-bwignore
                        data-form-type="other"
                      />
                      <button type="submit" className={primaryBtn}>
                        Войти
                        <ArrowRight size={18} />
                      </button>
                    </form>
                  )}

                  {active === "qr" && (
                    <div className="rounded-[16px] bg-[#0f1115] p-5 md:p-6 flex flex-col items-center text-center">
                      <div className="h-36 w-36 md:h-40 md:w-40 rounded-[14px] bg-[#24262e] flex items-center justify-center">
                        <div className="grid grid-cols-5 gap-1.5 p-4">
                          {Array.from({ length: 25 }).map((_, i) => (
                            <div
                              key={i}
                              className={cn(
                                "h-2.5 w-2.5 md:h-3 md:w-3 rounded-[2px]",
                                [
                                  0, 1, 2, 4, 5, 6, 8, 10, 12, 14, 16, 18, 19,
                                  20, 22, 23, 24,
                                ].includes(i)
                                  ? "bg-white"
                                  : "bg-transparent",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="mt-4 text-[14px] text-white/45 font-[family-name:var(--font-manrope)] max-w-[280px]">
                        Отсканируйте код в приложении pnk почта, чтобы войти без
                        пароля.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-5 px-1 flex items-center justify-between gap-4 font-[family-name:var(--font-manrope)] text-[14px] text-white/40">
            <Link
              href="/register"
              className="hover:text-white transition-colors"
            >
              Создать ящик
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Проблемы со входом?
            </Link>
          </div>
        </div>

        <div className="w-full max-w-[440px] mt-3 bg-[#1a1c22] rounded-[16px] px-5 py-3.5 flex flex-row flex-wrap items-center gap-x-5 gap-y-2 font-[family-name:var(--font-manrope)]">
          <span className="text-[14px] leading-none text-white/45 shrink-0">
            Установить приложение:
          </span>
          <div className="flex items-center gap-5">
            <Link
              href="/install?os=android"
              className="inline-flex items-center gap-0 whitespace-nowrap text-[14px] leading-none font-medium text-[#4d9fff] hover:opacity-70 transition-opacity"
            >
              <svg
                width="28"
                height="24"
                viewBox="0 0 35 30"
                xmlns="http://www.w3.org/2000/svg"
                focusable="false"
                className="shrink-0 block"
                aria-hidden
              >
                <path
                  fill="#0066ff"
                  fillRule="evenodd"
                  d="M11.0952 11.5642C10.4621 11.5642 9.94897 12.0974 9.94897 12.7552V18.3129C9.94897 18.9706 10.4621 19.5038 11.0952 19.5038C11.7282 19.5038 12.2413 18.9706 12.2413 18.3129V12.7552C12.2413 12.0974 11.7282 11.5642 11.0952 11.5642Z"
                ></path>
                <path
                  fill="#0066ff"
                  fillRule="evenodd"
                  d="M24.0851 11.5642C23.4521 11.5642 22.939 12.0974 22.939 12.7552V18.3129C22.939 18.9706 23.4521 19.5038 24.0851 19.5038C24.7182 19.5038 25.2313 18.9706 25.2313 18.3129V12.7552C25.2313 12.0974 24.7182 11.5642 24.0851 11.5642Z"
                ></path>
                <path
                  fill="#0066ff"
                  fillRule="evenodd"
                  d="M21.7927 11.5642H13.3874C13.1764 11.5642 13.0054 11.742 13.0054 11.9612V18.3129C13.0052 19.2563 13.644 20.0694 14.5336 20.2581V23.0767C14.5336 23.7344 15.0468 24.2676 15.6798 24.2676C16.3128 24.2676 16.826 23.7344 16.826 23.0767V20.2978H18.3542V23.0767C18.3542 23.7344 18.8674 24.2676 19.5004 24.2676C20.1334 24.2676 20.6466 23.7344 20.6466 23.0767V20.2581C21.5362 20.0694 22.175 19.2563 22.1749 18.3129V11.9612C22.1749 11.742 22.0037 11.5642 21.7927 11.5642Z"
                ></path>
                <path
                  fill="#0066ff"
                  fillRule="evenodd"
                  d="M20.3678 6.85758L21.2992 5.89053C21.451 5.7382 21.4552 5.48691 21.3086 5.32919C21.162 5.1715 20.9202 5.16714 20.7684 5.31944C20.7652 5.32264 20.7621 5.32587 20.759 5.32919L19.674 6.45664C18.345 5.85681 16.8361 5.85681 15.5072 6.45664L14.4222 5.3284C14.2704 5.17608 14.0285 5.18047 13.8819 5.33816C13.7389 5.49201 13.7389 5.73589 13.8819 5.88971L14.8126 6.85754C13.678 7.63761 12.9985 8.9596 13.0054 10.3732C13.0054 10.5925 13.1765 10.7702 13.3876 10.7702H21.7929C22.0039 10.7702 22.175 10.5925 22.175 10.3732C22.1819 8.95963 21.5024 7.63765 20.3678 6.85758Z"
                ></path>
                <path
                  fill="#1a1c22"
                  d="M15.6432 9.64767C16.0219 9.64767 16.3289 9.34067 16.3289 8.96196C16.3289 8.58325 16.0219 8.27625 15.6432 8.27625C15.2645 8.27625 14.9575 8.58325 14.9575 8.96196C14.9575 9.34067 15.2645 9.64767 15.6432 9.64767Z"
                ></path>
                <path
                  fill="#1a1c22"
                  d="M19.5011 9.64767C19.8799 9.64767 20.1869 9.34067 20.1869 8.96196C20.1869 8.58325 19.8799 8.27625 19.5011 8.27625C19.1224 8.27625 18.8154 8.58325 18.8154 8.96196C18.8154 9.34067 19.1224 9.64767 19.5011 9.64767Z"
                ></path>
              </svg>
              <span>на&nbsp;Android</span>
            </Link>
            <Link
              href="/install?os=ios"
              className="inline-flex items-center gap-0 whitespace-nowrap text-[14px] leading-none font-medium text-[#4d9fff] hover:opacity-70 transition-opacity"
            >
              <svg
                width="24"
                height="20"
                viewBox="0 0 35 20"
                xmlns="http://www.w3.org/2000/svg"
                focusable="false"
                className="shrink-0 block"
                aria-hidden
              >
                <path
                  fill="#0066ff"
                  fillRule="evenodd"
                  d="M25.7386 13.3833C25.6775 13.2893 25.5781 13.2265 25.4665 13.2115C23.9986 13.0208 22.964 11.6829 23.1558 10.2231C23.2912 9.1919 24.0173 8.33323 25.0155 8.02356C25.2183 7.95894 25.33 7.74314 25.265 7.54153C25.2549 7.51016 25.2407 7.48019 25.2229 7.45237C24.5493 6.24338 23.3516 5.41191 21.9782 5.19995C21.2861 5.2328 20.6041 5.37809 19.9592 5.63004C19.496 5.81541 19.0069 5.92893 18.5091 5.9666C18.0112 5.92893 17.5222 5.81541 17.059 5.63004C16.4141 5.37809 15.7321 5.2328 15.04 5.19995C13.6007 5.19995 10.8 7.22928 10.8 10.9499C10.8 14.4857 13.3934 18.9998 15.4255 18.9998C16.2009 19.0067 16.9669 18.8312 17.6611 18.4876C17.9226 18.3442 18.2116 18.2575 18.5091 18.2331C18.8067 18.2575 19.0957 18.3442 19.3571 18.4876C20.0514 18.8312 20.8174 19.0067 21.5928 18.9998C23.204 18.9998 25.0225 16.249 25.7842 13.6999C25.8161 13.5928 25.7994 13.4772 25.7386 13.3833Z"
                ></path>
                <path
                  fill="#0066ff"
                  fillRule="evenodd"
                  d="M17.8001 5.2C20.2291 5.19767 22.1975 3.47534 22.2001 1.35001C22.2001 1.15671 22.0211 1 21.8002 1C19.3712 1.00233 17.4028 2.72466 17.4001 4.84999C17.4001 5.04329 17.5792 5.2 17.8001 5.2Z"
                ></path>
              </svg>
              <span>на&nbsp;iOS</span>
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
