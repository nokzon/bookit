"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";

type Props = {
  email: string | null | undefined;
  avatarUrl: string | null | undefined;
};

export function ProfileMenu({ email, avatarUrl }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click + Esc
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const initial = (email ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="w-10 h-10 rounded-full overflow-hidden border border-gray-300 bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700 shadow-sm hover:ring-2 hover:ring-gray-300/60 transition"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : (
          <span aria-hidden="true">{initial}</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-50"
        >
          {email && (
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-500">Signed in as</p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {email}
              </p>
            </div>
          )}
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
