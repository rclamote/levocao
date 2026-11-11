-- Dog explorer accounts, attribution and points.
-- This migration is additive, but also narrows legacy "authenticated" admin
-- policies now that normal visitors can authenticate.

create table if not exists public.dog_explorers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  photo_path text,
  bio text check (bio is null or char_length(btrim(bio)) <= 160),
  is_public boolean not null default true,
  points_total integer not null default 0 check (points_total >= 0),
  points_month integer not null default 0 check (points_month >= 0),
  points_month_key text,
  discovered_count integer not null default 0 check (discovered_count >= 0),
  confirmation_count integer not null default 0 check (confirmation_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dog_explorers enable row level security;

grant select (id, name, photo_path, bio, is_public, points_total, points_month,
  points_month_key, discovered_count, confirmation_count, created_at, updated_at)
  on public.dog_explorers to anon;
grant select, insert, update, delete on public.dog_explorers to authenticated;

drop policy if exists "Public can read dog explorers" on public.dog_explorers;
create policy "Public can read dog explorers"
on public.dog_explorers for select
to anon
using (is_public = true);

drop policy if exists "Authenticated can read dog explorers" on public.dog_explorers;
create policy "Authenticated can read dog explorers"
on public.dog_explorers for select
to authenticated
using (
  is_public = true
  or (select auth.uid()) = owner_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Owners can create dog explorers" on public.dog_explorers;
create policy "Owners can create dog explorers"
on public.dog_explorers for insert
to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can update dog explorers" on public.dog_explorers;
create policy "Owners can update dog explorers"
on public.dog_explorers for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can delete dog explorers" on public.dog_explorers;
create policy "Owners can delete dog explorers"
on public.dog_explorers for delete
to authenticated
using ((select auth.uid()) = owner_id);

alter table public.suggestions
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists dog_explorer_id uuid references public.dog_explorers(id) on delete set null;

alter table public.place_confirmations
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists dog_explorer_id uuid references public.dog_explorers(id) on delete set null;

create index if not exists suggestions_dog_explorer_id_idx
  on public.suggestions(dog_explorer_id);
create index if not exists place_confirmations_dog_explorer_id_idx
  on public.place_confirmations(dog_explorer_id);

create table if not exists public.explorer_contributions (
  id bigint generated always as identity primary key,
  dog_explorer_id uuid not null references public.dog_explorers(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  place_id bigint references public.places(id) on delete set null,
  contribution_type text not null check (contribution_type in ('discovery', 'confirmation', 'correction')),
  points smallint not null check (points between 1 and 25),
  source_type text not null,
  source_id text not null,
  created_at timestamptz not null default now(),
  unique (dog_explorer_id, contribution_type, source_type, source_id)
);

alter table public.explorer_contributions enable row level security;
grant select on public.explorer_contributions to authenticated;
grant insert, update, delete on public.explorer_contributions to authenticated;
grant usage, select on sequence public.explorer_contributions_id_seq to authenticated;

drop policy if exists "Owners can read explorer contributions" on public.explorer_contributions;
create policy "Owners can read explorer contributions"
on public.explorer_contributions for select
to authenticated
using (
  (select auth.uid()) = owner_id
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Admins can manage explorer contributions" on public.explorer_contributions;
create policy "Admins can manage explorer contributions"
on public.explorer_contributions for all
to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.apply_explorer_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_month text := to_char(timezone('UTC', new.created_at), 'YYYY-MM');
begin
  update public.dog_explorers
  set
    points_total = points_total + new.points,
    points_month = case
      when points_month_key = current_month then points_month + new.points
      else new.points
    end,
    points_month_key = current_month,
    discovered_count = discovered_count + case when new.contribution_type = 'discovery' then 1 else 0 end,
    confirmation_count = confirmation_count + case when new.contribution_type = 'confirmation' then 1 else 0 end,
    updated_at = now()
  where id = new.dog_explorer_id and owner_id = new.owner_id;
  return new;
end;
$$;

revoke all on function private.apply_explorer_points() from public, anon, authenticated;

drop trigger if exists explorer_contribution_points on public.explorer_contributions;
create trigger explorer_contribution_points
after insert on public.explorer_contributions
for each row execute function private.apply_explorer_points();

create or replace function private.credit_registered_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.vote_type <> 'yes' or new.owner_id is null or new.dog_explorer_id is null then
    return new;
  end if;

  if not exists (
    select 1 from public.dog_explorers dog
    where dog.id = new.dog_explorer_id and dog.owner_id = new.owner_id
  ) then
    return new;
  end if;

  insert into public.explorer_contributions (
    dog_explorer_id, owner_id, place_id, contribution_type, points, source_type, source_id
  ) values (
    new.dog_explorer_id, new.owner_id, new.place_id, 'confirmation', 1,
    'place_confirmation', new.id::text
  ) on conflict do nothing;

  return new;
end;
$$;

revoke all on function private.credit_registered_confirmation() from public, anon, authenticated;

drop trigger if exists credit_registered_confirmation on public.place_confirmations;
create trigger credit_registered_confirmation
after insert on public.place_confirmations
for each row execute function private.credit_registered_confirmation();

-- Public dog photographs are intended to appear in rankings and profiles.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dog-explorer-photos',
  'dog-explorer-photos',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read dog explorer photos" on storage.objects;
create policy "Public can read dog explorer photos"
on storage.objects for select
to public
using (bucket_id = 'dog-explorer-photos');

drop policy if exists "Owners can upload dog explorer photos" on storage.objects;
create policy "Owners can upload dog explorer photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'dog-explorer-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Owners can update dog explorer photos" on storage.objects;
create policy "Owners can update dog explorer photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'dog-explorer-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'dog-explorer-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Owners can delete dog explorer photos" on storage.objects;
create policy "Owners can delete dog explorer photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'dog-explorer-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Logged-in visitors are no longer administrators merely because they are authenticated.
drop policy if exists "Authenticated can manage places" on public.places;
create policy "Admins can manage places"
on public.places for all
to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Authenticated can manage suggestions" on public.suggestions;
drop policy if exists "Authenticated can read suggestions" on public.suggestions;
create policy "Admins can manage suggestions"
on public.suggestions for all
to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Anyone can insert suggestions" on public.suggestions;
drop policy if exists "public can insert suggestions" on public.suggestions;
create policy "Community can insert suggestions"
on public.suggestions for insert
to anon, authenticated
with check (
  status = 'pending'
  and (
    (owner_id is null and dog_explorer_id is null)
    or (
      owner_id = (select auth.uid())
      and exists (
        select 1 from public.dog_explorers dog
        where dog.id = dog_explorer_id and dog.owner_id = (select auth.uid())
      )
    )
  )
);

drop policy if exists "Authenticated can manage place change reports" on public.place_change_reports;
create policy "Admins can manage place change reports"
on public.place_change_reports for all
to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Authenticated can read prompt events" on public.community_prompt_events;
create policy "Admins can read prompt events"
on public.community_prompt_events for select
to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Authenticated can manage confirmations" on public.place_confirmations;
create policy "Admins can manage confirmations"
on public.place_confirmations for all
to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Authenticated users can upload place photos" on storage.objects;
drop policy if exists "Authenticated users can update place photos" on storage.objects;
drop policy if exists "Admins can upload place photos" on storage.objects;
drop policy if exists "Admins can update place photos" on storage.objects;

create policy "Admins can upload place photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'place-photos'
  and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

create policy "Admins can update place photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'place-photos'
  and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  bucket_id = 'place-photos'
  and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);
