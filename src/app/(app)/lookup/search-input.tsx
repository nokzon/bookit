"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { HardcoverSearchHit } from "@/lib/hardcover";
import { getSearchSuggestions } from "./actions";

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

type FetchedResult = { query: string; hits: HardcoverSearchHit[] };

export function SearchInput({ initialValue = "" }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  const [result, setResult] = useState<FetchedResult>({ query: "", hits: [] });
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const trimmed = value.trim();
  const queryReady = trimmed.length >= MIN_QUERY_LENGTH;
  const showsCurrentQuery = result.query === trimmed;

  useEffect(() => {
    if (!queryReady || showsCurrentQuery) return;
    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      const hits = await getSearchSuggestions(trimmed);
      // Drop stale responses: a newer keystroke may have superseded us.
      if (id !== requestId.current) return;
      setResult({ query: trimmed, hits });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [trimmed, queryReady, showsCurrentQuery]);

  useEffect(() => {
    function onPointer(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  const hits = showsCurrentQuery ? result.hits : [];
  const loading = queryReady && !showsCurrentQuery;
  const showDropdown = isOpen && queryReady && (loading || hits.length > 0);

  return (
    <div ref={wrapRef} className="relative flex-1">
      <input
        name="q"
        type="text"
        required
        autoComplete="off"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setIsOpen(false);
        }}
        placeholder="The Hobbit, or 978-3-16-148410-0"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-base"
      />

      {showDropdown && (
        <ul className="absolute left-0 right-0 top-full mt-1 z-10 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto">
          {hits.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">Searching…</li>
          ) : (
            hits.map((hit) => (
              <li key={hit.bookId}>
                <Link
                  href={`/lookup?isbn=${hit.isbn13}`}
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-start gap-3 px-3 py-2 hover:bg-gray-50"
                >
                  {hit.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hit.coverUrl}
                      alt=""
                      className="w-8 h-12 object-cover rounded flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-12 rounded bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{hit.title}</p>
                    {hit.authors.length > 0 && (
                      <p className="text-xs text-gray-500 truncate">
                        {hit.authors.join(", ")}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
