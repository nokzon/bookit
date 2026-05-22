"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveBook(formData: FormData) {
  const bookId = Number(formData.get("bookId"));
  const next = String(formData.get("next") ?? "/saved");
  if (!Number.isInteger(bookId) || bookId <= 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("saved")
    .upsert(
      { user_id: user.id, book_id: bookId, saved_at: new Date().toISOString() },
      { onConflict: "user_id,book_id" },
    );

  revalidatePath(next);
  revalidatePath("/saved");
}

export async function unsaveBook(formData: FormData) {
  const bookId = Number(formData.get("bookId"));
  const next = String(formData.get("next") ?? "/saved");
  if (!Number.isInteger(bookId) || bookId <= 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("saved")
    .delete()
    .eq("user_id", user.id)
    .eq("book_id", bookId);

  revalidatePath(next);
  revalidatePath("/saved");
}
