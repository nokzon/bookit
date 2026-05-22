import { signOut } from "@/app/auth/actions";

export function SignOutButton({ email }: { email: string | null | undefined }) {
  return (
    <form
      action={signOut}
      className="fixed top-3 right-3 z-30 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border border-gray-200 pl-3 pr-1 py-1 shadow-sm"
    >
      {email && (
        <span className="text-xs text-gray-700 max-w-[140px] truncate">
          {email}
        </span>
      )}
      <button
        type="submit"
        aria-label="Sign out"
        className="rounded-full hover:bg-gray-100 active:bg-gray-200 p-1.5 text-gray-700 transition-colors"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      </button>
    </form>
  );
}
