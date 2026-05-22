import { BottomNav } from "@/components/BottomNav";
import { SignOutButton } from "@/components/SignOutButton";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-dvh flex flex-col">
      <SignOutButton email={user?.email} />
      <div className="flex-1 pb-20">{children}</div>
      <BottomNav />
    </div>
  );
}
