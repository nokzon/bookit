import { Scanner } from "./scanner";

export default function ScanPage() {
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
      <Scanner />
    </main>
  );
}
