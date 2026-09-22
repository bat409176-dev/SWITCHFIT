/*
# SWITCHFIT — Switch to no-auth (single-tenant) RLS

1. Changes
- Drop existing owner-scoped policies on workout_sessions.
- Add anon+authenticated CRUD policies so the app can read/write without sign-in.
2. Security
- RLS stays enabled. Data is intentionally public/shared (no-auth app).
*/

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sessions" ON workout_sessions;
DROP POLICY IF EXISTS "insert_own_sessions" ON workout_sessions;
DROP POLICY IF EXISTS "update_own_sessions" ON workout_sessions;
DROP POLICY IF EXISTS "delete_own_sessions" ON workout_sessions;

DROP POLICY IF EXISTS "anon_select_sessions" ON workout_sessions;
CREATE POLICY "anon_select_sessions" ON workout_sessions
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sessions" ON workout_sessions;
CREATE POLICY "anon_insert_sessions" ON workout_sessions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sessions" ON workout_sessions;
CREATE POLICY "anon_update_sessions" ON workout_sessions
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sessions" ON workout_sessions;
CREATE POLICY "anon_delete_sessions" ON workout_sessions
  FOR DELETE TO anon, authenticated USING (true);

-- Remove the user_id NOT NULL constraint + FK since there is no auth
ALTER TABLE workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_user_id_fkey;
ALTER TABLE workout_sessions ALTER COLUMN user_id DROP NOT NULL;