-- ============================================================
-- Supabase Postgres Schema for Fitness Tracker
-- Run this SQL in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1) exercises: user's exercise library
CREATE TABLE IF NOT EXISTS exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  muscle_group TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) workouts: individual workout sessions
CREATE TABLE IF NOT EXISTS workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  performed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) workout_sets: each set recorded in a workout
CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL DEFAULT 1,
  reps INTEGER,
  weight NUMERIC(6,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_performed_at ON workouts(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_id ON workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_id ON workout_sets(exercise_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

-- exercises: users can only access their own exercises
CREATE POLICY "Users can select own exercises"
  ON exercises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercises"
  ON exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercises"
  ON exercises FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercises"
  ON exercises FOR DELETE
  USING (auth.uid() = user_id);

-- workouts: users can only access their own workouts
CREATE POLICY "Users can select own workouts"
  ON workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts"
  ON workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts"
  ON workouts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts"
  ON workouts FOR DELETE
  USING (auth.uid() = user_id);

-- workout_sets: users can only access sets belonging to their workouts
CREATE POLICY "Users can select own workout_sets"
  ON workout_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_sets.workout_id
        AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own workout_sets"
  ON workout_sets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_sets.workout_id
        AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own workout_sets"
  ON workout_sets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_sets.workout_id
        AND workouts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_sets.workout_id
        AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own workout_sets"
  ON workout_sets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_sets.workout_id
        AND workouts.user_id = auth.uid()
    )
  );
