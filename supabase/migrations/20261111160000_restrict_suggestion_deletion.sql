-- Only authenticated administrators may delete suggestions.
-- Existing admin ALL policy already authorizes deletion for app_metadata.role = admin.
drop policy if exists "public can delete suggestions" on public.suggestions;
