-- Audit log: every page view (auth and public). Public views record IP.

create table if not exists public.audits (
  id bigserial primary key,
  user_id uuid references public.users(id) on delete set null,
  username text not null,          -- email if logged in, IP address otherwise
  page text not null,
  action text not null,            -- 'web' | 'pwa' | 'ios-safari' | 'android-chrome' | 'unknown'
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audits_username_idx on public.audits (username);
create index if not exists audits_page_idx on public.audits (page);
create index if not exists audits_created_at_idx on public.audits (created_at desc);
create index if not exists audits_user_id_idx on public.audits (user_id);

alter table public.audits enable row level security;
-- No policies for anon/authenticated → only service_role can read/write.
