# Bookit

Mobile-first web app: scan a book's ISBN (camera + OCR or barcode), look up metadata via the Hardcover API, save and compare books.

## Stack (locked — do not change without asking)

- **Next.js 16.2.5** (App Router) + TypeScript + Tailwind v4, `src/` directory, no custom import alias
- **Supabase** auth + DB via **`@supabase/ssr` v0.10.x** (NOT the deprecated `@supabase/auth-helpers-nextjs`)
- **Hardcover API** for book metadata — server-side only (no `NEXT_PUBLIC_` prefix on its key)
- **Tesseract.js** for OCR (primary), **`@zxing/browser`** for barcode decode (fallback) — both live
- **Server actions** for mutations (no API routes unless necessary)
- Deploy target: **Vercel**

## Next.js 16 specifics that bite

These differ from older Next.js patterns and from most online tutorials:

1. **Session refresh + route gating live in `src/middleware.ts`** (standard `middleware()` export, `NextRequest`/`NextResponse` API, `config.matcher`). This is the real file in the repo. Do not rename it.
2. **`cookies()` from `next/headers` is async.** Always `(await cookies()).get(...)` / `(await cookies()).set(...)`.
3. `@supabase/ssr` *requires* the middleware to call `supabase.auth.getUser()` for token refresh. Without it: random logouts, JSON parse errors, stale sessions. So `middleware.ts` is load-bearing for auth here. Keep it.

## Supabase auth rules (non-negotiable)

1. **Always use `supabase.auth.getUser()` on the server. Never `getSession()`.** `getSession()` reads the cookie without verifying it server-side, so it's spoofable. `getUser()` round-trips to Supabase.
2. **The `getUser()` call inside `src/middleware.ts` is what refreshes session tokens.** Do not remove it during refactors. If the middleware stops calling `getUser()`, sessions silently rot.
3. **Auth mutations (login, signup, signOut) are server actions**, not client-side fetch.
4. **Never expose secrets to the client.** Hardcover API key stays server-side — no `NEXT_PUBLIC_` prefix. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public, by design.

## Project layout

```
src/
  app/
    page.tsx              # Landing — shows auth state
    layout.tsx
    login/page.tsx        # "Continue with Google" button (server action)
    auth/
      actions.ts          # signInWithGoogle, signOut server actions
      callback/route.ts   # OAuth code-for-session exchange (route handler — required for OAuth callback)
  lib/
    supabase/
      client.ts           # Browser client (createBrowserClient)
      server.ts           # Server client (createServerClient with async cookies)
  middleware.ts           # Refreshes Supabase session, gates protected routes
```

**Auth method: Google OAuth only.** Email/password is deliberately not supported. The `/auth/callback` route handler is the one place we *do* use a route handler instead of a server action — Google redirects via GET to deliver the OAuth code, which can only be received by a route handler.

Protected routes (redirect to `/login` if not authenticated): `/scan`, `/saved`, `/recents`, `/compare`, `/lookup`.

**OAuth setup prerequisites** (configured outside this repo):
- Google Cloud Console: OAuth 2.0 Web client with authorized redirect URI `https://<supabase-project>.supabase.co/auth/v1/callback`
- Supabase dashboard → Authentication → Providers → Google: enabled with Google client ID/secret
- Supabase dashboard → Authentication → URL Configuration: Site URL + redirect URL include `http://localhost:3000` (and the prod domain when deployed) and the redirect list includes `<origin>/auth/callback`

## Functional requirements (as built)

This list reflects what is actually implemented. Keep it in sync with the code — the FR numbering here matches the report's FR table.

- FR-01 Scan ISBN via live device camera (no shutter; continuous detection)
- FR-02 Extract ISBN via OCR (Tesseract.js) — **primary** detector, tried first
- FR-03 Decode ISBN barcode (`@zxing/browser`) — **fallback** after OCR has had several tries; loop can alternate back to OCR
- FR-04 Validate ISBN-13 (helpers in `src/lib/isbn.ts`, inline during detection)
- FR-05 Manual lookup by typed ISBN/title at `/lookup` (user-initiated; the scanner does not auto-suggest it)
- FR-06 Fetch book info from Hardcover API (server action `previewBookByIsbn`)
- FR-07 Display title, author, description, ratings, cover, publication info
- FR-08 Auto-store scans in Recents
- FR-09 Add/remove from Saved
- FR-10 Compare two books on author, rating, genre, publication year
- FR-11 Auth via **Google OAuth only** (Supabase); no email/password, no sign-up step

## Report accuracy notes (things that have drifted before)

When writing the report, these are the facts the codebase actually supports. Earlier drafts got them wrong:

- It is a **mobile-first web app (Next.js + TypeScript)**, NOT an iOS / Swift / SwiftUI app.
- Book data comes from the **Hardcover API only**, NOT Google Books or Open Library.
- Auth is **Google OAuth only**. There is no registration form, password, or email/password login.
- The app does **not** show price, and does **not** suggest related/recommended titles.
- Scanning is a **continuous live loop**, not a single "capture image" action. OCR is primary; barcode is the fallback.
