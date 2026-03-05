export interface AppUser {
  uid: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  created_at: string;
  last_login_at: string;
}

export interface Exercise {
  id: string;
  user_id: string;
  name: string;
  category: string;
  muscle_group: string | null;
  parent_id: string | null;
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
  rest_seconds: number | null;
  completed: boolean;
  created_at: string;
}

export interface WorkoutWithSets extends Workout {
  workout_sets: (WorkoutSet & { exercise?: Exercise })[];
}

export interface BodyRecord {
  id: string;
  user_id: string;
  date: string;
  weight: number | null;
  skeletal_muscle: number | null;
  body_fat: number | null;
  created_at: string;
}

export interface Memo {
  id: string;
  user_id: string;
  date: string;
  content: string;
  show_on_calendar: boolean;
  created_at: string;
}

export const MUSCLE_GROUPS = [
  "neck",
  "traps",
  "shoulders",
  "chest",
  "back",
  "triceps",
  "biceps",
  "forearms",
  "abs",
  "lower_back",
  "glutes",
  "legs",
  "calves",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  neck: "목",
  traps: "승모근",
  shoulders: "어깨",
  chest: "가슴",
  back: "등",
  triceps: "삼두",
  biceps: "이두",
  forearms: "전완",
  abs: "복부",
  lower_back: "허리",
  glutes: "엉덩이",
  legs: "하체",
  calves: "종아리",
};


export const EXERCISE_CATEGORIES = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "cardio",
  "other",
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];
