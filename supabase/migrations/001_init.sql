-- The Adulting Life — initial schema.
-- Run this in Supabase SQL editor (or via `supabase db push` once linked).
-- Everything lives in the `public` schema and is queried via the service role
-- key from server code. RLS is enabled but permissive to service role; the
-- app enforces per-user access at the service layer.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  avatar_url text,
  auth_provider text,                 -- 'google' | 'microsoft' | 'apple' | 'password'
  auth_provider_id text,
  password_hash text,
  password_set_token_hash text,
  password_set_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_password_set_token_hash_idx
  on public.users (password_set_token_hash)
  where password_set_token_hash is not null;

-- ---------------------------------------------------------------------------
-- categories (fixed set, seeded below)
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id text primary key,                -- 'personal' | 'health' | ...
  name text not null,
  sort_order int not null default 0
);

insert into public.categories (id, name, sort_order) values
  ('personal',    'Personal',              1),
  ('health',      'Health',                2),
  ('education',   'Education',             3),
  ('employment',  'Employment',            4),
  ('admin',       'Admin & Bookkeeping',   5)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- records
-- ---------------------------------------------------------------------------
create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category_id text not null references public.categories(id),
  title text not null,
  fields jsonb not null default '[]'::jsonb,   -- [{key, label, type, value}, ...]
  expiry_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists records_user_idx     on public.records (user_id);
create index if not exists records_category_idx on public.records (user_id, category_id);
create index if not exists records_expiry_idx   on public.records (user_id, expiry_date);

-- ---------------------------------------------------------------------------
-- file_objects (metadata; blob lives in Supabase Storage)
-- ---------------------------------------------------------------------------
create table if not exists public.file_objects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  record_id uuid references public.records(id) on delete set null,
  storage_path text not null,
  filename text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists file_objects_user_idx   on public.file_objects (user_id);
create index if not exists file_objects_record_idx on public.file_objects (record_id);

-- ---------------------------------------------------------------------------
-- content_items (educational content, keyed by category)
-- ---------------------------------------------------------------------------
create table if not exists public.content_items (
  id text primary key,                -- slug
  category_id text not null references public.categories(id),
  title text not null,
  body_md text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists content_items_category_idx
  on public.content_items (category_id, sort_order);

-- ---------------------------------------------------------------------------
-- quizzes / questions
-- ---------------------------------------------------------------------------
create table if not exists public.quizzes (
  id text primary key,
  category_id text not null references public.categories(id),
  title text not null,
  description text
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id text not null references public.quizzes(id) on delete cascade,
  prompt text not null,
  options jsonb not null,             -- [{id, text}, ...]
  correct_option_id text not null,
  sort_order int not null default 0
);

create index if not exists questions_quiz_idx on public.questions (quiz_id, sort_order);

create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  quiz_id text not null references public.quizzes(id) on delete cascade,
  score int not null,
  total int not null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists quiz_results_user_idx on public.quiz_results (user_id, quiz_id);

-- ---------------------------------------------------------------------------
-- progress items (per-user tracking of content read, quizzes completed, etc.)
-- ---------------------------------------------------------------------------
create table if not exists public.progress_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_type text not null,            -- 'content' | 'quiz'
  item_id text not null,
  status text not null default 'started',   -- 'started' | 'completed'
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create index if not exists progress_user_idx on public.progress_items (user_id);

-- ---------------------------------------------------------------------------
-- RLS: enable, but grant full access to service_role (server-only).
-- The Next.js app talks to Supabase using the service role key and
-- enforces per-user scoping in the /lib/db/* service layer.
-- ---------------------------------------------------------------------------
alter table public.users          enable row level security;
alter table public.records        enable row level security;
alter table public.file_objects   enable row level security;
alter table public.quiz_results   enable row level security;
alter table public.progress_items enable row level security;

-- service_role bypasses RLS by default; no policies are required for it to work.
-- Anon and authenticated roles get NO policies -> no access.
