import Link from "next/link";
import { listSaved } from "@/lib/db/saved";
import { listRecents } from "@/lib/db/recents";
import { getBookById, type DbBook } from "@/lib/db/books";
import { ExitButton } from "@/components/ExitButton";
import { BackButton } from "./back-button";
import { PickerGrid, type CompareCandidate } from "./picker-grid";
import { ComparingView } from "./compare-view";

type SearchParams = Promise<{ a?: string; b?: string }>;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const aId = parseId(params.a);
  const bId = parseId(params.b);

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

        {/* Comparing state: client-driven slots + tags + comparison card,
            with select animations. Picking states keep the static slot row. */}
        {state === "comparing" && bookA && bookB ? (
          <ComparingView
            a={bookA}
            b={bookB}
            changeBHref={`/compare?a=${validA}`}
          />
        ) : (
          <section className="flex justify-center" style={{ gap: "40px" }}>
            {/* Slot A — no Change Book here; book A is set from the lookup
                flow / Compare button, not changed from the compare page. */}
            <SlotCard book={bookA} changeHref={null} placeholder="Select a Book" />
            <SlotCard
              book={bookB}
              changeHref={validA !== null ? `/compare?a=${validA}` : "/compare"}
              placeholder="Select a Book"
            />
          </section>
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

function SlotCard({
  book,
  changeHref,
  placeholder,
}: {
  book: DbBook | null;
  changeHref: string | null;
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

  return (
    <div
      className="flex flex-col items-center"
      style={{ gap: "12px", width: `${COVER_WIDTH}px` }}
    >
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          width: `${COVER_WIDTH}px`,
          height: `${COVER_HEIGHT}px`,
          borderRadius: "2px",
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

