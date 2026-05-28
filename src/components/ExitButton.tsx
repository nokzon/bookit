"use client";

import { useRouter } from "next/navigation";
import { LAST_NAV_ROUTE_KEY } from "@/components/NavRouteTracker";

const FALLBACK_HREF = "/scan";

export function ExitButton() {
  const router = useRouter();

  const onClick = () => {
    let dest = FALLBACK_HREF;
    try {
      dest = sessionStorage.getItem(LAST_NAV_ROUTE_KEY) ?? FALLBACK_HREF;
    } catch {
      // sessionStorage unavailable — fall back.
    }
    router.push(dest);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center transition-colors hover:bg-[#F0F0F0] active:bg-[#E0E0E0] flex-shrink-0"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/book-details/exit-icon.svg" alt="" width={20} height={20} />
    </button>
  );
}
