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

  // Haptic feedback when a book is successfully identified. Vibration API is
  // unsupported on iOS Safari — feature-detect and silently skip.
  useEffect(() => {
    if (
      state.kind === "identified" &&
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    ) {
      navigator.vibrate(50);
    }
  }, [state.kind]);

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
      style={{ backgroundColor: "#F3F2EE" }}
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
  // Slide-up on mount + swipe-down-to-dismiss gesture (on the handle area).
  // translateY is a percentage of the popup height: 0 = fully visible,
  // 100 = fully off-screen.
  const [translateY, setTranslateY] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number | null>(null);

  // Animate from 100 -> 0 on first frame after mount.
  useEffect(() => {
    const id = requestAnimationFrame(() => setTranslateY(0));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) {
      // 400 = popup content height; convert px drag to %.
      setTranslateY(Math.min(100, (delta / 400) * 100));
    }
  };

  const handleTouchEnd = () => {
    if (dragStartY.current === null) return;
    dragStartY.current = null;
    setIsDragging(false);
    if (translateY > 25) {
      // Past dismissal threshold — slide all the way out, then notify parent.
      setTranslateY(100);
      window.setTimeout(onDismiss, 250);
    } else {
      // Snap back to fully visible.
      setTranslateY(0);
    }
  };

  return (
    <div
      className="fixed left-[10px] right-[10px] z-50 rounded-3xl shadow-2xl border border-black/5 flex flex-col items-center px-5 touch-none"
      style={{
        backgroundColor: "#F5F5F5",
        bottom: "calc(10px + env(safe-area-inset-bottom))",
        height: "400px",
        paddingBottom: "1.25rem",
        transform: `translateY(${translateY}%)`,
        transition: isDragging ? "none" : "transform 0.3s ease-out",
        willChange: "transform",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Drag handle (visual only — gesture is on the whole popup) */}
      <div
        className="self-stretch flex justify-center pt-2 pb-3 select-none"
        aria-hidden="true"
      >
        <div className="w-10 h-1 rounded-full bg-gray-300 flex-shrink-0" />
      </div>

      <h2
        className="flex-shrink-0"
        style={{
          color: "#333",
          textAlign: "center",
          fontFeatureSettings: '"liga" off, "clig" off',
          fontFamily: "var(--font-livvic), system-ui, sans-serif",
          fontSize: "24px",
          fontStyle: "normal",
          fontWeight: 600,
          lineHeight: "22px",
          letterSpacing: "-0.43px",
        }}
      >
        Book Identified
      </h2>

      <div className="flex-1 w-full flex items-center justify-center min-h-0">
        <div className="flex items-center gap-5">
          {book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.coverUrl}
              alt=""
              className="flex-shrink-0"
              style={{
                width: "120px",
                height: "182px",
                aspectRatio: "60/91",
                borderRadius: "2px",
                boxShadow: "7px 9px 8px 0 rgba(0, 0, 0, 0.25)",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              className="bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 flex-shrink-0"
              style={{
                width: "120px",
                height: "182px",
                aspectRatio: "60/91",
                borderRadius: "2px",
                boxShadow: "7px 9px 8px 0 rgba(0, 0, 0, 0.25)",
              }}
            >
              no cover
            </div>
          )}

          <div
            className="min-w-0 max-w-[180px] space-y-1.5"
            style={{ fontFamily: "var(--font-jost), system-ui, sans-serif" }}
          >
            <p className="text-[17px] font-bold leading-tight line-clamp-2 text-[#1E1E1E]">
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
      </div>

      <div className="flex items-center gap-2 self-stretch flex-shrink-0">
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-full px-5 py-3 text-base font-semibold text-white transition-colors hover:opacity-90 active:opacity-80"
          style={{ backgroundColor: "#33A45D" }}
        >
          View Book Details
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Scan another book"
          className="w-12 h-12 rounded-full flex items-center justify-center transition-opacity hover:opacity-70 active:opacity-50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/scan/camera-icon.svg" alt="" width={20} height={20} />
        </button>
      </div>
    </div>
  );
}
