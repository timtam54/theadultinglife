-- Attach records + file_objects to a subcategory.
-- The category_id stays (denormalised) so queries can still filter by top-level
-- category without needing a join, and to keep existing rows valid.
--
-- Run after 002_subcategories.sql.

alter table public.records
  add column if not exists subcategory_id text references public.subcategories(id);

alter table public.file_objects
  add column if not exists subcategory_id text references public.subcategories(id);

create index if not exists records_subcategory_idx
  on public.records (user_id, subcategory_id);

create index if not exists file_objects_subcategory_idx
  on public.file_objects (user_id, subcategory_id);
