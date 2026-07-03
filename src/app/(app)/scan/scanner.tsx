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
import { JOST_STACK, LIVVIC_STACK } from "@/lib/fonts";
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

// OCR (reading the printed ISBN digits) is the PRIMARY detector — we try it
// first. The barcode reader is the fallback, enabled only after OCR has had a
// few completed attempts without reading a valid ISBN. First OCR fire downloads
// Tesseract (~3MB WASM) so it's slower; subsequent ones are quick.
const OCR_INTERVAL_MS = 2500;
const OCR_FIRST_TICK_MS = 600;
// Fall back to barcode scanning after this many OCR attempts that actually ran
// (Tesseract recognized text) but didn't yield a valid ISBN. We only count ticks
// where OCR genuinely ran — a slow or failed Tesseract download (offline, blocked
// WASM fetch) is NOT counted, so download problems never trip the fallback.
const OCR_MAX_ATTEMPTS = 4;
// Once in the barcode-fallback phase, OCR rests but isn't permanently disabled:
// after this many OCR ticks spent resting, OCR gets another turn (in case the
// earlier burst just had bad framing). This alternates OCR <-> barcode for the
// rest of the session rather than locking into barcode-only.
const BARCODE_REST_TICKS = 4;
// If the Tesseract call THROWS (vs. runs and finds nothing) this many times in a
// row, OCR is treated as unavailable — typically an offline/blocked WASM
// download. We then switch to barcode PERMANENTLY (no periodic OCR retry), since
// retrying a broken download just wastes ticks while the barcode reader, which
// needs no download, works. A small threshold absorbs transient network blips.
const OCR_MAX_ERRORS = 3;

export function Scanner({
  compareMode = false,
  compareWithId = null,
}: {
  compareMode?: boolean;
  compareWithId?: string | null;
} = {}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<Controls | null>(null);
  const ocrTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ocrRunningRef = useRef(false);
  const stateRef = useRef<ScanState>({ kind: "starting" });
  // Detection phase: start with OCR (read the printed digits), fall back to the
  // barcode reader only once OCR has had a fair number of tries. phaseRef is the
  // source of truth for the long-lived ZXing/OCR callbacks; detectMode mirrors
  // it for the UI label.
  const phaseRef = useRef<"ocr" | "barcode">("ocr");
  const ocrAttemptsRef = useRef(0);
  // How many OCR ticks have rested during the current barcode phase. Drives the
  // periodic OCR retry (see BARCODE_REST_TICKS).
  const barcodeRestRef = useRef(0);
  // Consecutive Tesseract throws (reset on any successful run). Once this hits
  // OCR_MAX_ERRORS, OCR is deemed unavailable and we stop retrying it for the
  // rest of the session (see ocrUnavailableRef).
  const ocrErrorsRef = useRef(0);
  const ocrUnavailableRef = useRef(false);

  const [state, setState] = useState<ScanState>({ kind: "starting" });
  const [detectMode, setDetectMode] = useState<"ocr" | "barcode">("ocr");
  // Whether the "what do I scan?" help guide is open. Kept separate from
  // ScanState so opening the guide never interferes with the detection loop —
  // the camera keeps running underneath.
  const [showHelp, setShowHelp] = useState(false);

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
    // Restart the cycle: give OCR priority again before falling back to barcode.
    // Unless OCR was deemed unavailable (download keeps failing) — then stay on
    // barcode so we don't burn another round of failed downloads per book.
    if (ocrUnavailableRef.current) {
      phaseRef.current = "barcode";
      setDetectMode("barcode");
      setState({ kind: "scanning" });
      return;
    }
    phaseRef.current = "ocr";
    ocrAttemptsRef.current = 0;
    setDetectMode("ocr");
    setState({ kind: "scanning" });
  }, []);

  const switchToBarcode = useCallback(() => {
    if (phaseRef.current === "barcode") return;
    phaseRef.current = "barcode";
    barcodeRestRef.current = 0;
    setDetectMode("barcode");
  }, []);

  // Give OCR another turn after it has rested during the barcode phase. Resets
  // the attempt counter so OCR gets a fresh OCR_MAX_ATTEMPTS-sized burst.
  const switchToOcr = useCallback(() => {
    if (phaseRef.current === "ocr") return;
    phaseRef.current = "ocr";
    ocrAttemptsRef.current = 0;
    setDetectMode("ocr");
  }, []);

  const runOcrTick = useCallback(async () => {
    if (ocrRunningRef.current || isPaused()) return;

    // In the barcode (fallback) phase OCR rests rather than reading digits.
    // Normally it isn't disabled: after a cooldown it hands back to OCR so a
    // legible printed ISBN gets another chance (the earlier burst may have just
    // had bad framing), alternating OCR <-> barcode for the session. But if OCR
    // was deemed unavailable (download keeps failing), we stay on barcode-only.
    if (phaseRef.current === "barcode") {
      if (ocrUnavailableRef.current) return;
      barcodeRestRef.current += 1;
      if (barcodeRestRef.current >= BARCODE_REST_TICKS) {
        switchToOcr();
      }
      return;
    }

    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    ocrRunningRef.current = true;
    // Whether Tesseract actually ran and produced text this tick. Only a real
    // run counts toward the barcode fallback — a thrown call (offline, blocked
    // WASM download) leaves this false so it never trips the handoff.
    let ocrRan = false;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);

      const Tesseract = await import("tesseract.js");
      const { data } = await Tesseract.recognize(canvas, "eng");
      ocrRan = true;
      ocrErrorsRef.current = 0;
      if (isPaused() || phaseRef.current !== "ocr") return;

      const isbn = extractIsbn13(data.text ?? "");
      if (isbn) {
        await handleIsbnDetected(isbn);
        return;
      }
    } catch {
      // OCR failures (e.g. an offline/blocked Tesseract download) are silent and
      // NOT counted as a normal attempt, so download problems don't prematurely
      // hand off via OCR_MAX_ATTEMPTS. But repeated throws mean OCR can't load at
      // all — after OCR_MAX_ERRORS in a row, deem it unavailable and switch to
      // barcode permanently (the barcode reader needs no download).
      ocrErrorsRef.current += 1;
      if (ocrErrorsRef.current >= OCR_MAX_ERRORS) {
        ocrUnavailableRef.current = true;
        switchToBarcode();
      }
    } finally {
      ocrRunningRef.current = false;
    }

    // A real OCR run that didn't identify a book. Once OCR has had its fair
    // share of genuine tries, hand off to the barcode reader.
    if (ocrRan) {
      ocrAttemptsRef.current += 1;
      if (ocrAttemptsRef.current >= OCR_MAX_ATTEMPTS) {
        switchToBarcode();
      }
    }
  }, [handleIsbnDetected, switchToBarcode, switchToOcr]);

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
            // ZXing runs continuously to keep the camera feed alive, but its
            // results are ignored until OCR has had its turn (barcode phase).
            if (!result || isPaused() || phaseRef.current !== "barcode") return;
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
    ocrTimerRef.current = setTimeout(tick, OCR_FIRST_TICK_MS);
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
              : detectMode === "ocr"
                ? "Reading the ISBN number…"
                : "Scanning the barcode…"}
          </div>
        )}
        {state.kind === "previewing" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
            Looking up {state.isbn}…
          </div>
        )}

        {/* Help button — opens the "what do I scan?" guide */}
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          aria-label="What should I scan?"
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center bg-white/90 shadow-md backdrop-blur-sm transition-colors hover:bg-white active:bg-white/80"
          style={{
            fontFamily: LIVVIC_STACK,
            fontSize: "18px",
            fontWeight: 700,
            color: "#1e1e1e",
            lineHeight: 1,
          }}
        >
          ?
        </button>
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
          ctaLabel={compareMode ? "Compare with this Book" : "View Book Details"}
          onConfirm={() => {
            if (compareMode) {
              const href = compareWithId
                ? `/compare?a=${compareWithId}&b=${state.bookId}`
                : `/compare?a=${state.bookId}`;
              router.push(href);
            } else {
              router.push(`/lookup?isbn=${state.book.isbn13}`);
            }
          }}
          onDismiss={resumeScanning}
        />
      )}

      {showHelp && <HelpGuide onClose={() => setShowHelp(false)} />}
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

/**
 * Help guide shown when the user taps the "?" button — explains what to point
 * the camera at, with an annotated ISBN barcode example. Centered modal with a
 * dimmed backdrop; fades + scales in on mount to match the app's soft motion.
 */
function HelpGuide({ onClose }: { onClose: () => void }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Close on Escape for keyboard / desktop users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const MANSALVA = "var(--font-mansalva), system-ui, cursive";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        opacity: shown ? 1 : 0,
        transition: "opacity 0.25s ease-out",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="What to scan"
    >
      <div
        className="flex w-full flex-col items-center shadow-2xl border border-black/5"
        style={{
          width: "100%",
          maxWidth: "416px",
          padding: "24px",
          gap: "32px",
          borderRadius: "27px",
          backgroundColor: "#F5F5F5",
          opacity: shown ? 1 : 0,
          transform: shown ? "scale(1)" : "scale(0.95)",
          transition: "opacity 0.25s ease-out, transform 0.25s ease-out",
          maxHeight: "calc(100dvh - 48px)",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title + subtitle, 16px apart */}
        <div className="flex w-full flex-col items-center" style={{ gap: "16px" }}>
          <h2
            style={{
              color: "#1E1E1E",
              textAlign: "center",
              fontFamily: MANSALVA,
              fontSize: "32px",
              fontWeight: 400,
              lineHeight: "normal",
              margin: 0,
            }}
          >
            What to scan?
          </h2>

          <p
            style={{
              color: "#000",
              textAlign: "center",
              fontFamily: JOST_STACK,
              fontSize: "14px",
              fontWeight: 400,
              lineHeight: "normal",
              margin: 0,
            }}
          >
            Point your camera at the book&apos;s ISBN (the barcode with the
            13-digit number, usually on the back cover)
          </p>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/scan/isbn-example.jpeg"
          alt="Example of a book's ISBN barcode, showing the number 978-0-241-25208-6"
          className="w-full rounded-2xl"
          style={{ display: "block" }}
        />

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-full px-5 py-3 text-base font-semibold text-white transition-colors bg-[#33A45D] hover:bg-[#2A8F4F] active:bg-[#1F7B3F]"
        >
          Got it
        </button>
      </div>
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
  ctaLabel = "View Book Details",
}: {
  book: HardcoverBook;
  onConfirm: () => void;
  onDismiss: () => void;
  ctaLabel?: string;
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
      className="fixed left-[10px] right-[10px] z-50 rounded-[44px] shadow-2xl border border-black/5 flex flex-col items-center px-5 touch-none"
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
          fontFamily: LIVVIC_STACK,
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
            style={{ fontFamily: JOST_STACK }}
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
                    className="rounded-full bg-[#E7E5E3] text-gray-700 text-xs px-2.5 py-0.5"
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
          className="flex-1 rounded-full px-5 py-3 text-base font-semibold text-white transition-colors bg-[#33A45D] hover:bg-[#2A8F4F] active:bg-[#1F7B3F]"
        >
          {ctaLabel}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Scan another book"
          className="w-12 h-12 rounded-full flex items-center justify-center transition-colors hover:bg-black/10 active:bg-black/20"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/scan/camera-icon.svg" alt="" width={20} height={20} />
        </button>
      </div>
    </div>
  );
}
