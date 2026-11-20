/*
# Fix search_path on set_updated_at trigger function

Sets an explicit, safe search_path on the `set_updated_at()` trigger
function to remove the "mutable search path" security warning. The function
body is unchanged — only the search_path is pinned to `public`.
*/

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
