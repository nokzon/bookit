"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { HardcoverSearchHit } from "@/lib/hardcover";
import { getSearchSuggestions } from "@/app/(app)/lookup/actions";
import { selectForCompare } from "./actions";

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;
const SEARCH_TEXT_COLOR = "#6F7961";
const PILL_ICON_COLOR = "#595959";

const LIVVIC_STACK = "var(--font-livvic), system-ui, sans-serif";
const JOST_STACK = "var(--font-jost), system-ui, sans-serif";

const SECTION_HEADING_STYLE = {
  overflow: "hidden" as const,
  color: "#000",
  textOverflow: "ellipsis" as const,
  fontFamily: LIVVIC_STACK,
  fontSize: "20px",
  fontWeight: 500,
  lineHeight: "normal" as const,
};

export type CompareCandidate = {
  bookId: number;
  title: string | null;
  authors: string[];
  coverUrl: string | null;
  isbn13: string;
};

type Library = "saved" | "recents";
type FetchedResult = { query: string; hits: HardcoverSearchHit[] };

const LIBRARY_LABEL: Record<Library, string> = {
  saved: "Saved",
  recents: "Recents",
};

export function PickerGrid({
  savedCandidates,
  recentCandidates,
  selectedA,
  scanHref,
}: {
  savedCandidates: CompareCandidate[];
  recentCandidates: CompareCandidate[];
  selectedA: number | null;
  scanHref: string;
}) {
  const [library, setLibrary] = useState<Library>("saved");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [result, setResult] = useState<FetchedResult>({ query: "", hits: [] });

  const pillRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const trimmed = query.trim();
  const queryReady = trimmed.length >= MIN_QUERY_LENGTH;
  const showsCurrentQuery = result.query === trimmed;

  useEffect(() => {
    if (!queryReady || showsCurrentQuery) return;
    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      const hits = await getSearchSuggestions(trimmed);
      if (id !== requestId.current) return;
      setResult({ query: trimmed, hits });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [trimmed, queryReady, showsCurrentQuery]);

  useEffect(() => {
    function onPointer(e: PointerEvent) {
      const target = e.target as Node;
      if (!pillRef.current?.contains(target)) setDropdownOpen(false);
      if (!searchRef.current?.contains(target)) setSearchOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  const candidates =
    library === "saved" ? savedCandidates : recentCandidates;
  const hits = showsCurrentQuery ? result.hits : [];
  const loading = queryReady && !showsCurrentQuery;
  const showDropdown = searchOpen && queryReady && (loading || hits.length > 0);

  const hrefFor = (bookId: number): string =>
    selectedA === null
      ? `/compare?a=${bookId}`
      : `/compare?a=${selectedA}&b=${bookId}`;

  return (
    <div className="space-y-8" style={{ marginTop: "32px" }}>
      <div ref={searchRef} className="relative">
        <svg
          aria-hidden="true"
          className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: SEARCH_TEXT_COLOR }}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSearchOpen(false);
          }}
          placeholder="Search by book title or ISBN"
          aria-label="Search books on Hardcover"
          className="w-full pl-11 pr-4 py-3 text-sm focus:outline-none placeholder:text-[#6F7961]"
          style={{
            borderRadius: "100px",
            background: "rgba(142, 157, 144, 0.16)",
            mixBlendMode: "plus-darker",
            color: SEARCH_TEXT_COLOR,
          }}
        />

        {showDropdown && (
          <ul className="absolute left-0 right-0 top-full mt-1 z-10 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto">
            {hits.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">Searching…</li>
            ) : (
              hits.map((hit) => (
                <li key={hit.bookId}>
                  <form action={selectForCompare}>
                    <input type="hidden" name="isbn" value={hit.isbn13} />
                    <input
                      type="hidden"
                      name="a"
                      value={selectedA ?? ""}
                    />
                    <button
                      type="submit"
                      onClick={() => setSearchOpen(false)}
                      className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-gray-50 active:bg-gray-100"
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
                        <p className="text-sm font-medium truncate">
                          {hit.title}
                        </p>
                        {hit.authors.length > 0 && (
                          <p className="text-xs text-gray-500 truncate">
                            {hit.authors.join(", ")}
                          </p>
                        )}
                      </div>
                    </button>
                  </form>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <section className="space-y-3">
        <h2 style={SECTION_HEADING_STYLE}>Your Library</h2>

        <div ref={pillRef} className="relative inline-block">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            className="inline-flex items-center transition-opacity hover:opacity-80 active:opacity-60"
            style={{
              padding: "4px 12px",
              gap: "6.712px",
              borderRadius: "100px",
              border: "1px solid rgba(84, 84, 84, 0.10)",
              background: "rgba(255, 255, 255, 0.80)",
              fontFamily: JOST_STACK,
              fontSize: "16px",
              color: "#1E1E1E",
            }}
          >
            <LibraryIcon library={library} />
            <span>
              <span style={{ fontWeight: 700 }}>{LIBRARY_LABEL[library]}</span>{" "}
              books
            </span>
            <span style={{ marginLeft: "2px", display: "inline-flex" }}>
              <ChevronDown />
            </span>
          </button>

          {dropdownOpen && (
            <ul
              role="listbox"
              className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden whitespace-nowrap min-w-full"
              style={{ fontFamily: JOST_STACK }}
            >
              {(["saved", "recents"] as const).map((opt) => (
                <li key={opt}>
                  <button
                    type="button"
                    onClick={() => {
                      setLibrary(opt);
                      setDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 active:bg-gray-100"
                    style={{
                      color: "#1E1E1E",
                      fontWeight: library === opt ? 700 : 400,
                    }}
                  >
                    <LibraryIcon library={opt} />
                    {LIBRARY_LABEL[opt]} books
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ul className="grid grid-cols-3 gap-3">
          <li>
            <ScanTile scanHref={scanHref} />
          </li>

          {candidates.map((c) => (
            <li key={c.bookId}>
              <Link
                href={hrefFor(c.bookId)}
                className="block rounded-lg overflow-hidden hover:opacity-90 active:opacity-80 transition-opacity"
              >
                {c.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.coverUrl}
                    alt=""
                    className="w-full aspect-[2/3] object-cover"
                    style={{ borderRadius: "2px" }}
                  />
                ) : (
                  <div
                    className="w-full aspect-[2/3] bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 px-2 text-center"
                    style={{ borderRadius: "2px" }}
                  >
                    {c.title ?? "no cover"}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {candidates.length === 0 && (
          <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {library === "saved" ? (
              <>
                No saved books yet. Save books from{" "}
                <Link href="/lookup" className="underline">
                  Search
                </Link>{" "}
                or scan one above.
              </>
            ) : (
              <>
                No recent books yet. Look up a book from{" "}
                <Link href="/lookup" className="underline">
                  Search
                </Link>{" "}
                or scan one above.
              </>
            )}
          </p>
        )}
      </section>
    </div>
  );
}

function LibraryIcon({ library }: { library: Library }) {
  return library === "saved" ? <SavedIcon /> : <RecentsIcon />;
}

function SavedIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 23 23"
      fill="none"
      aria-hidden="true"
      style={{ color: PILL_ICON_COLOR }}
    >
      <path
        d="M4.66699 18.2002V5.78684C4.66699 4.74141 4.66699 4.2183 4.87045 3.819C5.04941 3.46776 5.33477 3.18241 5.686 3.00344C6.0853 2.79999 6.60841 2.79999 7.65384 2.79999H16.2405C16.7632 2.79999 17.0249 2.79999 17.2246 2.90172C17.4002 2.9912 17.5421 3.13388 17.6316 3.30949C17.7333 3.50914 17.7337 3.7707 17.7337 4.29341V15.3067C17.7337 15.8295 17.7333 16.0905 17.6316 16.2901C17.5421 16.4657 17.4004 16.6089 17.2248 16.6984C17.0253 16.8 16.7639 16.8 16.2422 16.8H6.76699C5.60719 16.8 4.66699 17.7402 4.66699 18.9C4.66699 19.2866 4.98039 19.6 5.36699 19.6H15.3089C15.8306 19.6 16.092 19.6 16.2914 19.4984C16.4671 19.4089 16.6088 19.2658 16.6982 19.0902C16.8 18.8905 16.8003 18.6294 16.8003 18.1067V16.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RecentsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 23 23"
      fill="none"
      aria-hidden="true"
      style={{ color: PILL_ICON_COLOR }}
    >
      <path
        d="M11.1998 6.53332V11.2H15.8665M11.1998 19.6C6.56061 19.6 2.7998 15.8392 2.7998 11.2C2.7998 6.5608 6.56061 2.79999 11.1998 2.79999C15.839 2.79999 19.5998 6.5608 19.5998 11.2C19.5998 15.8392 15.839 19.6 11.1998 19.6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

function ScanTile({ scanHref }: { scanHref: string }) {
  return (
    <Link
      href={scanHref}
      className="block w-full aspect-[2/3] rounded-lg flex flex-col items-center justify-center text-center px-2 transition-opacity hover:opacity-90 active:opacity-80"
      style={{
        backgroundColor: "#ECF1E0",
        borderRadius: "2px",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/mascot.svg"
        alt=""
        className="w-2/3 h-auto mb-2"
        aria-hidden="true"
      />
      <span className="text-xs text-[#1E1E1E] font-medium">
        Scan a new book!
      </span>
    </Link>
  );
}
