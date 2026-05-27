import Link from "next/link";
import { Scanner } from "./scanner";

type SearchParams = Promise<{ compareWith?: string }>;

const PAGE_BG = "#F9FDF8";
const JOST_STACK = "var(--font-jost), system-ui, sans-serif";

export default async function ScanPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { compareWith } = await searchParams;
  // The param is set (even to "") when the user arrived via the Compare flow.
  // Distinguish "in compare mode" (param present) from "not in compare mode"
  // (param absent) by checking for undefined.
  const compareMode = compareWith !== undefined;
  const compareWithId =
    compareWith && compareWith.length > 0 ? compareWith : null;

  if (compareMode) {
    return (
      <CompareScanShell compareWithId={compareWithId}>
        <Scanner compareMode={true} compareWithId={compareWithId} />
      </CompareScanShell>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-6 pt-8 pb-4 space-y-8">
      <ScanPrompt />
      <Scanner compareMode={false} compareWithId={null} />
    </main>
  );
}

function ScanPrompt() {
  return (
    <p
      className="text-center"
      style={{
        fontFamily: JOST_STACK,
        fontSize: "17px",
        fontWeight: 400,
        color: "#718355",
        lineHeight: "normal",
      }}
    >
      Position the book&apos;s ISBN number in the frame
    </p>
  );
}

/**
 * Fullscreen scan overlay used when the user enters scan from the Compare
 * flow. Sits at z-50 (above the layout's BottomNav) and adds a "Return to
 * compare page" pill at the bottom in place of the nav.
 */
function CompareScanShell({
  compareWithId,
  children,
}: {
  compareWithId: string | null;
  children: React.ReactNode;
}) {
  const returnHref =
    compareWithId !== null ? `/compare?a=${compareWithId}` : "/compare";

  return (
    <main
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain"
      style={{ backgroundColor: PAGE_BG }}
    >
      <div
        className="mx-auto w-full max-w-md px-6 space-y-8"
        style={{
          paddingTop: "calc(48px + env(safe-area-inset-top))",
          paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
        }}
      >
        <ScanPrompt />
        {children}
        <Link
          href={returnHref}
          className="block w-full rounded-full text-center transition-colors hover:bg-[#4a4a4a] active:bg-[#1a1a1a]"
          style={{
            backgroundColor: "#333",
            color: "#FFF",
            padding: "14px 20px",
            fontFamily: JOST_STACK,
            fontSize: "15px",
            fontWeight: 500,
          }}
        >
          Return to compare page
        </Link>
      </div>
    </main>
  );
}
