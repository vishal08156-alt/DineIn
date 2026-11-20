/*
# Remove extra admin account ezhil@gmail.com

## Changes
1. Downgrade ezhil@gmail.com from admin to customer so there is
   exactly one admin (vishal08156@gmail.com).

## Security
- This ensures only the designated owner has admin privileges.
*/

-- Downgrade ezhil to customer in profiles
UPDATE profiles SET role = 'customer' WHERE email = 'ezhil@gmail.com';

-- Also fix the JWT metadata so RLS admin policies no longer match
UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{role}',
        '"customer"'
      ),
      updated_at = now()
WHERE email = 'ezhil@gmail.com';