import { Scanner } from "./scanner";

export default function ScanPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Scan a book</h1>
        <p className="text-sm text-gray-600">
          Point your camera at the book&apos;s barcode (or the printed
          ISBN-13) to look it up.
        </p>
      </header>

      <Scanner />
    </main>
  );
}
