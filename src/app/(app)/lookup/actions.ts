"use server";

import { searchBooks, type HardcoverSearchHit } from "@/lib/hardcover";

const MAX_SUGGESTIONS = 6;

export async function getSearchSuggestions(
  query: string,
): Promise<HardcoverSearchHit[]> {
  const result = await searchBooks(query);
  if (!result.ok) return [];
  return result.hits.slice(0, MAX_SUGGESTIONS);
}
