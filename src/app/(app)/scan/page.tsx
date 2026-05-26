import { Scanner } from "./scanner";

type SearchParams = Promise<{ compareWith?: string }>;

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
  const compareWithId = compareWith && compareWith.length > 0 ? compareWith : null;

  return (
    <main className="mx-auto w-full max-w-md px-6 pt-8 pb-4 space-y-8">
      <p
        className="text-center"
        style={{
          fontFamily: "var(--font-jost), system-ui, sans-serif",
          fontSize: "17px",
          fontWeight: 400,
          color: "#718355",
          lineHeight: "normal",
        }}
      >
        Position the book&apos;s ISBN number in the frame
      </p>
      <Scanner compareMode={compareMode} compareWithId={compareWithId} />
    </main>
  );
}
