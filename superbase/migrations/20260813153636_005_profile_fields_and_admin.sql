/*
# Add city + avatar_url to profiles, create admin account

## Changes
1. Add `city` column to `profiles` (text, nullable) — used for
   location-based restaurant recommendations.
2. Add `avatar_url` column to `profiles` (text, nullable) — profile
   photo URL.
3. The existing `profiles_update_self` policy already allows
   `auth.uid() = id`, so users can update their own city and
   avatar_url. No new policies needed.
4. Create the admin auth user + profile row with known credentials.

## Security
- No new policies. Existing SELECT/INSERT/UPDATE policies on profiles
  remain in effect. The admin account is created via service-role SQL
  with a known email + password for the app owner to use.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS city text DEFAULT '';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT '';

-- Create the admin auth user (idempotent: only if not present).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@tableseat.app') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'a0000000-0000-0000-0000-000000000010',
      'authenticated', 'authenticated', 'admin@tableseat.app',
      crypt('admin123456', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"TableSeat Admin","phone":"+1 555 0000","role":"admin","city":""}'
    );
  END IF;
END $$;

-- Insert admin profile row if missing.
INSERT INTO profiles (id, email, full_name, phone, role, city, avatar_url)
SELECT 'a0000000-0000-0000-0000-000000000010', 'admin@tableseat.app',
       'TableSeat Admin', '+1 555 0000', 'admin', '', ''
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = 'a0000000-0000-0000-0000-000000000010');
