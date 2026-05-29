import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DbBook } from "./books";

export type RecentEntry = {
  bookId: number;
  lookedUpAt: string;
  book: DbBook;
};

// Recents only ever holds the most recently scanned books, per user.
const MAX_RECENTS = 30;

export async function recordRecent(bookId: number): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("recents")
    .upsert(
      {
        user_id: user.id,
        book_id: bookId,
        looked_up_at: new Date().toISOString(),
      },
      { onConflict: "user_id,book_id" },
    );

  if (error) {
    throw new Error(`Failed to record recent: ${error.message}`);
  }

  // Prune anything past the most recent MAX_RECENTS so the list never grows
  // beyond the cap. Find the timestamp of the oldest row we want to keep, then
  // delete everything strictly older than it.
  const { data: cutoffRows } = await supabase
    .from("recents")
    .select("looked_up_at")
    .eq("user_id", user.id)
    .order("looked_up_at", { ascending: false })
    .range(MAX_RECENTS - 1, MAX_RECENTS - 1);

  const cutoff = cutoffRows?.[0]?.looked_up_at;
  if (cutoff) {
    await supabase
      .from("recents")
      .delete()
      .eq("user_id", user.id)
      .lt("looked_up_at", cutoff);
  }
}

export async function listRecents(limit = MAX_RECENTS): Promise<RecentEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recents")
    .select("book_id, looked_up_at, book:books(*)")
    .order("looked_up_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data
    .filter((row) => row.book !== null)
    .map((row) => ({
      bookId: row.book_id,
      lookedUpAt: row.looked_up_at,
      book: row.book as unknown as DbBook,
    }));
}
