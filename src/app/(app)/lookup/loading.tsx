// Instant boundary shown only for the brief server round-trip before the page's
// own Suspense fallbacks take over: BookDetailSkeleton for ?isbn, the search
// results skeleton for ?q (see page.tsx). Because this single file can't read
// searchParams, it can't tell those variants apart — so it stays variant-neutral
// (a header bar + line) rather than flashing a search list at the book-detail flow.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12 space-y-3">
      <div className="h-7 w-32 rounded bg-black/5 animate-pulse" />
      <div className="h-4 w-3/4 rounded bg-black/5 animate-pulse" />
    </main>
  );
}
