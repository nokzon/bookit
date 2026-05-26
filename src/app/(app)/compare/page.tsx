import Link from "next/link";
import { listSaved } from "@/lib/db/saved";
import { getBookById, type DbBook } from "@/lib/db/books";
import { BackButton } from "./back-button";

type SearchParams = Promise<{ a?: string; b?: string; focus?: string }>;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const aId = parseId(params.a);
  const bId = parseId(params.b);
  const focus = params.focus === "a" || params.focus === "b" ? params.focus : null;

  const saved = await listSaved();
  const byId = new Map<number, DbBook>();
  for (const entry of saved) byId.set(entry.bookId, entry.book);

  // Book A can be any book the user has identified (saved or just looked up).
  // Book B is always picked from the user's saved list.
  const bookA =
    aId !== null ? (byId.get(aId) ?? (await getBookById(aId))) : null;
  const bookB = bId !== null ? (byId.get(bId) ?? null) : null;

  // Drop selections that aren't actually in saved (e.g. unsaved since URL was set)
  const validA = bookA ? aId : null;
  const validB = bookB ? bId : null;

  const state =
    validA !== null && validB !== null
      ? "comparing"
      : validA !== null
        ? "picking-b"
        : "picking-a";

  return (
    <main
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain"
      style={{ backgroundColor: "#F9FDF8" }}
    >
      <div
        className="mx-auto w-full max-w-2xl px-6 pb-12 space-y-8"
        style={{ paddingTop: "calc(60px + env(safe-area-inset-top))" }}
      >
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold leading-tight">Compare Books</h1>
          <BackButton />
        </header>

        {/* Slot row — centered, 40px gap between slots */}
        <section className="flex justify-center" style={{ gap: "40px" }}>
          {/* Slot A — no Change Book here; book A is set from the lookup
              flow / Compare button, not changed from the compare page. */}
          <SlotCard
            book={bookA}
            isFocused={focus === "a"}
            changeHref={null}
            focusHref={
              validA !== null && validB !== null
                ? buildHref({
                    a: validA,
                    b: validB,
                    focus: focus === "a" ? null : "a",
                  })
                : null
            }
            placeholder="Select a Book"
          />
          <SlotCard
            book={bookB}
            isFocused={focus === "b"}
            changeHref={validA !== null ? `/compare?a=${validA}` : "/compare"}
            focusHref={
              validA !== null && validB !== null
                ? buildHref({
                    a: validA,
                    b: validB,
                    focus: focus === "b" ? null : "b",
                  })
                : null
            }
            placeholder="Select a Book"
          />
        </section>

        {/* Focused book's genres + themes (only when comparing AND focus is set) */}
        {state === "comparing" && focus !== null && (
          <TagPanel book={focus === "a" ? bookA! : bookB!} />
        )}

        {/* Comparison card */}
        {state === "comparing" && bookA && bookB && (
          <ComparisonCard a={bookA} b={bookB} />
        )}

        {/* Picker grid (with Scan tile + search bar) */}
        {state !== "comparing" && (
          <PickerGrid
            saved={saved}
            excludeBookId={validA}
            buildHref={(bookId) =>
              validA === null
                ? `/compare?a=${bookId}`
                : `/compare?a=${validA}&b=${bookId}`
            }
            scanHref={
              validA !== null
                ? `/scan?compareWith=${validA}`
                : `/scan?compareWith=`
            }
          />
        )}
      </div>
    </main>
  );
}

function parseId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function buildHref({
  a,
  b,
  focus,
}: {
  a: number;
  b: number;
  focus: "a" | "b" | null;
}): string {
  const params = new URLSearchParams({ a: String(a), b: String(b) });
  if (focus) params.set("focus", focus);
  return `/compare?${params.toString()}`;
}

function SlotCard({
  book,
  isFocused,
  changeHref,
  focusHref,
  placeholder,
}: {
  book: DbBook | null;
  isFocused: boolean;
  changeHref: string | null;
  focusHref: string | null;
  placeholder: string;
}) {
  const JOST = "var(--font-jost), system-ui, sans-serif";
  const COVER_WIDTH = 120; // 182 * 60/91 ≈ 120
  const COVER_HEIGHT = 182;

  const titleStyle = {
    overflow: "hidden" as const,
    color: "#000",
    textOverflow: "ellipsis" as const,
    fontFamily: JOST,
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: "normal" as const,
    maxWidth: "100%",
    whiteSpace: "nowrap" as const,
    textAlign: "center" as const,
  };

  const authorStyle = {
    color: "rgba(127, 127, 127, 0.50)",
    fontFamily: JOST,
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: "normal" as const,
    textAlign: "center" as const,
    maxWidth: "100%",
    // Note: no whiteSpace/overflow so it wraps onto multiple lines.
  };

  // Empty placeholder slot — dashed outline with "Select a Book" centered inside.
  if (!book) {
    return (
      <div
        className="flex items-center justify-center text-center px-3"
        style={{
          width: `${COVER_WIDTH}px`,
          height: `${COVER_HEIGHT}px`,
          borderRadius: "2px",
          border: "2px dashed #D1D5DB",
        }}
      >
        <span style={authorStyle}>{placeholder}</span>
      </div>
    );
  }

  const Wrapper = focusHref
    ? ({ children }: { children: React.ReactNode }) => (
        <Link href={focusHref}>{children}</Link>
      )
    : ({ children }: { children: React.ReactNode }) => <>{children}</>;

  return (
    <div
      className="flex flex-col items-center"
      style={{ gap: "12px", width: `${COVER_WIDTH}px` }}
    >
      <Wrapper>
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{
            width: `${COVER_WIDTH}px`,
            height: `${COVER_HEIGHT}px`,
            borderRadius: "2px",
            ...(isFocused
              ? {
                  outline: "2px solid #33A45D",
                  outlineOffset: "2px",
                }
              : {}),
          }}
        >
          {book.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.cover_url}
              alt=""
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
              no cover
            </div>
          )}
        </div>
      </Wrapper>

      {/* Title + author: 4px gap between them */}
      <div
        className="flex flex-col items-center"
        style={{ gap: "4px", maxWidth: "100%" }}
      >
        <p style={titleStyle}>{book.title ?? "Untitled"}</p>
        {book.authors.length > 0 && (
          <p style={authorStyle}>{book.authors.join(", ")}</p>
        )}
      </div>

      {changeHref && (
        <Link
          href={changeHref}
          className="inline-block rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-medium hover:bg-emerald-200"
        >
          Change Book
        </Link>
      )}
    </div>
  );
}

function ComparisonCard({ a, b }: { a: DbBook; b: DbBook }) {
  const rows: Array<{ label: string; valueA: string; valueB: string }> = [
    {
      label: "Rating",
      valueA: a.rating !== null ? `★ ${a.rating.toFixed(1)}` : "—",
      valueB: b.rating !== null ? `★ ${b.rating.toFixed(1)}` : "—",
    },
    {
      label: "Readers",
      valueA: a.users_count !== null ? a.users_count.toLocaleString() : "—",
      valueB: b.users_count !== null ? b.users_count.toLocaleString() : "—",
    },
    {
      label: "Year",
      valueA: yearFromDate(a.release_date),
      valueB: yearFromDate(b.release_date),
    },
  ];

  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <table className="w-full">
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.label} className={idx > 0 ? "border-t border-gray-100" : ""}>
              <td className="w-1/3 py-4 text-center text-base font-medium">
                {row.valueA}
              </td>
              <td className="w-1/3 py-4 text-center text-sm text-gray-600">
                {row.label}
              </td>
              <td className="w-1/3 py-4 text-center text-base font-medium">
                {row.valueB}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function TagPanel({ book }: { book: DbBook }) {
  const hasAny = book.genres.length > 0 || book.themes.length > 0;

  if (!hasAny) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
        <p className="text-sm font-semibold">
          {book.title ?? "This book"}
        </p>
        <p className="text-sm text-gray-600">
          No genres or themes cached yet.{" "}
          <Link
            href={`/lookup?isbn=${book.isbn_13}`}
            className="underline"
          >
            Re-look up this book
          </Link>{" "}
          to refresh.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
      <p className="text-sm font-semibold">{book.title ?? "Untitled"}</p>
      {book.genres.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Genres</h3>
          <ul className="flex flex-wrap gap-2">
            {book.genres.map((g) => (
              <li
                key={g}
                className="rounded-full bg-emerald-50 text-emerald-800 px-3 py-1 text-xs"
              >
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}
      {book.themes.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Themes</h3>
          <ul className="flex flex-wrap gap-2">
            {book.themes.map((t) => (
              <li
                key={t}
                className="rounded-full bg-sky-50 text-sky-800 px-3 py-1 text-xs"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PickerGrid({
  saved,
  excludeBookId,
  buildHref,
  scanHref,
}: {
  saved: Awaited<ReturnType<typeof listSaved>>;
  excludeBookId: number | null;
  buildHref: (bookId: number) => string;
  scanHref: string;
}) {
  const candidates = saved.filter((entry) => entry.bookId !== excludeBookId);

  return (
    <div className="space-y-4">
      {/* Search bar — visual for now (filtering can be added later) */}
      <div className="relative">
        <svg
          aria-hidden="true"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
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
          placeholder="Search"
          aria-label="Search saved books"
          className="w-full rounded-full bg-white border border-gray-200 pl-11 pr-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 shadow-sm"
        />
      </div>

      <ul className="grid grid-cols-3 gap-3">
        {/* Scan tile (always first) */}
        <li>
          <ScanTile scanHref={scanHref} />
        </li>

        {/* Saved books */}
        {candidates.map((entry) => {
          const { book } = entry;
          return (
            <li key={entry.bookId}>
              <Link
                href={buildHref(entry.bookId)}
                className="block rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
              >
                {book.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.cover_url}
                    alt=""
                    className="w-full aspect-[2/3] object-cover"
                    style={{
                      borderRadius: "2px",
                    }}
                  />
                ) : (
                  <div
                    className="w-full aspect-[2/3] bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 px-2 text-center"
                    style={{ borderRadius: "2px" }}
                  >
                    {book.title ?? "no cover"}
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {saved.length === 0 && (
        <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
          No saved books yet. Save books from{" "}
          <Link href="/lookup" className="underline">
            Search
          </Link>{" "}
          or scan one above.
        </p>
      )}
    </div>
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

function yearFromDate(d: string | null): string {
  if (!d) return "—";
  const y = d.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : "—";
}
