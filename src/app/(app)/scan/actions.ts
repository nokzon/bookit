"use server";

import { isValidIsbn13, normalizeIsbn13 } from "@/lib/isbn";
import { lookupBookByIsbn, type HardcoverBook } from "@/lib/hardcover";
import { upsertBook } from "@/lib/db/books";

export type ScanPreview =
  | { ok: true; bookId: number; book: HardcoverBook }
  | { ok: false; reason: "invalid-isbn" | "not-found" | "api-error"; message?: string };

/**
 * Used by the /scan page: given a raw detected ISBN (from barcode or OCR),
 * validate it, fetch fresh book data from Hardcover, upsert into the cache,
 * and return the book for the confirmation popup. Does NOT record a recent —
 * we only record when the user confirms by navigating to /lookup.
 */
export async function previewBookByIsbn(rawIsbn: string): Promise<ScanPreview> {
  const normalized = normalizeIsbn13(rawIsbn);
  if (!isValidIsbn13(normalized)) {
    return { ok: false, reason: "invalid-isbn" };
  }

  const result = await lookupBookByIsbn(normalized);
  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason,
      message: result.message,
    };
  }

  const bookId = await upsertBook(result.book);
  return { ok: true, bookId, book: result.book };
}
