// Placeholder shown during navigation to the Saved / Recents grids while their
// server components fetch from Supabase. Mirrors the real page layout (title,
// sort pill, 2-col cover grid) so the swap-in doesn't shift the page.

const LIVVIC_STACK = "var(--font-livvic), system-ui, sans-serif";

export function BookGridSkeleton({
  title,
  count = 6,
}: {
  title: string;
  count?: number;
}) {
  return (
    <div className="mx-auto w-full max-w-xl px-6 py-8 space-y-6">
      <h1
        style={{
          color: "#000",
          fontFamily: LIVVIC_STACK,
          fontSize: "32px",
          fontWeight: 600,
          lineHeight: "normal",
        }}
      >
        {title}
      </h1>

      <div className="space-y-6">
        {/* Sort pill placeholder */}
        <div className="h-8 w-36 rounded-full bg-black/5 animate-pulse" />

        <ul className="grid grid-cols-2 gap-x-5 gap-y-7">
          {Array.from({ length: count }).map((_, i) => (
            <li key={i}>
              <div className="w-full aspect-[2/3] rounded-md bg-black/5 animate-pulse" />
              <div className="mt-3 h-4 w-3/4 rounded bg-black/5 animate-pulse" />
              <div className="mt-2 h-3 w-1/2 rounded bg-black/5 animate-pulse" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
