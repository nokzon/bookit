import { redirect } from "next/navigation";
import Link from "next/link";
import { isValidIsbn13, normalizeIsbn13 } from "@/lib/isbn";
import {
  lookupBookByIsbn,
  type HardcoverBook,
  type HardcoverReview,
} from "@/lib/hardcover";
import { upsertBook } from "@/lib/db/books";
import { recordRecent } from "@/lib/db/recents";
import { isSaved } from "@/lib/db/saved";
import { SaveButton } from "./save-button";
import { SummaryText } from "./summary-text";

type SearchParams = Promise<{ isbn?: string }>;

const PAGE_BG = "#F9FDF8";
const BUTTON_BG = "#F5F5F5";
const JOST_STACK = "var(--font-jost), system-ui, sans-serif";
const LIVVIC_STACK = "var(--font-livvic), system-ui, sans-serif";
const SF_PRO_STACK =
  '-apple-system, BlinkMacSystemFont, "SF Pro", "SF Pro Text", system-ui, sans-serif';

const TAG_TEXT_STYLE = {
  textAlign: "center" as const,
  fontFamily: JOST_STACK,
  fontSize: "15.84px",
  fontWeight: 400,
  lineHeight: "21.12px",
  letterSpacing: "0.106px",
};

const TAG_LAYOUT_CLASS =
  "inline-flex items-center justify-center rounded-full";
const TAG_PADDING = { padding: "4.4px 17.6px", gap: "8.448px" };

const SECTION_HEADING_STYLE = {
  overflow: "hidden" as const,
  color: "#000",
  textOverflow: "ellipsis" as const,
  fontFamily: LIVVIC_STACK,
  fontSize: "20px",
  fontWeight: 500,
  lineHeight: "normal",
};

async function lookupAction(formData: FormData) {
  "use server";
  const raw = String(formData.get("isbn") ?? "");
  redirect(`/lookup?isbn=${encodeURIComponent(raw)}`);
}

export default async function LookupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { isbn: rawInput } = await searchParams;
  const submitted = rawInput?.trim() ?? "";

  // No ISBN in URL → render the Search tab landing (manual paste form).
  if (!submitted) {
    return <SearchForm />;
  }

  const normalized = normalizeIsbn13(submitted);

  if (!isValidIsbn13(normalized)) {
    return (
      <FullscreenShell>
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <strong>{submitted}</strong> is not a valid ISBN-13 (must be 13 digits
          with a valid checksum).
        </p>
        <p className="text-sm">
          <Link href="/lookup" className="underline text-gray-700">
            Try another ISBN
          </Link>
        </p>
      </FullscreenShell>
    );
  }

  const result = await lookupBookByIsbn(normalized);
  if (!result.ok) {
    if (result.reason === "not-found") {
      return (
        <FullscreenShell>
          <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
            No edition found for ISBN <strong>{normalized}</strong> in Hardcover.
          </p>
          <p className="text-sm">
            <Link href="/lookup" className="underline text-gray-700">
              Try another ISBN
            </Link>
          </p>
        </FullscreenShell>
      );
    }
    return (
      <FullscreenShell>
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {result.message ?? "Unknown API error"}
        </p>
      </FullscreenShell>
    );
  }

  const bookId = await upsertBook(result.book);
  await recordRecent(bookId);
  const saved = await isSaved(bookId);

  return <BookDetail book={result.book} bookId={bookId} saved={saved} />;
}

function SearchForm() {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Search by ISBN</h1>
        <p className="text-sm text-gray-600">
          Type or paste a 13-digit ISBN to look up a book. (Or tap{" "}
          <Link href="/scan" className="underline">
            Bookit
          </Link>{" "}
          to scan instead.)
        </p>
      </header>

      <form action={lookupAction} className="flex gap-2">
        <input
          name="isbn"
          type="text"
          required
          inputMode="numeric"
          autoComplete="off"
          placeholder="978-3-16-148410-0"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-base"
        />
        <button
          type="submit"
          className="rounded-md bg-[#333] hover:bg-[#4a4a4a] active:bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          Look up
        </button>
      </form>
    </main>
  );
}

/**
 * Fullscreen overlay used for the book detail view and its error states.
 * The main is fixed inset-0 z-50 so the (app) layout's sticky header + bottom
 * nav are visually hidden behind it. The Save/Exit buttons live in a SEPARATE
 * fixed container at z-60 so they float over the scrolling content (rather
 * than sitting in a full-width sticky bar).
 */
function FullscreenShell({
  children,
  actionRow,
}: {
  children: React.ReactNode;
  actionRow?: React.ReactNode;
}) {
  return (
    <>
      <div
        className="fixed right-3 z-[60] flex gap-2"
        style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        {actionRow ?? <ExitButton />}
      </div>
      <main
        className="fixed inset-0 z-50 overflow-y-auto overscroll-contain"
        style={{ backgroundColor: PAGE_BG }}
      >
        <div
          className="px-6 pb-12 space-y-8"
          style={{
            paddingTop: "calc(60px + env(safe-area-inset-top))",
          }}
        >
          {children}
        </div>
      </main>
    </>
  );
}

function ExitButton() {
  return (
    <Link
      href="/scan"
      aria-label="Close"
      className="w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-sm transition-opacity hover:opacity-80 active:opacity-60"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/book-details/exit-icon.svg" alt="" width={20} height={20} />
    </Link>
  );
}

function BookDetail({
  book,
  bookId,
  saved,
}: {
  book: HardcoverBook;
  bookId: number;
  saved: boolean;
}) {
  return (
    <FullscreenShell
      actionRow={
        <>
          <SaveButton bookId={bookId} isbn={book.isbn13} initialSaved={saved} />
          <ExitButton />
        </>
      }
    >
      {/* Header row: cover + meta */}
      <section className="flex gap-5">
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverUrl}
            alt=""
            className="flex-shrink-0"
            style={{
              width: "120px",
              height: "182px",
              aspectRatio: "60/91",
              borderRadius: "2px",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            className="flex-shrink-0 bg-gray-100 flex items-center justify-center text-[10px] text-gray-400"
            style={{ width: "120px", height: "182px", borderRadius: "2px" }}
          >
            no cover
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-[10px]">
          <h1
            style={{
              overflow: "hidden",
              color: "#000",
              textOverflow: "ellipsis",
              fontFamily: JOST_STACK,
              fontSize: "24px",
              fontWeight: 500,
              lineHeight: "normal",
            }}
          >
            {book.title ?? "Untitled"}
          </h1>
          {book.authors.length > 0 && (
            <p
              className="text-gray-500"
              style={{ fontFamily: JOST_STACK }}
            >
              {book.authors.join(", ")}
            </p>
          )}
          {(book.rating !== null || book.usersCount !== null) && (
            <p
              className="text-sm flex items-center gap-1.5 text-gray-700 pt-1"
              style={{ fontFamily: JOST_STACK }}
            >
              {book.rating !== null && (
                <span className="inline-flex items-center gap-1 font-semibold text-black">
                  {book.rating.toFixed(1)}
                  <span aria-hidden="true">★</span>
                </span>
              )}
              {book.usersCount !== null && (
                <span className="text-gray-500">
                  ({book.usersCount.toLocaleString()} reviews)
                </span>
              )}
            </p>
          )}
          {book.pages !== null && (
            <p
              className="text-sm text-gray-700 flex items-center gap-1.5"
              style={{ fontFamily: JOST_STACK }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/book-details/book-icon.svg"
                alt=""
                width={16}
                height={16}
                aria-hidden="true"
              />
              {book.pages} pages
            </p>
          )}
          {book.releaseDate && (
            <p
              className="text-sm text-gray-700 flex items-center gap-1.5"
              style={{ fontFamily: JOST_STACK }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/book-details/calendar-icon.svg"
                alt=""
                width={16}
                height={16}
                aria-hidden="true"
              />
              {formatReleaseDate(book.releaseDate)}
            </p>
          )}
        </div>
      </section>

      {/* Genre */}
      {book.genres.length > 0 && (
        <section className="space-y-2">
          <h2 style={SECTION_HEADING_STYLE}>Genre</h2>
          <ul className="flex flex-wrap gap-2">
            {book.genres.map((g) => (
              <li
                key={g}
                className={TAG_LAYOUT_CLASS}
                style={{
                  ...TAG_PADDING,
                  ...TAG_TEXT_STYLE,
                  backgroundColor: "#DDE7CE",
                  color: "#4A6B3A",
                }}
              >
                {g}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Themes */}
      {book.themes.length > 0 && (
        <section className="space-y-2">
          <h2 style={SECTION_HEADING_STYLE}>Themes</h2>
          <ul className="flex flex-wrap gap-2">
            {book.themes.map((t) => (
              <li
                key={t}
                className={TAG_LAYOUT_CLASS}
                style={{
                  ...TAG_PADDING,
                  ...TAG_TEXT_STYLE,
                  backgroundColor: "#DBEAFE",
                  color: "#1E3A8A",
                }}
              >
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Summary */}
      {book.description && (
        <section className="space-y-2">
          <h2 style={SECTION_HEADING_STYLE}>Summary</h2>
          <SummaryText text={book.description} />
        </section>
      )}

      {/* Compare CTA */}
      <Link
        href={`/compare?a=${bookId}`}
        className="flex items-center justify-center self-stretch transition-opacity hover:opacity-90 active:opacity-80"
        style={{
          padding: "14px 20px",
          gap: "4px",
          borderRadius: "12px",
          backgroundColor: "#E9F5DB",
          color: "#33A45D",
          fontFamily: SF_PRO_STACK,
          fontSize: "17px",
          fontWeight: 400,
          lineHeight: "22px",
          letterSpacing: "-0.43px",
          fontFeatureSettings: '"liga" off, "clig" off',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/book-details/compare-icon.svg"
          alt=""
          width={20}
          height={16}
          aria-hidden="true"
        />
        Compare
      </Link>

      {/* Popular Reviews from Hardcover */}
      {book.reviews.length > 0 && (
        <section className="space-y-3">
          <h2 style={SECTION_HEADING_STYLE}>Popular Reviews</h2>
          {book.slug && (
            <a
              href={`https://hardcover.app/books/${book.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center transition-opacity hover:opacity-80 active:opacity-60"
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
              <span>View in</span>
              <span
                className="inline-flex items-center"
                style={{ gap: "4px" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/book-details/hardcover-logo.png"
                  alt=""
                  width={18}
                  height={22}
                  aria-hidden="true"
                />
                <span style={{ fontWeight: 700 }}>Hardcover</span>
              </span>
            </a>
          )}
          <ul className="space-y-3">
            {book.reviews.map((r, i) => (
              <li key={i}>
                <ReviewCard review={r} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </FullscreenShell>
  );
}

function ReviewCard({ review }: { review: HardcoverReview }) {
  return (
    <article
      className="rounded-2xl bg-white p-4 space-y-2"
      style={{ fontFamily: JOST_STACK }}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {review.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={review.avatarUrl}
              alt=""
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
              {review.username.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="font-semibold text-sm text-[#1E1E1E] truncate">
            {review.username}
          </span>
        </div>
        <StarRating rating={review.rating} />
      </header>
      <p
        className="text-gray-700 line-clamp-3 whitespace-pre-line"
        style={{
          fontFamily: JOST_STACK,
          fontSize: "16px",
          fontWeight: 400,
          lineHeight: "normal",
        }}
      >
        {review.text}
      </p>
    </article>
  );
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return null;
  const full = Math.round(rating);
  return (
    <div className="flex flex-shrink-0 text-base" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          aria-hidden="true"
          className={n <= full ? "text-amber-400" : "text-gray-300"}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function formatReleaseDate(d: string): string {
  const parts = d.split("-");
  if (parts.length < 2) return d;
  const year = parts[0];
  const monthIdx = Number(parts[1]) - 1;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  if (monthIdx < 0 || monthIdx > 11) return d;
  return `${months[monthIdx]} ${year}`;
}
