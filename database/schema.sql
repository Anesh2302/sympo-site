-- ═══════════════════════════════════════════════════════════════
-- Zyverse 2K26 — registrations table (Supabase / Postgres)
--
-- How to use:
--   1. Create a free project at https://supabase.com
--   2. SQL Editor → paste this file → Run
--   3. Project Settings → API → copy the URL + service_role key
--   4. Set them (locally in a .env file, and on Vercel → Settings →
--      Environment Variables):
--        SUPABASE_URL=https://xxxx.supabase.co
--        SUPABASE_SERVICE_KEY=eyJ...
--        ADMIN_KEY=your-secret-admin-key
--   The app automatically switches from the local JSON file to the
--   cloud database as soon as SUPABASE_URL + SUPABASE_SERVICE_KEY
--   are present. No code changes needed.
-- ═══════════════════════════════════════════════════════════════

create table if not exists registrations (
  id          text primary key,                 -- ZY26-XXXXX pass id
  type        text not null check (type in ('solo', 'group')),
  team_name   text,
  leader_name text not null,
  email       text not null,
  phone       text  not null,
  college     text,
  dept        text,
  year        text,
  events      text[] not null default '{}',
  members     jsonb   not null default '[]',
  created_at  timestamptz not null default now()
);

create index if not exists registrations_created_at_idx
  on registrations (created_at desc);