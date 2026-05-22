import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Root is just a router: signed-in -> Bookit (scan), signed-out -> branded login.
  redirect(user ? "/scan" : "/login");
}
