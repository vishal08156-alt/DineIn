/*
# Fix infinite recursion in profiles SELECT policy

## Problem
The `profiles_select_own_or_admin` policy queries the `profiles` table
inside its own USING clause to check if the current user is an admin.
Postgres evaluates RLS policies on that subquery too, causing the same
policy to fire again → infinite recursion → error 42P17.

## Fix
Read the app role from the JWT `user_metadata` (populated at signup via
`options.data.role`) instead of querying the profiles table. This breaks
the self-reference.

Also allow the `admin` role in the INSERT policy so admin signups work.
*/

DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;

-- A user can read their own profile. Admins can read all profiles.
-- App role is read from JWT user_metadata to avoid recursive self-query.
CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  );

-- A user can insert their own profile row. All three app roles allowed.
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND (role = ANY (ARRAY['customer'::text, 'owner'::text, 'admin'::text]))
  );
