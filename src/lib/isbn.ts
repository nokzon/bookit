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
