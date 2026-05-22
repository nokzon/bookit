export function normalizeIsbn13(input: string): string {
  return input.replace(/[\s-]/g, "");
}

export function isValidIsbn13(input: string): boolean {
  const isbn = normalizeIsbn13(input);
  if (!/^\d{13}$/.test(isbn)) return false;

  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = isbn.charCodeAt(i) - 48;
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return sum % 10 === 0;
}

/**
 * Scan free-form text (e.g. OCR output from a book's copyright page) for the
 * first valid ISBN-13. Matches any 13-digit sequence with optional separators
 * (spaces/hyphens), then validates each candidate via the checksum.
 */
export function extractIsbn13(text: string): string | null {
  const candidates = text.match(/(?:\d[\s-]*){12}\d/g);
  if (!candidates) return null;
  for (const raw of candidates) {
    const normalized = normalizeIsbn13(raw);
    if (isValidIsbn13(normalized)) return normalized;
  }
  return null;
}
