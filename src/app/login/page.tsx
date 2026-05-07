import Image from "next/image";
import { signInWithGoogle } from "@/app/auth/actions";

type SearchParams = Promise<{ error?: string; next?: string }>;

const PAGE_BACKGROUND =
  "radial-gradient(ellipse 120% 60% at 50% 0%, #CFDCB0 0%, transparent 82%)," +
  "linear-gradient(180deg, #ECF1E0 0%, #ECF1E0 50%, #FFFFFF 88%)";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, next } = await searchParams;

  return (
    <main
      className="flex-1 flex flex-col items-center min-h-dvh w-full"
      style={{ background: PAGE_BACKGROUND }}
    >
      <header className="pt-20 pb-4">
        <Image
          src="/brand/wordmark.svg"
          alt="Bookit"
          width={189}
          height={66}
          priority
        />
      </header>

      <section className="flex-1 flex items-center justify-center w-full px-8">
        <Image
          src="/brand/mascot.svg"
          alt=""
          width={230}
          height={204}
          priority
          aria-hidden="true"
        />
      </section>

      <footer className="w-full max-w-md px-8 pb-20 flex flex-col items-stretch gap-2">
        {error && (
          <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 text-center">
            {error}
          </p>
        )}

        <p
          className="text-center"
          style={{
            fontSize: "16px",
            fontWeight: 500,
            lineHeight: "40.435px",
            letterSpacing: "0.202px",
            color: "#1E1E1E",
          }}
        >
          Sign in to get started
        </p>

        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={next ?? "/"} />
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-8 py-1 min-h-14 rounded-full text-base font-medium text-white bg-[#333] hover:bg-[#4a4a4a] active:bg-[#1a1a1a] active:scale-[0.98] transition-[background-color,transform] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#333] cursor-pointer"
          >
            <GoogleMark />
            Sign in with Google
          </button>
        </form>
      </footer>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
