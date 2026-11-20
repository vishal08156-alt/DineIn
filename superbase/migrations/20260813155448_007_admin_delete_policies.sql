/*
# Add admin delete policies for restaurants and profiles

## Changes
1. Add a DELETE policy on `restaurants` allowing admins to delete any
   restaurant (e.g. after reviewing reports).
2. Add DELETE policies on `profiles` allowing:
   a. Users to delete their own account.
   b. Admins to delete any user account.
3. Add an UPDATE policy on `profiles` allowing admins to update any
   profile (e.g. change role, ban a user by setting status).

## Security
- Admin role is read from JWT user_metadata to avoid the recursive
  self-query that previously broke the profiles table.
- These policies are intentionally separate from the existing
  owner-scoped policies.
*/

-- Admin can delete any restaurant
DROP POLICY IF EXISTS restaurants_delete_admin ON restaurants;
CREATE POLICY restaurants_delete_admin ON restaurants
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Users can delete their own profile
DROP POLICY IF EXISTS profiles_delete_self ON profiles;
CREATE POLICY profiles_delete_self ON profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = id);

-- Admins can delete any profile
DROP POLICY IF EXISTS profiles_delete_admin ON profiles;
CREATE POLICY profiles_delete_admin ON profiles
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Admins can update any profile
DROP POLICY IF EXISTS profiles_update_admin ON profiles;
CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
