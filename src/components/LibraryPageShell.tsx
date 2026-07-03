import type { ReactNode } from "react";
import { LIVVIC_STACK } from "@/lib/fonts";

// Shared page frame for the Recents and Saved library pages: centered column,
// 32px Livvic heading, and the light fade that sits behind the bottom nav.
const BOTTOM_FADE =
  "linear-gradient(180deg, rgba(248, 250, 253, 0.02) 0%, rgba(248, 250, 253, 0.20) 35.1%, #F8FAFD 75.48%)";

export function LibraryPageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="mx-auto w-full max-w-xl px-6 py-8 space-y-6">
        <h1
          style={{
            color: "#000",
            fontFamily: LIVVIC_STACK,
            fontSize: "32px",
            fontWeight: 600,
            lineHeight: "normal",
          }}
        >
          {title}
        </h1>

        {children}
      </div>

      {/* Light fade-out at the bottom of the page (sits behind the nav). */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-40"
        style={{ background: BOTTOM_FADE }}
      />
    </>
  );
}
