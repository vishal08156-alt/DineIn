/*
# Block admin role in self-signup INSERT policy

## Changes
1. Replace the profiles INSERT policy so only 'customer' and 'owner'
   roles are allowed — 'admin' is rejected at the database level.
   This prevents anyone from creating an admin account through the
   signup API, even if they bypass the UI.

## Security
- The only admin account is the one created directly in the database
  by the project owner (vishal08156@gmail.com).
- No data is lost — only the policy predicate changes.
*/

DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;

CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND role IN ('customer', 'owner')
  );