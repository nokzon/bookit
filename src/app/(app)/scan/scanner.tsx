"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  extractIsbn13,
  isValidIsbn13,
  normalizeIsbn13,
} from "@/lib/isbn";

type Controls = { stop: () => void };

type ScanState =
  | { kind: "starting" }
  | { kind: "scanning" }
  | { kind: "detected"; isbn: string }
  | { kind: "permission-denied" }
  | { kind: "no-camera" }
  | { kind: "error"; message: string };

export function Scanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<Controls | null>(null);
  const [state, setState] = useState<ScanState>({ kind: "starting" });
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const handleDetected = useCallback(
    (isbn: string) => {
      controlsRef.current?.stop();
      controlsRef.current = null;
      setState({ kind: "detected", isbn });
      router.push(`/lookup?isbn=${encodeURIComponent(isbn)}`);
    },
    [router],
  );

  // Start ZXing continuous barcode scanning on mount; stop on unmount.
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
            if (!result) return;
            const normalized = normalizeIsbn13(result.getText());
            if (isValidIsbn13(normalized)) {
              handleDetected(normalized);
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
    };
  }, [handleDetected]);

  const runOcr = async () => {
    if (ocrRunning) return;
    setOcrRunning(true);
    setOcrError(null);
    try {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) {
        throw new Error("Camera not ready yet.");
      }
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available.");
      ctx.drawImage(video, 0, 0);

      const Tesseract = await import("tesseract.js");
      const { data } = await Tesseract.recognize(canvas, "eng");
      const isbn = extractIsbn13(data.text ?? "");

      if (isbn) {
        handleDetected(isbn);
      } else {
        setOcrError(
          "No ISBN-13 found in the captured frame. Try again with better focus or lighting.",
        );
      }
    } catch (err) {
      setOcrError(
        err instanceof Error ? err.message : "OCR failed. Try again.",
      );
    } finally {
      setOcrRunning(false);
    }
  };

  if (state.kind === "permission-denied") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
        <p className="font-semibold text-amber-900">Camera permission denied</p>
        <p className="text-sm text-amber-900">
          Bookit needs camera access to scan ISBNs. Grant permission in your
          browser settings (look for a camera icon in the address bar), then
          reload this page.
        </p>
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

  if (state.kind === "no-camera") {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
        <p className="font-semibold">No camera found</p>
        <p className="text-sm text-gray-700">
          This device doesn&apos;t appear to have a camera.{" "}
          <Link href="/lookup" className="underline">
            Type the ISBN manually
          </Link>{" "}
          instead.
        </p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
        <p className="font-semibold text-red-900">Camera error</p>
        <p className="text-sm text-red-900">{state.message}</p>
        <p className="text-sm text-red-900">
          <Link href="/lookup" className="underline">
            Type the ISBN manually
          </Link>
        </p>
      </div>
    );
  }

  const statusText =
    state.kind === "detected"
      ? `Found ${state.isbn} — loading…`
      : state.kind === "scanning"
        ? "Looking for an ISBN barcode…"
        : "Starting camera…";

  return (
    <div className="space-y-4">
      <div className="relative rounded-lg overflow-hidden bg-black aspect-[3/4]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {/* Framing guide */}
        <div className="pointer-events-none absolute inset-x-6 top-1/3 bottom-1/3 border-2 border-white/80 rounded-md" />
        {/* Status pill */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
          {statusText}
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={runOcr}
          disabled={ocrRunning || state.kind === "detected"}
          className="w-full rounded-md bg-[#333] hover:bg-[#4a4a4a] active:bg-[#1a1a1a] disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          {ocrRunning ? "Reading text…" : "Read printed ISBN (OCR)"}
        </button>
        <p className="text-xs text-gray-500 text-center">
          OCR is a fallback for books without a scannable barcode. The Tesseract
          engine downloads ~3 MB on first use.
        </p>
      </div>

      {ocrError && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {ocrError}
        </p>
      )}

      <p className="text-xs text-gray-500 text-center pt-2">
        Or{" "}
        <Link href="/lookup" className="underline">
          type the ISBN manually
        </Link>
        .
      </p>
    </div>
  );
}
