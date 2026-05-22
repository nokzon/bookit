"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  label: string;
  href: string;
  match: (pathname: string) => boolean;
  Icon: (props: { active: boolean }) => React.ReactElement;
};

const TABS: Tab[] = [
  {
    label: "Bookit",
    href: "/scan",
    match: (p) => p === "/scan" || p.startsWith("/scan/"),
    Icon: ScanIcon,
  },
  {
    label: "Saved",
    href: "/saved",
    match: (p) => p === "/saved" || p.startsWith("/saved/"),
    Icon: SavedIcon,
  },
  {
    label: "Recents",
    href: "/recents",
    match: (p) => p === "/recents" || p.startsWith("/recents/"),
    Icon: RecentsIcon,
  },
  {
    label: "Search",
    href: "/lookup",
    match: (p) => p === "/lookup" || p.startsWith("/lookup/"),
    Icon: SearchIcon,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <ul className="mx-auto max-w-xl grid grid-cols-4">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active
                    ? "text-emerald-700"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <tab.Icon active={active} />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const iconBaseProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function ScanIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconBaseProps} aria-hidden="true">
      {/* viewfinder corners + barcode-ish lines */}
      <path d="M4 8V6a2 2 0 0 1 2-2h2" />
      <path d="M16 4h2a2 2 0 0 1 2 2v2" />
      <path d="M4 16v2a2 2 0 0 0 2 2h2" />
      <path d="M16 20h2a2 2 0 0 0 2-2v-2" />
      {active ? (
        <>
          <path d="M8 9v6" />
          <path d="M11 9v6" />
          <path d="M14 9v6" />
          <path d="M17 9v6" />
        </>
      ) : (
        <>
          <path d="M8 9v6" />
          <path d="M12 9v6" />
          <path d="M16 9v6" />
        </>
      )}
    </svg>
  );
}

function SavedIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconBaseProps} fill={active ? "currentColor" : "none"} aria-hidden="true">
      <path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-3.5L6 21V4Z" />
    </svg>
  );
}

function RecentsIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconBaseProps} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill={active ? "currentColor" : "none"} stroke="currentColor" />
      <path d="M12 7v5l3 2" stroke={active ? "white" : "currentColor"} />
    </svg>
  );
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconBaseProps} aria-hidden="true">
      <circle cx="11" cy="11" r="6" fill={active ? "currentColor" : "none"} stroke="currentColor" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" />
    </svg>
  );
}
