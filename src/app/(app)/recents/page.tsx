import Link from "next/link";
import { listRecents } from "@/lib/db/recents";
import { BookGrid } from "@/components/BookGrid";
import { LibraryPageShell } from "@/components/LibraryPageShell";

export default async function RecentsPage() {
  const entries = await listRecents();

  return (
    <LibraryPageShell title="Recent Books">
      {entries.length === 0 ? (
        <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
          No recent books yet.{" "}
          <Link href="/lookup" className="underline">
            Look something up
          </Link>{" "}
          to see it here.
        </p>
      ) : (
        <BookGrid
          entries={entries.map((e) => ({
            bookId: e.bookId,
            book: e.book,
            timestamp: e.lookedUpAt,
          }))}
        />
      )}
    </LibraryPageShell>
  );
}
