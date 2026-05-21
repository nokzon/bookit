-- Add genres + themes columns to the books cache for FR-09 Compare.
-- Hardcover's cached_tags is keyed by category: we map Genre -> genres,
-- Mood -> themes. Top N by popularity are stored per book.
--
-- Existing rows default to empty arrays; they'll be backfilled the next time
-- the user looks up that ISBN (upsertBook overwrites).

alter table public.books
  add column genres text[] not null default '{}',
  add column themes text[] not null default '{}';
