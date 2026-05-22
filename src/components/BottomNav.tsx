"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  label: string;
  href: string;
  match: (pathname: string) => boolean;
  icon: { src: string; width: number; height: number };
};

const MAIN_TABS: Tab[] = [
  {
    label: "Bookit!",
    href: "/scan",
    match: (p) => p === "/scan" || p.startsWith("/scan/"),
    icon: { src: "/navbar/bookit-icon.svg", width: 28, height: 24 },
  },
  {
    label: "Saved",
    href: "/saved",
    match: (p) => p === "/saved" || p.startsWith("/saved/"),
    icon: { src: "/navbar/saved-icon.svg", width: 24, height: 24 },
  },
  {
    label: "Recents",
    href: "/recents",
    match: (p) => p === "/recents" || p.startsWith("/recents/"),
    icon: { src: "/navbar/recents-icon.svg", width: 24, height: 24 },
  },
];

const SEARCH_TAB: Tab = {
  label: "Search",
  href: "/lookup",
  match: (p) => p === "/lookup" || p.startsWith("/lookup/"),
  icon: { src: "/navbar/search-icon.svg", width: 22, height: 22 },
};

const BAR_BG = "#F5F5F5";
const ACTIVE_BG = "#E8E8E8";

export function BottomNav() {
  const pathname = usePathname();
  const searchActive = SEARCH_TAB.match(pathname);

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-3 inset-x-3 z-40 flex items-stretch justify-center gap-3 pb-[env(safe-area-inset-bottom)]"
    >
      {/* Main pill: 3 tabs */}
      <ul
        className="flex-1 grid grid-cols-3 rounded-full p-1.5 shadow-sm"
        style={{ backgroundColor: BAR_BG }}
      >
        {MAIN_TABS.map((tab) => (
          <li key={tab.href}>
            <TabLink tab={tab} active={tab.match(pathname)} />
          </li>
        ))}
      </ul>

      {/* Search: separate circular pill */}
      <Link
        href={SEARCH_TAB.href}
        aria-label="Search"
        aria-current={searchActive ? "page" : undefined}
        className="flex-shrink-0 w-16 rounded-full shadow-sm flex items-center justify-center"
        style={{
          backgroundColor: searchActive ? ACTIVE_BG : BAR_BG,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SEARCH_TAB.icon.src}
          alt=""
          width={SEARCH_TAB.icon.width}
          height={SEARCH_TAB.icon.height}
        />
      </Link>
    </nav>
  );
}

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-full transition-colors"
      style={{
        backgroundColor: active ? ACTIVE_BG : "transparent",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tab.icon.src}
        alt=""
        width={tab.icon.width}
        height={tab.icon.height}
      />
      <span className="text-[12px] font-medium text-[#1E1E1E]">
        {tab.label}
      </span>
    </Link>
  );
}
