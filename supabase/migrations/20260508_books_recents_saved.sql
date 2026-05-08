-- Books, Recents, Saved
-- Normalized: books is a shared cache of Hardcover snapshots; recents and saved
-- reference books by id and are scoped per-user via RLS.

create table public.books (
  id bigint primary key generated always as identity,
  isbn_13 text not null unique,
  hardcover_edition_id integer,
  title text,
  subtitle text,
  description text,
  authors text[] not null default '{}',
  cover_url text,
  rating numeric(3,2),
  users_count integer,
  pages integer,
  release_date date,
  publisher text,
  cached_at timestamptz not null default now()
);

create table public.recents (
  id bigint primary key generated always as identity,
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id bigint not null references public.books(id) on delete cascade,
  looked_up_at timestamptz not null default now(),
  unique (user_id, book_id)
);

create index recents_user_lookedup_idx
  on public.recents (user_id, looked_up_at desc);

create table public.saved (
  id bigint primary key generated always as identity,
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id bigint not null references public.books(id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique (user_id, book_id)
);

create index saved_user_savedat_idx
  on public.saved (user_id, saved_at desc);

-- Row-level security
alter table public.books   enable row level security;
alter table public.recents enable row level security;
alter table public.saved   enable row level security;

-- books: any authed user can read; server actions can upsert (writes are gated
-- by what Hardcover returns, not user input)
create policy "books read"   on public.books for select to authenticated using (true);
create policy "books insert" on public.books for insert to authenticated with check (true);
create policy "books update" on public.books for update to authenticated using (true) with check (true);

-- recents: only your own rows
create policy "recents read"   on public.recents for select to authenticated using (auth.uid() = user_id);
create policy "recents insert" on public.recents for insert to authenticated with check (auth.uid() = user_id);
create policy "recents update" on public.recents for update to authenticated using (auth.uid() = user_id);
create policy "recents delete" on public.recents for delete to authenticated using (auth.uid() = user_id);

-- saved: only your own rows
create policy "saved read"   on public.saved for select to authenticated using (auth.uid() = user_id);
create policy "saved insert" on public.saved for insert to authenticated with check (auth.uid() = user_id);
create policy "saved delete" on public.saved for delete to authenticated using (auth.uid() = user_id);

-- Table-level GRANTs to the authenticated role. Required because new tables
-- created via raw SQL don't always inherit default privileges. Without these,
-- RLS never gets a chance to evaluate — Postgres rejects with "permission
-- denied for table" first.
grant select, insert, update, delete on public.books   to authenticated;
grant select, insert, update, delete on public.recents to authenticated;
grant select, insert, update, delete on public.saved   to authenticated;
