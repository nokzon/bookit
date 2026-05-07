# Bookit

Mobile-first web app: scan a book's ISBN (camera + OCR or barcode), look up metadata via the Hardcover API, save and compare books.

## Stack (locked — do not change without asking)

- **Next.js 16.2.5** (App Router) + TypeScript + Tailwind v4, `src/` directory, no custom import alias
- **Supabase** auth + DB via **`@supabase/ssr` v0.10.x** (NOT the deprecated `@supabase/auth-helpers-nextjs`)
- **Hardcover API** for book metadata — server-side only (no `NEXT_PUBLIC_` prefix on its key)
- **Tesseract.js** for OCR, **`@zxing/browser`** for barcode decode (later)
- **Server actions** for mutations (no API routes unless necessary)
- Deploy target: **Vercel**

## Next.js 16 specifics that bite

These differ from older Next.js patterns and from most online tutorials:

1. **`middleware.ts` is now `proxy.ts`.** Same root-level (or `src/`-level) file convention, same `NextRequest`/`NextResponse` API, same `config.matcher` — only the filename changed. Do not "fix" `src/proxy.ts` to `src/middleware.ts`.
2. **`cookies()` from `next/headers` is async.** Always `(await cookies()).get(...)` / `(await cookies()).set(...)`.
3. The Next 16 docs warn that "Proxy should not be used as a full session management solution" — but `@supabase/ssr` *requires* the proxy file to call `supabase.auth.getUser()` for token refresh. Without it: random logouts, JSON parse errors, stale sessions. So the proxy file is load-bearing for auth here. Keep it.

## Supabase auth rules (non-negotiable)

1. **Always use `supabase.auth.getUser()` on the server. Never `getSession()`.** `getSession()` reads the cookie without verifying it server-side, so it's spoofable. `getUser()` round-trips to Supabase.
2. **The `getUser()` call inside `src/proxy.ts` is what refreshes session tokens.** Do not remove it during refactors. If the proxy stops calling `getUser()`, sessions silently rot.
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
  proxy.ts                # Next 16 proxy — refreshes Supabase session, gates protected routes
```

**Auth method: Google OAuth only.** Email/password is deliberately not supported. The `/auth/callback` route handler is the one place we *do* use a route handler instead of a server action — Google redirects via GET to deliver the OAuth code, which can only be received by a route handler.

Protected routes (redirect to `/login` if not authenticated): `/scan`, `/saved`, `/recents`, `/compare`.

**OAuth setup prerequisites** (configured outside this repo):
- Google Cloud Console: OAuth 2.0 Web client with authorized redirect URI `https://<supabase-project>.supabase.co/auth/v1/callback`
- Supabase dashboard → Authentication → Providers → Google: enabled with Google client ID/secret
- Supabase dashboard → Authentication → URL Configuration: Site URL + redirect URL include `http://localhost:3000` (and the prod domain when deployed) and the redirect list includes `<origin>/auth/callback`

## Functional requirements (roadmap)

- FR-01 Capture ISBN image via device camera
- FR-02 Extract ISBN via OCR (Tesseract.js)
- FR-03 Decode ISBN barcode as fallback (`@zxing/browser`)
- FR-04 Validate ISBN-13 (length + checksum)
- FR-05 Fetch book info from Hardcover API
- FR-06 Display title, author, description, ratings, publication info
- FR-07 Auto-store scans in Recents
- FR-08 Add/remove from Saved
- FR-09 Compare two books on author, rating, price, publication year — Hardcover may lack price; design for missing fields
- FR-10 Email/password auth ✅ (this session)
