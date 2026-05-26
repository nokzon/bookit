"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

const CLASS_NAMES =
  "w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center transition-opacity hover:opacity-80 active:opacity-60 flex-shrink-0";

export function BackButton({ href }: { href?: string }) {
  const router = useRouter();

  // eslint-disable-next-line @next/next/no-img-element
  const icon = (
    <img
      src="/compare-books/back-button.svg"
      alt=""
      width={22}
      height={22}
    />
  );

  if (href) {
    return (
      <Link href={href} aria-label="Back" className={CLASS_NAMES}>
        {icon}
      </Link>
    );
  }

  // No explicit destination → use the browser history (rare fallback).
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Back"
      className={CLASS_NAMES}
    >
      {icon}
    </button>
  );
}
