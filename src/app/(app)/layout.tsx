import { BottomNav } from "@/components/BottomNav";
import { ProfileMenu } from "@/components/ProfileMenu";
import { createClient } from "@/lib/supabase/server";

// Pale brand background used across all signed-in pages.
const APP_BACKGROUND = "#ECF1E0";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ??
    (user?.user_metadata?.picture as string | undefined) ??
    null;

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ backgroundColor: APP_BACKGROUND }}
    >
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
        style={{ backgroundColor: APP_BACKGROUND }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/wordmark-header.svg"
          alt="Bookit"
          width={149}
          height={48}
          className="h-11 w-auto"
        />
        <ProfileMenu email={user?.email} avatarUrl={avatarUrl} />
      </header>

      <main className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
