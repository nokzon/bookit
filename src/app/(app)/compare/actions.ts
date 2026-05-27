"use server";

import { redirect } from "next/navigation";
import { lookupBookByIsbn } from "@/lib/hardcover";
import { upsertBook } from "@/lib/db/books";
import { recordRecent } from "@/lib/db/recents";

export async function selectForCompare(formData: FormData) {
  const isbn = String(formData.get("isbn") ?? "").trim();
  const aRaw = String(formData.get("a") ?? "").trim();
  const a = aRaw.length > 0 ? Number(aRaw) : null;
  const aValid = a !== null && Number.isInteger(a) && a > 0 ? a : null;

  if (!isbn) {
    redirect(aValid !== null ? `/compare?a=${aValid}` : "/compare");
  }

  const result = await lookupBookByIsbn(isbn);
  if (!result.ok) {
    redirect(aValid !== null ? `/compare?a=${aValid}` : "/compare");
  }

  const bookId = await upsertBook(result.book);
  await recordRecent(bookId);

  if (aValid !== null) {
    redirect(`/compare?a=${aValid}&b=${bookId}`);
  } else {
    redirect(`/compare?a=${bookId}`);
  }
}
