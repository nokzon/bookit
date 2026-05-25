"use client";

import { useEffect, useState } from "react";
import { saveBook, unsaveBook } from "@/app/(app)/saved/actions";

const TOAST_VISIBLE_MS = 2000;

export function SaveButton({
  bookId,
  isbn,
  initialSaved,
}: {
  bookId: number;
  isbn: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [toast, setToast] = useState<string | null>(null);

  // Keep local state in sync if server revalidates with a different value
  // (e.g. unsaved from /saved in another tab).
  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved]);

  // Auto-dismiss the toast after a fixed duration.
  useEffect(() => {
    if (toast === null) return;
    const id = window.setTimeout(() => setToast(null), TOAST_VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, [toast]);

  const toggle = () => {
    const nextSaved = !saved;
    // Optimistic UI: flip the icon + show toast immediately.
    setSaved(nextSaved);
    setToast(nextSaved ? "Book saved" : "Removed from saved");

    const formData = new FormData();
    formData.set("bookId", String(bookId));
    formData.set("next", `/lookup?isbn=${isbn}`);

    (async () => {
      try {
        if (nextSaved) await saveBook(formData);
        else await unsaveBook(formData);
      } catch {
        // Revert optimistic update on failure; surface the error via toast.
        setSaved(!nextSaved);
        setToast("Save failed — please try again");
      }
    })();
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={saved ? "Remove from saved" : "Save book"}
        aria-pressed={saved}
        className="w-12 h-12 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 active:opacity-60"
        style={{ backgroundColor: "#F5F5F5" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={saved ? "/book-details/saved-icon.svg" : "/book-details/save-icon.svg"}
          alt=""
          width={22}
          height={22}
        />
      </button>

      {toast !== null && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] rounded-full bg-black/85 backdrop-blur text-white text-sm font-medium px-4 py-2 shadow-lg pointer-events-none"
          style={{ animation: "toast-in 200ms ease-out" }}
        >
          {toast}
        </div>
      )}

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </>
  );
}
