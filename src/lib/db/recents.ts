import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DbBook } from "./books";

export type RecentEntry = {
  bookId: number;
  lookedUpAt: string;
  book: DbBook;
};

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
}

export async function listRecents(limit = 50): Promise<RecentEntry[]> {
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
