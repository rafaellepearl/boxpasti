-- Box Pasti: run this once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run: it skips anything that already exists.

-- Tables ------------------------------------------------------------------

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 80),
  qr_url text,
  recurring boolean not null default false,
  schedule jsonb not null default '{}'::jsonb,   -- {"Mon":{"L":true,"D":false}, ...}
  created_at timestamptz not null default now()
);

-- One row per person per meal when they differ from their weekly schedule.
-- service_key is the Rome date plus L/D, e.g. 2026-10-01-L.
create table if not exists public.overrides (
  service_key text not null check (service_key ~ '^\d{4}-\d{2}-\d{2}-[LD]$'),
  person_id uuid not null references public.people (id) on delete cascade,
  state text not null check (state in ('box', 'unbox')),
  primary key (service_key, person_id)
);

-- One row per person per meal once the kitchen has boxed it.
create table if not exists public.boxed (
  service_key text not null check (service_key ~ '^\d{4}-\d{2}-\d{2}-[LD]$'),
  person_id uuid not null references public.people (id) on delete cascade,
  boxed_at timestamptz not null default now(),
  primary key (service_key, person_id)
);

-- Row Level Security: open to the anon role on purpose (trust-based, no login).

alter table public.people enable row level security;
alter table public.overrides enable row level security;
alter table public.boxed enable row level security;

grant select, insert, update, delete on public.people, public.overrides, public.boxed to anon;

drop policy if exists "anon select people" on public.people;
drop policy if exists "anon insert people" on public.people;
drop policy if exists "anon update people" on public.people;
drop policy if exists "anon delete people" on public.people;
create policy "anon select people" on public.people for select to anon using (true);
create policy "anon insert people" on public.people for insert to anon with check (true);
create policy "anon update people" on public.people for update to anon using (true) with check (true);
create policy "anon delete people" on public.people for delete to anon using (true);

drop policy if exists "anon select overrides" on public.overrides;
drop policy if exists "anon insert overrides" on public.overrides;
drop policy if exists "anon update overrides" on public.overrides;
drop policy if exists "anon delete overrides" on public.overrides;
create policy "anon select overrides" on public.overrides for select to anon using (true);
create policy "anon insert overrides" on public.overrides for insert to anon with check (true);
create policy "anon update overrides" on public.overrides for update to anon using (true) with check (true);
create policy "anon delete overrides" on public.overrides for delete to anon using (true);

drop policy if exists "anon select boxed" on public.boxed;
drop policy if exists "anon insert boxed" on public.boxed;
drop policy if exists "anon update boxed" on public.boxed;
drop policy if exists "anon delete boxed" on public.boxed;
create policy "anon select boxed" on public.boxed for select to anon using (true);
create policy "anon insert boxed" on public.boxed for insert to anon with check (true);
create policy "anon update boxed" on public.boxed for update to anon using (true) with check (true);
create policy "anon delete boxed" on public.boxed for delete to anon using (true);

-- Realtime: every open phone updates live -----------------------------------

do $$
begin
  alter publication supabase_realtime add table public.people;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.overrides;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.boxed;
exception when duplicate_object then null;
end $$;

-- Storage: public bucket for QR images (PNG, max 2 MB) ----------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qr', 'qr', true, 2097152, array['image/png'])
on conflict (id) do nothing;

drop policy if exists "anon select qr" on storage.objects;
drop policy if exists "anon insert qr" on storage.objects;
drop policy if exists "anon update qr" on storage.objects;
drop policy if exists "anon delete qr" on storage.objects;
create policy "anon select qr" on storage.objects for select to anon using (bucket_id = 'qr');
create policy "anon insert qr" on storage.objects for insert to anon with check (bucket_id = 'qr');
create policy "anon update qr" on storage.objects for update to anon using (bucket_id = 'qr') with check (bucket_id = 'qr');
create policy "anon delete qr" on storage.objects for delete to anon using (bucket_id = 'qr');

-- Seed ------------------------------------------------------------------------
-- The real weekly schedule lists people's names, so it lives in
-- supabase/seed.local.sql, which is kept out of git. Without it the list starts
-- empty and people add themselves with "Add your QR".
