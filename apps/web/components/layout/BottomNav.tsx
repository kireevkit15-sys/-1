"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mainTabs = [
  {
    href: "/",
    label: "Главная",
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: "/feed",
    label: "Лента",
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    href: "/battle/new",
    label: "Баттл",
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

const profileTab = {
  href: "/profile",
  icon: (
    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
};

export default function BottomNav() {
  const pathname = usePathname();

  const isActiveTab = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const isProfileActive = isActiveTab(profileTab.href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="flex items-center justify-center gap-3 px-5 pb-[max(12px,env(safe-area-inset-bottom))] max-w-lg mx-auto">
        {/* Main 3 tabs — oval glass capsule */}
        <div className="liquid-glass-capsule flex items-center rounded-[40px] p-1.5">
          {mainTabs.map((tab) => {
            const isActive = isActiveTab(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-1 px-5 py-2.5 rounded-[32px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isActive
                    ? "text-accent liquid-glass-active scale-105"
                    : "text-text-muted hover:text-text-secondary active:scale-95"
                }`}
              >
                {tab.icon}
                <span className="text-[9px] font-medium tracking-wide">{tab.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Profile — separate floating glass orb, elevated */}
        <Link
          href={profileTab.href}
          className={`liquid-glass-orb flex items-center justify-center w-[54px] h-[54px] rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] self-center ${
            isProfileActive
              ? "text-accent liquid-glass-active scale-110"
              : "text-text-muted hover:text-text-secondary active:scale-95"
          }`}
        >
          {profileTab.icon}
        </Link>
      </div>
    </nav>
  );
}
