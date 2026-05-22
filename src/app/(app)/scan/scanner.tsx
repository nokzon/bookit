"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  extractIsbn13,
  isValidIsbn13,
  normalizeIsbn13,
} from "@/lib/isbn";
import type { HardcoverBook } from "@/lib/hardcover";
import { previewBookByIsbn } from "./actions";

type Controls = { stop: () => void };

type ScanState =
  | { kind: "starting" }
  | { kind: "scanning" }
  | { kind: "previewing"; isbn: string }
  | { kind: "identified"; bookId: number; book: HardcoverBook }
  | { kind: "not-found"; isbn: string }
  | { kind: "permission-denied" }
  | { kind: "no-camera" }
  | { kind: "error"; message: string };

// Auto-OCR cadence: balance battery vs detection. First fire downloads
// Tesseract (~3MB WASM) so it's slower; subsequent ones are quick.
const OCR_INTERVAL_MS = 5000;

export function Scanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<Controls | null>(null);
  const ocrTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ocrRunningRef = useRef(false);
  const stateRef = useRef<ScanState>({ kind: "starting" });

  const [state, setState] = useState<ScanState>({ kind: "starting" });

  // Keep a ref so long-lived callbacks (ZXing + OCR loop) can see the latest
  // state without re-binding.
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const isPaused = () => {
    const k = stateRef.current.kind;
    return k === "previewing" || k === "identified" || k === "not-found";
  };

  const handleIsbnDetected = useCallback(async (isbn: string) => {
    if (isPaused()) return;
    setState({ kind: "previewing", isbn });
    try {
      const result = await previewBookByIsbn(isbn);
      if (result.ok) {
        setState({
          kind: "identified",
          bookId: result.bookId,
          book: result.book,
        });
      } else if (result.reason === "not-found") {
        setState({ kind: "not-found", isbn });
      } else {
        setState({
          kind: "error",
          message: result.message ?? "Lookup failed.",
        });
      }
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Lookup failed.",
      });
    }
  }, []);

  const resumeScanning = useCallback(() => {
    setState({ kind: "scanning" });
  }, []);

  const runOcrTick = useCallback(async () => {
    if (ocrRunningRef.current || isPaused()) return;
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    ocrRunningRef.current = true;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);

      const Tesseract = await import("tesseract.js");
      const { data } = await Tesseract.recognize(canvas, "eng");
      if (isPaused()) return;

      const isbn = extractIsbn13(data.text ?? "");
      if (isbn) {
        await handleIsbnDetected(isbn);
      }
    } catch {
      // OCR failures are silent — barcode scanning keeps running and we'll
      // retry on the next tick.
    } finally {
      ocrRunningRef.current = false;
    }
  }, [handleIsbnDetected]);

  // Start ZXing on mount; stop on unmount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled || !videoRef.current) return;

        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result) => {
            if (!result || isPaused()) return;
            const normalized = normalizeIsbn13(result.getText());
            if (isValidIsbn13(normalized)) {
              handleIsbnDetected(normalized);
            }
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
        setState({ kind: "scanning" });
      } catch (err) {
        if (cancelled) return;
        const name = (err as { name?: string })?.name;
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setState({ kind: "permission-denied" });
        } else if (
          name === "NotFoundError" ||
          name === "DevicesNotFoundError"
        ) {
          setState({ kind: "no-camera" });
        } else {
          setState({
            kind: "error",
            message:
              err instanceof Error ? err.message : "Could not start the camera",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      if (ocrTimerRef.current) clearTimeout(ocrTimerRef.current);
      ocrTimerRef.current = null;
    };
  }, [handleIsbnDetected]);

  // Auto-OCR loop. Re-arms itself every OCR_INTERVAL_MS while the component
  // is mounted; runOcrTick itself bails out if paused.
  useEffect(() => {
    const tick = async () => {
      await runOcrTick();
      ocrTimerRef.current = setTimeout(tick, OCR_INTERVAL_MS);
    };
    ocrTimerRef.current = setTimeout(tick, OCR_INTERVAL_MS);
    return () => {
      if (ocrTimerRef.current) clearTimeout(ocrTimerRef.current);
      ocrTimerRef.current = null;
    };
  }, [runOcrTick]);

  // ---- Render ----

  if (state.kind === "permission-denied") {
    return (
      <FallbackCard
        title="Camera permission denied"
        body="Bookit needs camera access to scan ISBNs. Grant permission in your browser settings (look for a camera icon in the address bar), then reload this page."
      />
    );
  }

  if (state.kind === "no-camera") {
    return (
      <FallbackCard
        title="No camera found"
        body="This device doesn't appear to have a camera."
      />
    );
  }

  if (state.kind === "error") {
    return <FallbackCard title="Camera error" body={state.message} />;
  }

  return (
    <div className="relative">
      {/* Camera viewport */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {(state.kind === "scanning" || state.kind === "starting") && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
            {state.kind === "starting"
              ? "Starting camera…"
              : "Scanning for an ISBN…"}
          </div>
        )}
        {state.kind === "previewing" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
            Looking up {state.isbn}…
          </div>
        )}
      </div>

      {/* Bottom-sheet style popups overlaying the camera */}
      {state.kind === "not-found" && (
        <ResultOverlay onDismiss={resumeScanning}>
          <p className="text-base font-semibold text-center">
            ISBN not in Hardcover
          </p>
          <p className="text-sm text-gray-700 text-center">
            We found <span className="font-mono">{state.isbn}</span> but
            couldn&apos;t look it up. Try another book.
          </p>
        </ResultOverlay>
      )}

      {state.kind === "identified" && (
        <IdentifiedPopup
          book={state.book}
          onConfirm={() => router.push(`/lookup?isbn=${state.book.isbn13}`)}
          onDismiss={resumeScanning}
        />
      )}
    </div>
  );
}

function FallbackCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-2">
      <p className="font-semibold text-amber-900">{title}</p>
      <p className="text-sm text-amber-900">{body}</p>
      <p className="text-sm text-amber-900">
        You can also{" "}
        <Link href="/lookup" className="underline">
          type the ISBN manually
        </Link>
        .
      </p>
    </div>
  );
}

function ResultOverlay({
  children,
  onDismiss,
}: {
  children: React.ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl shadow-2xl border-t border-black/5 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4"
      style={{ backgroundColor: "#FCFBF7" }}
    >
      {children}
      <button
        type="button"
        onClick={onDismiss}
        className="w-full rounded-full bg-[#333] hover:bg-[#4a4a4a] active:bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white transition-colors"
      >
        Scan again
      </button>
    </div>
  );
}

function IdentifiedPopup({
  book,
  onConfirm,
  onDismiss,
}: {
  book: HardcoverBook;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl shadow-2xl border-t border-black/5"
      style={{ backgroundColor: "#FCFBF7" }}
    >
      <div className="flex justify-center pt-2 pb-1">
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>

      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
        <h2 className="text-center text-xl font-bold text-[#1E1E1E]">
          Book Identified
        </h2>

        <div className="flex gap-4">
          {book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.coverUrl}
              alt=""
              className="w-24 h-auto rounded-md shadow-md flex-shrink-0"
            />
          ) : (
            <div className="w-24 h-36 rounded-md bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 flex-shrink-0">
              no cover
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-base font-bold leading-tight line-clamp-2">
              {book.title ?? "Untitled"}
            </p>
            {book.authors.length > 0 && (
              <p className="text-sm text-gray-600 truncate">
                {book.authors.join(", ")}
              </p>
            )}
            {(book.rating !== null || book.usersCount !== null) && (
              <p className="text-sm flex items-center gap-1.5">
                {book.rating !== null && (
                  <span className="inline-flex items-center gap-1">
                    {book.rating.toFixed(1)}
                    <span aria-hidden="true">★</span>
                  </span>
                )}
                {book.usersCount !== null && (
                  <span className="text-gray-500">
                    {book.usersCount.toLocaleString()} reviews
                  </span>
                )}
              </p>
            )}
            {book.genres.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 pt-1">
                {book.genres.slice(0, 3).map((g) => (
                  <li
                    key={g}
                    className="rounded-full bg-gray-100 text-gray-700 text-xs px-2.5 py-0.5"
                  >
                    {g}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-5 py-3 text-base font-semibold text-white transition-colors"
          >
            View Book Details
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Scan another book"
            className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/scan/camera-icon.svg" alt="" width={20} height={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
