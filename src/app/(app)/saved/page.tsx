import { listSaved } from "@/lib/db/saved";
import { BookGrid } from "@/components/BookGrid";
import { LibraryPageShell } from "@/components/LibraryPageShell";

export default async function SavedPage() {
  const entries = await listSaved();

  return (
    <LibraryPageShell title="Saved Books">
      {entries.length === 0 ? (
        <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
          No saved books yet. Look up a book and tap <strong>Save</strong> to
          add it here.
        </p>
      ) : (
        <BookGrid
          entries={entries.map((e) => ({
            bookId: e.bookId,
            book: e.book,
            timestamp: e.savedAt,
          }))}
        />
      )}
    </LibraryPageShell>
  );
}
