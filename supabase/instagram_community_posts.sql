-- Estrutura preparada para publicações públicas encontradas com #levocao.
-- Aplicar apenas depois de rever e autorizar a alteração no Supabase.

create table if not exists public.instagram_posts (
  id bigint generated always as identity primary key,
  place_id bigint references public.places(id) on delete cascade,
  instagram_media_id text unique,
  permalink text not null unique,
  username text,
  caption text,
  media_type text check (media_type is null or media_type in ('IMAGE', 'VIDEO', 'CAROUSEL_ALBUM')),
  media_url text,
  thumbnail_url text,
  posted_at timestamptz,
  source text not null default 'hashtag' check (source in ('hashtag', 'manual')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint instagram_posts_approved_place check (status <> 'approved' or place_id is not null),
  constraint instagram_posts_permalink check (permalink ~ '^https://(www\.)?instagram\.com/(p|reel|tv)/')
);

create index if not exists instagram_posts_pending_idx
  on public.instagram_posts (created_at desc)
  where status = 'pending';

create index if not exists instagram_posts_approved_place_idx
  on public.instagram_posts (place_id, posted_at desc)
  where status = 'approved';

alter table public.instagram_posts enable row level security;

grant select on table public.instagram_posts to anon, authenticated;
grant insert, update, delete on table public.instagram_posts to authenticated;

-- O projeto tem uma única conta de gestão. Marcamo-la no app_metadata,
-- que não pode ser alterado pelo utilizador no browser.
do $$
begin
  if (select count(*) from auth.users) <> 1 then
    raise exception 'Esperava exatamente uma conta administrativa.';
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
  where id = (select id from auth.users order by created_at asc limit 1);
end $$;

drop policy if exists "Public can read approved Instagram posts" on public.instagram_posts;
create policy "Public can read approved Instagram posts"
  on public.instagram_posts
  for select
  to anon
  using (status = 'approved');

drop policy if exists "Authenticated can manage Instagram posts" on public.instagram_posts;
create policy "Authenticated can manage Instagram posts"
  on public.instagram_posts
  for all
  to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
