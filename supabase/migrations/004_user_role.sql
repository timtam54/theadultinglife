-- Adds a role column to users: 'u' = User (default), 's' = Superuser.
-- Superusers see the Admin menu item and can list all users.

alter table public.users
  add column if not exists role text not null default 'u'
  check (role in ('u', 's'));

create index if not exists users_role_idx on public.users (role);

-- Promote the initial superuser. Update the email if needed after running.
update public.users set role = 's' where email = 'timhams@gmail.com';

-- Retroactive Donna rule: any existing user whose email or name contains
-- 'donna' (case-insensitive) is promoted to superuser. New signups are
-- handled at insert time in lib/db/users.ts.
update public.users
  set role = 's'
  where role = 'u'
    and (email ilike '%donna%' or coalesce(name, '') ilike '%donna%');
