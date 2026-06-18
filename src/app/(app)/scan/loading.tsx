const JOST_STACK = "var(--font-jost), system-ui, sans-serif";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-md px-6 pt-8 pb-4 space-y-8">
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

      {/* Camera viewfinder placeholder */}
      <div className="w-full aspect-[3/4] rounded-2xl bg-black/5 animate-pulse" />
    </main>
  );
}
