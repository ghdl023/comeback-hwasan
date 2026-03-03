import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";
import type { Exercise, Workout, WorkoutSet } from "@/lib/types";

export async function getExercises(userId: string): Promise<Exercise[]> {
  const q = query(
    collection(db, "exercises"),
    where("user_id", "==", userId),
    orderBy("name")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Exercise);
}

export async function addExercise(
  data: Omit<Exercise, "id" | "created_at">
): Promise<Exercise> {
  const docRef = await addDoc(collection(db, "exercises"), {
    ...data,
    created_at: Timestamp.now(),
  });
  const snap = await getDoc(docRef);
  return { id: snap.id, ...snap.data() } as Exercise;
}

export async function updateExercise(
  id: string,
  data: Partial<Pick<Exercise, "name" | "category" | "muscle_group">>
): Promise<Exercise> {
  const ref = doc(db, "exercises", id);
  await updateDoc(ref, data);
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() } as Exercise;
}

export async function deleteExercise(id: string): Promise<void> {
  await deleteDoc(doc(db, "exercises", id));
}

export async function getWorkouts(
  userId: string,
  limitCount?: number
): Promise<Workout[]> {
  let q = query(
    collection(db, "workouts"),
    where("user_id", "==", userId),
    orderBy("performed_at", "desc")
  );
  if (limitCount) {
    q = query(q, firestoreLimit(limitCount));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Workout);
}

export async function getWorkout(id: string): Promise<Workout | null> {
  const snap = await getDoc(doc(db, "workouts", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Workout;
}

export async function addWorkout(
  data: Omit<Workout, "id" | "created_at">
): Promise<Workout> {
  const docRef = await addDoc(collection(db, "workouts"), {
    ...data,
    created_at: Timestamp.now(),
  });
  const snap = await getDoc(docRef);
  return { id: snap.id, ...snap.data() } as Workout;
}

export async function deleteWorkout(id: string): Promise<void> {
  const setsQ = query(
    collection(db, "workout_sets"),
    where("workout_id", "==", id)
  );
  const setsSnap = await getDocs(setsQ);
  const batch = writeBatch(db);
  setsSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "workouts", id));
  await batch.commit();
}

export async function getWorkoutSets(workoutId?: string): Promise<WorkoutSet[]> {
  let q;
  if (workoutId) {
    q = query(
      collection(db, "workout_sets"),
      where("workout_id", "==", workoutId),
      orderBy("set_number")
    );
  } else {
    q = query(collection(db, "workout_sets"));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WorkoutSet);
}

export async function getWorkoutSetsByUser(userId: string): Promise<WorkoutSet[]> {
  const workouts = await getWorkouts(userId);
  const workoutIds = workouts.map((w) => w.id);
  if (workoutIds.length === 0) return [];

  const allSets: WorkoutSet[] = [];
  const chunkSize = 30;
  for (let i = 0; i < workoutIds.length; i += chunkSize) {
    const chunk = workoutIds.slice(i, i + chunkSize);
    const q = query(
      collection(db, "workout_sets"),
      where("workout_id", "in", chunk)
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) =>
      allSets.push({ id: d.id, ...d.data() } as WorkoutSet)
    );
  }
  return allSets;
}

export async function addWorkoutSets(
  sets: Omit<WorkoutSet, "id" | "created_at">[]
): Promise<void> {
  const batch = writeBatch(db);
  for (const s of sets) {
    const ref = doc(collection(db, "workout_sets"));
    batch.set(ref, { ...s, created_at: Timestamp.now() });
  }
  await batch.commit();
}
