import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold mb-8">Bookit</h1>

      {user ? (
        <div className="space-y-4">
          <p className="text-sm">
            Signed in as <span className="font-medium">{user.email}</span>
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : (
        <Link
          href="/login"
          className="inline-block rounded-md bg-black px-3 py-2 text-sm text-white font-medium"
        >
          Sign in with Google
        </Link>
      )}
    </main>
  );
}
