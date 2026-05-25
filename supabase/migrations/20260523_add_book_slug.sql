-- Cache the Hardcover slug so we can deep-link to hardcover.app/books/<slug>
-- from any page that already has the book row, without re-querying Hardcover.

alter table public.books
  add column hardcover_slug text;
