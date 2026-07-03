"use client";

import { useState } from "react";
import Link from "next/link";
import type { DbBook } from "@/lib/db/books";
import { JOST_STACK as JOST, LIVVIC_STACK as LIVVIC } from "@/lib/fonts";

const COVER_WIDTH = 120; // 182 * 60/91 ≈ 120
const COVER_HEIGHT = 182;

// Tag styling — mirrors the genre/theme tags on the "view book details" page.
const TAG_TEXT_STYLE = {
  textAlign: "center" as const,
  fontFamily: JOST,
  fontSize: "15.84px",
  fontWeight: 400,
  lineHeight: "21.12px",
  letterSpacing: "0.106px",
};
const TAG_LAYOUT_CLASS = "inline-flex items-center justify-center rounded-full";
const TAG_PADDING = { padding: "4.4px 17.6px", gap: "8.448px" };

const SECTION_HEADING_STYLE = {
  color: "#000",
  fontFamily: LIVVIC,
  fontSize: "20px",
  fontWeight: 500,
  lineHeight: "normal" as const,
};

type Focus = "a" | "b" | null;

export function ComparingView({
  a,
  b,
  changeBHref,
}: {
  a: DbBook;
  b: DbBook;
  changeBHref: string;
}) {
  const [focus, setFocus] = useState<Focus>(null);
  const focusedBook = focus === "a" ? a : focus === "b" ? b : null;

  return (
    <div className="space-y-4" style={{ marginTop: "32px" }}>
      {/* Slot row — centered, 40px gap between slots */}
      <section className="flex justify-center" style={{ gap: "40px" }}>
        <SlotCard
          book={a}
          isSelected={focus === "a"}
          dimmed={focus !== null && focus !== "a"}
          onToggle={() => setFocus((f) => (f === "a" ? null : "a"))}
          changeHref={null}
        />
        <SlotCard
          book={b}
          isSelected={focus === "b"}
          dimmed={focus !== null && focus !== "b"}
          onToggle={() => setFocus((f) => (f === "b" ? null : "b"))}
          changeHref={changeBHref}
        />
      </section>

      {/* Selected: tags above the comparison card. Unselected: comparison
          card first, with the hint below it. */}
      {focusedBook && <TagPanel key={focus} book={focusedBook} />}

      <ComparisonCard a={a} b={b} />

      {!focusedBook && (
        <p
          className="text-center"
          style={{
            fontFamily: JOST,
            fontSize: "14px",
            color: "#7F7F7F",
          }}
        >
          Tap on a book to see it&apos;s genres and themes
        </p>
      )}

      <style>{`
        @keyframes panel-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes tick-in {
          from { opacity: 0; transform: scale(0.4); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function SlotCard({
  book,
  isSelected,
  dimmed,
  onToggle,
  changeHref,
}: {
  book: DbBook;
  isSelected: boolean;
  dimmed: boolean;
  onToggle: () => void;
  changeHref: string | null;
}) {
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
  };

  return (
    <div
      className="flex flex-col items-center"
      style={{ gap: "12px", width: `${COVER_WIDTH}px` }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={isSelected}
        className="focus:outline-none"
        style={{
          // Scale the whole cover (+ tick) on select. transform doesn't
          // reflow, so neighbours/text stay put — the 40px gap absorbs it.
          transform: isSelected ? "scale(1.1)" : "scale(1)",
          transformOrigin: "center",
          transition: "transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          position: "relative",
        }}
      >
        <div
          className="relative flex items-center justify-center overflow-hidden"
          style={{
            width: `${COVER_WIDTH}px`,
            height: `${COVER_HEIGHT}px`,
            borderRadius: "2.2px",
          }}
        >
          {book.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.cover_url}
              alt=""
              className="w-full h-full object-contain"
              style={{ borderRadius: "2.2px" }}
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
              no cover
            </div>
          )}
          {/* Grey out the unselected book while the other is selected. */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "2.2px",
              backgroundColor: "rgba(249, 253, 248, 0.6)",
              opacity: dimmed ? 1 : 0,
              transition: "opacity 220ms ease",
              pointerEvents: "none",
            }}
          />
        </div>

        {isSelected && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/compare-books/book-selected.svg"
            alt=""
            width={27}
            height={27}
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "-8px",
              right: "-8px",
              animation: "tick-in 220ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
        )}
      </button>

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
            fontFamily: JOST,
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

function TagPanel({ book }: { book: DbBook }) {
  const hasAny = book.genres.length > 0 || book.themes.length > 0;

  if (!hasAny) {
    return (
      <section
        style={{
          borderRadius: "20px",
          background: "#FFF",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.10)",
          padding: "32px",
          animation: "panel-in 280ms ease-out",
        }}
      >
        <p
          style={{
            fontFamily: JOST,
            fontSize: "14px",
            color: "#7F7F7F",
            textAlign: "center",
          }}
        >
          No genres or themes cached yet for {book.title ?? "this book"}.
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        borderRadius: "20px",
        background: "#FFF",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.10)",
        padding: "32px",
        animation: "panel-in 280ms ease-out",
      }}
    >
      {book.genres.length > 0 && (
        <div className="space-y-3">
          <h3 style={SECTION_HEADING_STYLE}>Genres</h3>
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
        </div>
      )}
      {book.themes.length > 0 && (
        <div className="space-y-3" style={{ marginTop: "24px" }}>
          <h3 style={SECTION_HEADING_STYLE}>Themes</h3>
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
        </div>
      )}
    </section>
  );
}

function ComparisonCard({ a, b }: { a: DbBook; b: DbBook }) {
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

function yearFromDate(d: string | null): string {
  if (!d) return "—";
  const y = d.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : "—";
}
