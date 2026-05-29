import Link from "next/link";
import { listSaved } from "@/lib/db/saved";
import { listRecents } from "@/lib/db/recents";
import { getBookById, type DbBook } from "@/lib/db/books";
import { ExitButton } from "@/components/ExitButton";
import { BackButton } from "./back-button";
import { PickerGrid, type CompareCandidate } from "./picker-grid";

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

  const [saved, recents] = await Promise.all([listSaved(), listRecents()]);
  const byId = new Map<number, DbBook>();
  for (const entry of saved) byId.set(entry.bookId, entry.book);
  for (const entry of recents) byId.set(entry.bookId, entry.book);

  // Both slots accept any book the user has identified — from saved, recents,
  // a scan, or a global Hardcover search. Fall back to the books table so
  // freshly-upserted books (not yet in saved/recents) still resolve.
  const bookA =
    aId !== null ? (byId.get(aId) ?? (await getBookById(aId))) : null;
  const bookB =
    bId !== null ? (byId.get(bId) ?? (await getBookById(bId))) : null;

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
        className="fixed inset-x-0 z-[60] pointer-events-none"
        style={{ top: "3rem" }}
      >
        <div className="mx-auto w-full max-w-2xl px-6 flex justify-end gap-2">
          <div className="pointer-events-auto">
            <BackButton
              href={bookA?.isbn_13 ? `/lookup?isbn=${bookA.isbn_13}` : "/scan"}
            />
          </div>
          <div className="pointer-events-auto">
            <ExitButton />
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        <header className="mb-8">
          <h1
            style={{
              color: "#1E1E1E",
              fontFamily: "var(--font-livvic), system-ui, sans-serif",
              fontSize: "32px",
              fontStyle: "normal",
              fontWeight: 600,
              lineHeight: "normal",
            }}
          >
            Compare Books
          </h1>
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

        {/* Comparing state: comparison card + focused tags / hint */}
        {state === "comparing" && bookA && bookB && (
          <div className="space-y-4" style={{ marginTop: "32px" }}>
            <ComparisonCard a={bookA} b={bookB} />
            {focus !== null ? (
              <TagPanel book={focus === "a" ? bookA : bookB} />
            ) : (
              <p
                className="text-center"
                style={{
                  fontFamily: "var(--font-jost), system-ui, sans-serif",
                  fontSize: "14px",
                  color: "#7F7F7F",
                }}
              >
                Tap on a book to see it&apos;s genres and themes
              </p>
            )}
          </div>
        )}

        {/* Picker grid (with Scan tile + search bar) */}
        {state !== "comparing" && (
          <PickerGrid
            savedCandidates={toCandidates(saved, validA)}
            recentCandidates={toCandidates(recents, validA)}
            selectedA={validA}
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
              style={{ borderRadius: "2px" }}
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
          className="inline-flex items-center justify-center rounded-full transition-colors bg-[#E9F5DB] hover:bg-[#D9E8CC] active:bg-[#C8D7BB] whitespace-nowrap"
          style={{
            padding: "4.4px 17.6px",
            gap: "8.448px",
            color: "#33A45D",
            textAlign: "center",
            fontFamily: "var(--font-jost), system-ui, sans-serif",
            fontSize: "15.84px",
            fontWeight: 400,
            lineHeight: "21.12px",
            letterSpacing: "0.106px",
          }}
        >
          Change Book
        </Link>
      )}
    </div>
  );
}

function ComparisonCard({ a, b }: { a: DbBook; b: DbBook }) {
  const JOST = "var(--font-jost), system-ui, sans-serif";

  const valueStyle = {
    fontFamily: JOST,
    fontSize: "18px",
    fontWeight: 400,
    color: "#1E1E1E",
  } as const;

  const labelStyle = {
    fontFamily: JOST,
    fontSize: "15px",
    fontWeight: 400,
    color: "#1E1E1E",
  } as const;

  const rows: Array<{
    label: string;
    labelIcon: React.ReactNode;
    valueA: React.ReactNode;
    valueB: React.ReactNode;
  }> = [
    {
      label: "Rating",
      labelIcon: <StarOutlineIcon />,
      valueA: <RatingValue rating={a.rating} />,
      valueB: <RatingValue rating={b.rating} />,
    },
    {
      label: "Readers",
      labelIcon: (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/book-details/save-icon.svg"
          alt=""
          width={22}
          height={22}
          aria-hidden="true"
        />
      ),
      valueA: a.users_count !== null ? a.users_count.toLocaleString() : "—",
      valueB: b.users_count !== null ? b.users_count.toLocaleString() : "—",
    },
    {
      label: "Year",
      labelIcon: (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/book-details/calendar-icon.svg"
          alt=""
          width={20}
          height={20}
          aria-hidden="true"
        />
      ),
      valueA: yearFromDate(a.release_date),
      valueB: yearFromDate(b.release_date),
    },
  ];

  return (
    <section
      style={{
        borderRadius: "20px",
        background: "#FFF",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.10)",
        padding: "32px",
      }}
    >
      {rows.map((row, idx) => (
        <div
          key={row.label}
          className={idx > 0 ? "border-t border-gray-100" : ""}
          style={{
            display: "flex",
            padding: "20px 0",
            justifyContent: "center",
            alignItems: "center",
            gap: "36px",
            alignSelf: "stretch",
          }}
        >
          <span style={valueStyle}>{row.valueA}</span>
          <div className="flex flex-col items-center gap-1.5">
            {row.labelIcon}
            <span style={labelStyle}>{row.label}</span>
          </div>
          <span style={valueStyle}>{row.valueB}</span>
        </div>
      ))}
    </section>
  );
}

function RatingValue({ rating }: { rating: number | null }) {
  if (rating === null) return <>—</>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <StarFilledIcon />
      {rating.toFixed(1)}
    </span>
  );
}

function StarFilledIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="#F5B400"
      aria-hidden="true"
    >
      <path d="M12 2l2.93 6.94L22 9.97l-5.5 4.78L18.18 22 12 18.27 5.82 22 7.5 14.75 2 9.97l7.07-1.03L12 2z" />
    </svg>
  );
}

function StarOutlineIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1E1E1E"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2l2.93 6.94L22 9.97l-5.5 4.78L18.18 22 12 18.27 5.82 22 7.5 14.75 2 9.97l7.07-1.03L12 2z" />
    </svg>
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

function toCandidates(
  entries: Array<{ bookId: number; book: DbBook }>,
  excludeBookId: number | null,
): CompareCandidate[] {
  return entries
    .filter((entry) => entry.bookId !== excludeBookId)
    .map((entry) => ({
      bookId: entry.bookId,
      title: entry.book.title,
      authors: entry.book.authors,
      coverUrl: entry.book.cover_url,
      isbn13: entry.book.isbn_13,
    }));
}

function yearFromDate(d: string | null): string {
  if (!d) return "—";
  const y = d.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : "—";
}
