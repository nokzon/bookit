import Link from "next/link";
import { listRecents, type RecentEntry } from "@/lib/db/recents";

export default async function RecentsPage() {
  const entries = await listRecents(50);

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Recents</h1>
        <p className="text-sm text-gray-600">
          Books you&apos;ve looked up, most recent first.
        </p>
        <nav className="flex gap-4 text-sm pt-2">
          <Link href="/lookup" className="text-gray-700 underline">
            Lookup
          </Link>
          <Link href="/saved" className="text-gray-700 underline">
            Saved
          </Link>
          <Link href="/" className="text-gray-700 underline">
            Home
          </Link>
        </nav>
      </header>

      {entries.length === 0 ? (
        <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
          No recent lookups yet.{" "}
          <Link href="/lookup" className="underline">
            Look something up
          </Link>{" "}
          to see it here.
        </p>
      ) : (
        <ul className="space-y-4">
          {entries.map((entry) => (
            <RecentRow key={entry.bookId} entry={entry} />
          ))}
        </ul>
      )}
    </main>
  );
}

function RecentRow({ entry }: { entry: RecentEntry }) {
  const { book } = entry;
  return (
    <li className="rounded-lg border border-gray-200 p-4 flex gap-4">
      {book.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.cover_url}
          alt=""
          className="w-16 h-auto rounded shadow-sm flex-shrink-0"
        />
      ) : (
        <div className="w-16 h-24 rounded bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 flex-shrink-0">
          no cover
        </div>
      )}

      <div className="flex-1 min-w-0">
        <Link
          href={`/lookup?isbn=${book.isbn_13}`}
          className="text-base font-semibold leading-tight hover:underline"
        >
          {book.title ?? "Untitled"}
        </Link>
        {book.authors.length > 0 && (
          <p className="text-sm text-gray-600 truncate">
            {book.authors.join(", ")}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Looked up {new Date(entry.lookedUpAt).toLocaleString()}
        </p>
      </div>
    </li>
  );
}
