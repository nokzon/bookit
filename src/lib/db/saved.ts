import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DbBook } from "./books";

export type SavedEntry = {
  bookId: number;
  savedAt: string;
  book: DbBook;
};

export async function isSaved(bookId: number): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("saved")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .maybeSingle();

  if (error) return false;
  return data !== null;
}

export async function listSaved(): Promise<SavedEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved")
    .select("book_id, saved_at, book:books(*)")
    .order("saved_at", { ascending: false });

  if (error || !data) return [];

  return data
    .filter((row) => row.book !== null)
    .map((row) => ({
      bookId: row.book_id,
      savedAt: row.saved_at,
      book: row.book as unknown as DbBook,
    }));
}
