import { redirect } from "next/navigation";
import { isValidIsbn13, normalizeIsbn13 } from "@/lib/isbn";
import { lookupBookByIsbn, type HardcoverBook } from "@/lib/hardcover";

type SearchParams = Promise<{ isbn?: string }>;

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
  const normalized = submitted ? normalizeIsbn13(submitted) : "";

  let state:
    | { kind: "idle" }
    | { kind: "invalid"; input: string }
    | { kind: "not-found"; isbn: string }
    | { kind: "error"; message: string }
    | { kind: "ok"; book: HardcoverBook } = { kind: "idle" };

  if (submitted) {
    if (!isValidIsbn13(normalized)) {
      state = { kind: "invalid", input: submitted };
    } else {
      const result = await lookupBookByIsbn(normalized);
      if (!result.ok) {
        state =
          result.reason === "not-found"
            ? { kind: "not-found", isbn: normalized }
            : { kind: "error", message: result.message ?? "Unknown API error" };
      } else {
        state = { kind: "ok", book: result.book };
      }
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold mb-1">ISBN lookup</h1>
        <p className="text-sm text-gray-600">
          Dev tool — replace with camera/OCR scan once FR-01–03 land.
        </p>
      </header>

      <form action={lookupAction} className="flex gap-2">
        <input
          name="isbn"
          type="text"
          required
          defaultValue={submitted}
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

      {state.kind === "invalid" && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <strong>{state.input}</strong> is not a valid ISBN-13 (must be 13
          digits with a valid checksum).
        </p>
      )}

      {state.kind === "not-found" && (
        <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
          No edition found for ISBN <strong>{state.isbn}</strong> in Hardcover.
        </p>
      )}

      {state.kind === "error" && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </p>
      )}

      {state.kind === "ok" && <BookCard book={state.book} />}
    </main>
  );
}

function BookCard({ book }: { book: HardcoverBook }) {
  return (
    <article className="rounded-lg border border-gray-200 p-5 flex gap-5">
      {book.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverUrl}
          alt=""
          className="w-28 h-auto rounded shadow-sm flex-shrink-0"
        />
      ) : (
        <div className="w-28 h-40 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
          no cover
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <h2 className="text-lg font-semibold leading-tight">
            {book.title ?? "Untitled"}
          </h2>
          {book.subtitle && (
            <p className="text-sm text-gray-600">{book.subtitle}</p>
          )}
        </div>

        {book.authors.length > 0 && (
          <p className="text-sm">
            <span className="text-gray-500">by </span>
            {book.authors.join(", ")}
          </p>
        )}

        <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-gray-700">
          {book.rating !== null && (
            <>
              <dt className="text-gray-500">Rating</dt>
              <dd>
                {book.rating.toFixed(2)} / 5
                {book.usersCount !== null && (
                  <span className="text-gray-500">
                    {" "}
                    ({book.usersCount.toLocaleString()} users)
                  </span>
                )}
              </dd>
            </>
          )}
          {book.releaseDate && (
            <>
              <dt className="text-gray-500">Released</dt>
              <dd>{book.releaseDate}</dd>
            </>
          )}
          {book.publisher && (
            <>
              <dt className="text-gray-500">Publisher</dt>
              <dd>{book.publisher}</dd>
            </>
          )}
          {book.pages !== null && (
            <>
              <dt className="text-gray-500">Pages</dt>
              <dd>{book.pages}</dd>
            </>
          )}
          <dt className="text-gray-500">ISBN-13</dt>
          <dd className="font-mono text-xs">{book.isbn13}</dd>
        </dl>

        {book.description && (
          <p className="text-sm text-gray-700 leading-relaxed pt-2 border-t border-gray-100 mt-3">
            {book.description}
          </p>
        )}
      </div>
    </article>
  );
}
