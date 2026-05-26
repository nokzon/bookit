"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Back"
      className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center transition-opacity hover:opacity-80 active:opacity-60 flex-shrink-0"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/compare-books/back-button.svg"
        alt=""
        width={22}
        height={22}
      />
    </button>
  );
}
