/*
# Add reports table and admin moderation support

## New Tables
- `reports` — stores user-submitted reports against restaurants or users.
  - `id` uuid PK
  - `reporter_id` uuid FK -> profiles.id (who filed the report)
  - `target_type` text: 'restaurant' | 'user' (what is being reported)
  - `target_id` uuid (id of the restaurant or user being reported)
  - `reason` text (short category: spam, inappropriate, fake, harassment, other)
  - `details` text (free-text explanation from reporter)
  - `status` text: 'open' | 'reviewing' | 'resolved' | 'dismissed' (default 'open')
  - `created_at` timestamptz default now()

## Security
- RLS enabled on `reports`.
- Any authenticated user can file a report (INSERT with auth.uid() = reporter_id).
- A user can see their own reports (SELECT).
- Admins can see all reports — checked via JWT user_metadata role to avoid
  the recursive self-query that broke the profiles table previously.
- Admins can update report status (UPDATE).
- No DELETE policy: reports are never hard-deleted from the client; admins
  change status instead. This preserves an audit trail.
*/

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('restaurant','user')),
  target_id uuid NOT NULL,
  reason text NOT NULL DEFAULT 'other',
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_insert_self ON reports;
CREATE POLICY reports_insert_self ON reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS reports_select_own_or_admin ON reports;
CREATE POLICY reports_select_own_or_admin ON reports
  FOR SELECT TO authenticated
  USING (
    auth.uid() = reporter_id
    OR ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  );

DROP POLICY IF EXISTS reports_update_admin ON reports;
CREATE POLICY reports_update_admin ON reports
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Index for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
