"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export const LAST_NAV_ROUTE_KEY = "bookit:lastNavRoute";

// Invisible tracker mounted in (app)/layout. Records the most recent route
// that shows the bottom nav (saved/recents/scan-without-compareWith/lookup-
// without-isbn) so the Compare exit button can return there.
export function NavRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const isNavRoute =
      pathname === "/saved" ||
      pathname === "/recents" ||
      (pathname === "/scan" && !searchParams.has("compareWith")) ||
      (pathname === "/lookup" && !searchParams.has("isbn"));

    if (!isNavRoute) return;

    const qs = searchParams.toString();
    const url = qs.length > 0 ? `${pathname}?${qs}` : pathname;
    try {
      sessionStorage.setItem(LAST_NAV_ROUTE_KEY, url);
    } catch {
      // sessionStorage unavailable (private mode, etc.) — silently skip.
    }
  }, [pathname, searchParams]);

  return null;
}
