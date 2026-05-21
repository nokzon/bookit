import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { HardcoverBook } from "@/lib/hardcover";

export type DbBook = {
  id: number;
  isbn_13: string;
  hardcover_edition_id: number | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  authors: string[];
  cover_url: string | null;
  rating: number | null;
  users_count: number | null;
  pages: number | null;
  release_date: string | null;
  publisher: string | null;
  genres: string[];
  themes: string[];
  cached_at: string;
};

export async function upsertBook(book: HardcoverBook): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("books")
    .upsert(
      {
        isbn_13: book.isbn13,
        hardcover_edition_id: book.editionId,
        title: book.title,
        subtitle: book.subtitle,
        description: book.description,
        authors: book.authors,
        cover_url: book.coverUrl,
        rating: book.rating,
        users_count: book.usersCount,
        pages: book.pages,
        release_date: book.releaseDate,
        publisher: book.publisher,
        genres: book.genres,
        themes: book.themes,
        cached_at: new Date().toISOString(),
      },
      { onConflict: "isbn_13" },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to upsert book: ${error?.message ?? "no data"}`);
  }

  return data.id;
}

export async function getBookById(id: number): Promise<DbBook | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as DbBook;
}
