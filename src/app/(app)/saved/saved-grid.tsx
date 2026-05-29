"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SavedEntry } from "@/lib/db/saved";

const JOST_STACK = "var(--font-jost), system-ui, sans-serif";

type SortKey = "recent" | "oldest" | "title" | "author";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Recently added" },
  { key: "oldest", label: "Oldest first" },
  { key: "title", label: "Title (A–Z)" },
  { key: "author", label: "Author (A–Z)" },
];

const SORT_LABEL: Record<SortKey, string> = Object.fromEntries(
  SORT_OPTIONS.map((o) => [o.key, o.label]),
) as Record<SortKey, string>;

function sortEntries(entries: SavedEntry[], sort: SortKey): SavedEntry[] {
  const copy = [...entries];
  switch (sort) {
    case "recent":
      return copy.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    case "oldest":
      return copy.sort((a, b) => a.savedAt.localeCompare(b.savedAt));
    case "title":
      return copy.sort((a, b) =>
        (a.book.title ?? "").localeCompare(b.book.title ?? ""),
      );
    case "author":
      return copy.sort((a, b) =>
        (a.book.authors[0] ?? "").localeCompare(b.book.authors[0] ?? ""),
      );
  }
}

export function SavedGrid({ entries }: { entries: SavedEntry[] }) {
  const [sort, setSort] = useState<SortKey>("recent");
  const [open, setOpen] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!pillRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const sorted = sortEntries(entries, sort);

  return (
    <div className="space-y-6">
      <div ref={pillRef} className="relative inline-block">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="inline-flex items-center bg-white/80 hover:bg-white/60 active:bg-white/40 transition-colors"
          style={{
            padding: "4px 12px",
            gap: "6.712px",
            borderRadius: "100px",
            border: "1px solid rgba(84, 84, 84, 0.10)",
            fontFamily: JOST_STACK,
            fontSize: "16px",
            color: "#1E1E1E",
          }}
        >
          <span>{SORT_LABEL[sort]}</span>
          <span style={{ marginLeft: "2px", display: "inline-flex" }}>
            <ChevronDown />
          </span>
        </button>

        {open && (
          <ul
            role="listbox"
            className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden whitespace-nowrap min-w-full"
            style={{ fontFamily: JOST_STACK }}
          >
            {SORT_OPTIONS.map((opt) => (
              <li key={opt.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={sort === opt.key}
                  onClick={() => {
                    setSort(opt.key);
                    setOpen(false);
                  }}
                  className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-gray-50 active:bg-gray-100"
                  style={{
                    color: "#1E1E1E",
                    fontWeight: sort === opt.key ? 700 : 400,
                  }}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ul className="grid grid-cols-2 gap-x-5 gap-y-7">
        {sorted.map((entry) => (
          <li key={entry.bookId}>
            <BookCard entry={entry} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function BookCard({ entry }: { entry: SavedEntry }) {
  const { book } = entry;
  return (
    <Link
      href={`/lookup?isbn=${book.isbn_13}`}
      className="group block"
    >
      {book.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.cover_url}
          alt=""
          className="w-full aspect-[2/3] object-cover rounded-md shadow-sm transition-opacity group-hover:opacity-90 group-active:opacity-80"
        />
      ) : (
        <div className="w-full aspect-[2/3] rounded-md bg-gray-100 flex items-center justify-center px-3 text-center text-[11px] text-gray-400 shadow-sm">
          {book.title ?? "no cover"}
        </div>
      )}

      <p className="mt-3 text-base font-semibold leading-tight text-[#1E1E1E] truncate">
        {book.title ?? "Untitled"}
      </p>
      {book.authors.length > 0 && (
        <p className="mt-1 text-sm text-gray-500 truncate">
          {book.authors.join(", ")}
        </p>
      )}
    </Link>
  );
}

function ChevronDown() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ color: "#1E1E1E" }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
