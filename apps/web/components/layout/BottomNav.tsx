"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mainTabs = [
  {
    href: "/",
    label: "Главная",
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
  {
    href: "/learn",
    label: "Обучение",
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15v-3.75m0 0h-.008v.008H6.75V11.25z" />
      </svg>
    ),
  },
];

const profileTab = {
  href: "/profile",
  icon: (
    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  ),
};

export default function BottomNav() {
  const pathname = usePathname();

  const isActiveTab = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const isProfileActive = isActiveTab(profileTab.href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
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
