import Link from "next/link";
import { listSaved } from "@/lib/db/saved";
import { getBookById, type DbBook } from "@/lib/db/books";

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
    <main className="mx-auto w-full max-w-2xl px-6 py-12 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Compare books</h1>
        <p className="text-sm text-gray-600">
          {state === "picking-a" && "Pick the first book to compare."}
          {state === "picking-b" && "Pick the second book to compare."}
          {state === "comparing" &&
            "Tap a book to see its genres and themes. Use Change Book to swap one side."}
        </p>
      </header>

      {/* Slot row */}
      <section className="grid grid-cols-2 gap-4">
        <SlotCard
          book={bookA}
          isFocused={focus === "a"}
          changeHref={`/compare${bookB ? `?b=${bookB.id}` : ""}`}
          focusHref={
            validA !== null && validB !== null
              ? buildHref({ a: validA, b: validB, focus: focus === "a" ? null : "a" })
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
              ? buildHref({ a: validA, b: validB, focus: focus === "b" ? null : "b" })
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

      {/* Picker grid */}
      {state !== "comparing" && (
        <PickerGrid
          saved={saved}
          excludeBookId={validA}
          buildHref={(bookId) =>
            validA === null
              ? `/compare?a=${bookId}`
              : `/compare?a=${validA}&b=${bookId}`
          }
        />
      )}
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
  changeHref: string;
  focusHref: string | null;
  placeholder: string;
}) {
  if (!book) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 h-56 flex items-center justify-center text-sm text-gray-500 text-center px-4">
        {placeholder}
      </div>
    );
  }

  const Wrapper = focusHref
    ? ({ children }: { children: React.ReactNode }) => (
        <Link href={focusHref} className="block">
          {children}
        </Link>
      )
    : ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

  return (
    <div className="space-y-2">
      <Wrapper>
        <div
          className={[
            "rounded-lg overflow-hidden border-2 transition-colors",
            isFocused
              ? "border-emerald-500 ring-2 ring-emerald-200"
              : "border-gray-200",
          ].join(" ")}
        >
          {book.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.cover_url}
              alt=""
              className="w-full h-44 object-cover"
            />
          ) : (
            <div className="w-full h-44 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
              no cover
            </div>
          )}
        </div>
        <div className="px-1">
          <p className="text-sm font-semibold leading-tight line-clamp-2">
            {book.title ?? "Untitled"}
          </p>
          {book.authors.length > 0 && (
            <p className="text-xs text-gray-600 truncate">
              {book.authors.join(", ")}
            </p>
          )}
        </div>
      </Wrapper>
      <Link
        href={changeHref}
        className="inline-block rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-medium hover:bg-emerald-200"
      >
        Change Book
      </Link>
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
}: {
  saved: Awaited<ReturnType<typeof listSaved>>;
  excludeBookId: number | null;
  buildHref: (bookId: number) => string;
}) {
  const candidates = saved.filter((entry) => entry.bookId !== excludeBookId);

  if (saved.length === 0) {
    return (
      <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
        No saved books yet. Save at least two books from{" "}
        <Link href="/lookup" className="underline">
          /lookup
        </Link>{" "}
        first, then come back here to compare.
      </p>
    );
  }

  if (candidates.length === 0) {
    return (
      <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
        You only have one saved book. Save at least one more to enable
        comparison.
      </p>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-medium text-gray-700 mb-3">From your saved</h2>
      <ul className="grid grid-cols-3 gap-3">
        {candidates.map((entry) => {
          const { book } = entry;
          return (
            <li key={entry.bookId}>
              <Link
                href={buildHref(entry.bookId)}
                className="block rounded-lg border border-gray-200 overflow-hidden hover:border-gray-400 transition-colors"
              >
                {book.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.cover_url}
                    alt=""
                    className="w-full aspect-[2/3] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 px-2 text-center">
                    {book.title ?? "no cover"}
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs font-medium leading-tight line-clamp-2">
                    {book.title ?? "Untitled"}
                  </p>
                  {book.authors.length > 0 && (
                    <p className="text-[10px] text-gray-600 truncate mt-0.5">
                      {book.authors.join(", ")}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function yearFromDate(d: string | null): string {
  if (!d) return "—";
  const y = d.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : "—";
}
