-- Cover foreign keys used by explorer ownership and contribution lookups.

create index if not exists dog_explorers_owner_id_idx
  on public.dog_explorers(owner_id);

create index if not exists explorer_contributions_owner_id_idx
  on public.explorer_contributions(owner_id);

create index if not exists explorer_contributions_place_id_idx
  on public.explorer_contributions(place_id);

create index if not exists place_confirmations_owner_id_idx
  on public.place_confirmations(owner_id);

create index if not exists suggestions_owner_id_idx
  on public.suggestions(owner_id);
