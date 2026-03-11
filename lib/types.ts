export type UserRole = "user" | "super_admin";

export interface AppUser {
  uid: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  role: UserRole;
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
  exercise_order: string[];
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

export const MUSCLE_GROUP_ICONS: Record<MuscleGroup, string> = {
  neck: "/images/목.png",
  traps: "/images/승모근.png",
  shoulders: "/images/어깨.png",
  chest: "/images/가슴.png",
  back: "/images/등.png",
  triceps: "/images/삼두.png",
  biceps: "/images/이두.png",
  forearms: "/images/전완.png",
  abs: "/images/복부.png",
  lower_back: "/images/허리.png",
  glutes: "/images/엉덩이.png",
  legs: "/images/하체.png",
  calves: "/images/종아리.png",
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

export type CalendarDisplayItem = "workout" | "body" | "memo";

export interface CalendarSettings {
  fontSize: number;
  displayOrder: CalendarDisplayItem[];
  showDuration: boolean;
  quoteIntervalSeconds: number;
}
