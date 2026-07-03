import Link from "next/link";
import { listRecents } from "@/lib/db/recents";
import { BookGrid } from "@/components/BookGrid";

// Light fade applied over the bottom of the page, behind the nav bar.
const BOTTOM_FADE =
  "linear-gradient(180deg, rgba(248, 250, 253, 0.02) 0%, rgba(248, 250, 253, 0.20) 35.1%, #F8FAFD 75.48%)";

export default async function RecentsPage() {
  const entries = await listRecents();

  return (
    <>
      <div className="mx-auto w-full max-w-xl px-6 py-8 space-y-6">
        <h1
          style={{
            color: "#000",
            fontFamily: "var(--font-livvic), system-ui, sans-serif",
            fontSize: "32px",
            fontWeight: 600,
            lineHeight: "normal",
          }}
        >
          Recent Books
        </h1>

        {entries.length === 0 ? (
          <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
            No recent books yet.{" "}
            <Link href="/lookup" className="underline">
              Look something up
            </Link>{" "}
            to see it here.
          </p>
        ) : (
          <BookGrid entries={entries} getTimestamp={(e) => e.lookedUpAt} />
        )}
      </div>

      {/* Light fade-out at the bottom of the page (sits behind the nav). */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-40"
        style={{ background: BOTTOM_FADE }}
      />
    </>
  );
}
