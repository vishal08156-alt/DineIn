/*
# Set vishal08156@gmail.com as the sole admin account

## Changes
1. Delete the old admin auth user (admin@tableseat.app) and its
   profile row — this removes the old admin login entirely.
2. Promote the existing vishal08156@gmail.com account to admin:
   - Update the profile row role to 'admin'.
   - Update the auth user's password to amaze@5859.
   - Update raw_user_meta_data role to 'admin' (used by RLS policies).

## Security
- After this migration there is exactly one admin account.
- Admin role is stored in both profiles.role and raw_user_meta_data
  so RLS policies that check (auth.jwt() -> 'user_metadata' ->> 'role')
  = 'admin' will work correctly.
- No policy changes needed.
*/

-- Remove old admin profile row
DELETE FROM profiles WHERE email = 'admin@tableseat.app';

-- Remove old admin auth user
DELETE FROM auth.users WHERE email = 'admin@tableseat.app';

-- Update password for vishal08156@gmail.com
UPDATE auth.users
  SET encrypted_password = crypt('amaze@5859', gen_salt('bf')),
      raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{role}',
        '"admin"'
      ),
      updated_at = now()
WHERE email = 'vishal08156@gmail.com';

-- Promote profile to admin
UPDATE profiles
  SET role = 'admin',
      full_name = COALESCE(NULLIF(full_name, ''), 'Vishal')
WHERE email = 'vishal08156@gmail.com';