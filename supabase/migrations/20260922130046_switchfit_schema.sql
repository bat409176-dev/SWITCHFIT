/*
# SWITCHFIT — Initial Schema

1. New Tables
- `workout_sessions`: Records each workout session for a user. Columns:
  - id (uuid, PK)
  - user_id (uuid, owner, defaults to auth.uid())
  - exercise_id (text, references the exercise key from the frontend library)
  - exercise_name (text)
  - reps (integer, rep count completed)
  - calories (numeric, calories burned)
  - duration_seconds (integer, active duration)
  - completed_at (timestamptz)
2. Security
- Enable RLS on workout_sessions.
- Owner-scoped CRUD: each authenticated user can only access their own session rows.
*/

CREATE TABLE IF NOT EXISTS workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id text NOT NULL,
  exercise_name text NOT NULL,
  reps integer NOT NULL DEFAULT 0,
  calories numeric NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sessions" ON workout_sessions;
CREATE POLICY "select_own_sessions" ON workout_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sessions" ON workout_sessions;
CREATE POLICY "insert_own_sessions" ON workout_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sessions" ON workout_sessions;
CREATE POLICY "update_own_sessions" ON workout_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sessions" ON workout_sessions;
CREATE POLICY "delete_own_sessions" ON workout_sessions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_completed_at ON workout_sessions(completed_at DESC);