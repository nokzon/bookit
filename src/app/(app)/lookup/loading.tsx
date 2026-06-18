// Shown while the Lookup segment resolves. Covers both the search landing and
// the ?q / ?isbn variants (which hit the Hardcover API and are the laggy ones),
// so this stays neutral: search header + input, then a few result placeholders.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Search</h1>
        <div className="h-4 w-3/4 rounded bg-black/5 animate-pulse" />
      </header>

      <div className="flex gap-2">
        <div className="h-10 flex-1 rounded-md bg-black/5 animate-pulse" />
        <div className="h-10 w-20 rounded-md bg-black/10 animate-pulse" />
      </div>

      <ul className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="rounded-lg border border-gray-200 p-4 flex gap-4"
          >
            <div className="w-16 h-24 rounded bg-black/5 animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2 pt-1">
              <div className="h-4 w-4/5 rounded bg-black/5 animate-pulse" />
              <div className="h-3 w-2/5 rounded bg-black/5 animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-black/5 animate-pulse" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
