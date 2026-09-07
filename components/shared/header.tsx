"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { mailAuthStartUrl } from "@/lib/id-auth";
import { Menu, Search } from "@/lib/icons";
import { useRouter } from "next/navigation";

interface Props {
  className?: string;
  active?: string;
}

const navItems = [
  { id: "all", label: "Для всех", href: "/" },
  { id: "business", label: "Для бизнеса", href: "/business" },
  { id: "teams", label: "Для команд", href: "#" },
  { id: "dev", label: "Для разработчиков", href: "#" },
];

export const Header: React.FC<Props> = ({ className, active = "all" }) => {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState(active);
  const isBusiness = active === "business" || activeNav === "business";

  const handleNav = (id: string, href: string) => {
    setActiveNav(id);
    setIsMobileMenuOpen(false);
    if (href !== "#") router.push(href);
  };

  const goAuth = (kind: "login" | "register") => {
    window.location.href = mailAuthStartUrl(kind);
  };

  return (
    <header className={cn("fixed top-0 left-0 right-0 z-50 w-full", className)}>
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 md:px-8 py-4 md:py-5">
        <div className="flex items-center gap-3">
          <Logo
            variant={isBusiness ? "business" : "text"}
            priority
            width={isBusiness ? 269 : 108}
            height={57}
            className="h-[48px] md:h-[57px] w-auto"
          />
        </div>

        <div className="hidden md:flex items-center gap-1 bg-white/15 p-1 rounded-full font-[family-name:var(--font-manrope)] font-medium text-[15px] lg:text-[16px]">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id, item.href)}
              className={cn(
                "py-2.5 px-4 lg:px-5 rounded-full transition-colors",
                activeNav === item.id
                  ? "bg-white text-[#003399]"
                  : "text-white hover:bg-white/10",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <button
            className="hidden md:flex h-10 w-10 items-center justify-center text-white/90 hover:text-white transition-colors"
            aria-label="Поиск"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => goAuth("register")}
            className="hidden md:block h-10 px-3 text-[15px] text-white font-[family-name:var(--font-manrope)] hover:opacity-80 transition-opacity"
          >
            Создать ящик
          </button>
          <button
            onClick={() => goAuth("login")}
            className="hidden md:inline-flex h-10 items-center gap-2 px-4 text-[15px] text-white font-[family-name:var(--font-manrope)] font-medium hover:opacity-80 transition-opacity"
          >
            Войти
          </button>
          <button
            className="md:hidden p-2 text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Меню"
          >
            <Menu size={26} />
          </button>
          <button
            className="hidden md:flex h-10 w-10 items-center justify-center text-white"
            aria-label="Меню"
          >
            <Menu size={22} strokeWidth={2} />
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden mx-5 mb-3 rounded-[20px] bg-[#0a1a3a] p-3 font-[family-name:var(--font-manrope)]">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id, item.href)}
              className={cn(
                "w-full text-left py-3 px-4 rounded-[14px] transition-colors",
                activeNav === item.id
                  ? "bg-white text-[#003399]"
                  : "text-white/90 hover:bg-white/10",
              )}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => goAuth("login")}
            className="mt-2 w-full h-12 rounded-full bg-white text-[#003399] font-semibold"
          >
            Войти в почту
          </button>
        </div>
      )}
    </header>
  );
};
