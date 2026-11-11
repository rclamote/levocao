-- Explorer profiles may only belong to ordinary users, never admin accounts.
drop policy if exists "Owners can create dog explorers" on public.dog_explorers;
create policy "Owners can create dog explorers"
on public.dog_explorers for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
  and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') <> 'admin'
);

-- Guard crediting against admin-owned profiles even if an API bypasses the UI.
create or replace function private.apply_explorer_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_month text := to_char(timezone('UTC', new.created_at), 'YYYY-MM');
begin
  if exists (
    select 1 from auth.users u
    where u.id = new.owner_id
      and u.raw_app_meta_data ->> 'role' = 'admin'
  ) then
    raise exception 'Admin accounts cannot earn Explorer points';
  end if;
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
