export interface Exercise {
  id: string;
  user_id: string;
  name: string;
  category: string;
  muscle_group: string | null;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  title: string;
  performed_at: string;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
}

export interface WorkoutSet {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  created_at: string;
}

export interface WorkoutWithSets extends Workout {
  workout_sets: (WorkoutSet & { exercise?: Exercise })[];
}

export const EXERCISE_CATEGORIES = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "cardio",
  "other",
] as const;

export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "glutes",
  "abs",
  "forearms",
  "calves",
  "full_body",
  "cardio",
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
