import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./config";
import type { AppUser, Exercise, Workout, WorkoutSet } from "@/lib/types";

function serializeDoc<T>(id: string, data: DocumentData): T {
  const serialized: Record<string, unknown> = { id };
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Timestamp) {
      serialized[key] = value.toDate().toISOString();
    } else {
      serialized[key] = value;
    }
  }
  return serialized as T;
}

export async function getUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return serializeDoc<AppUser>(snap.id, snap.data());
}

export async function upsertUserOnLogin(userData: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}): Promise<AppUser> {
  const ref = doc(db, "users", userData.uid);
  const snap = await getDoc(ref);
  const now = new Date().toISOString();

  if (snap.exists()) {
    await updateDoc(ref, { last_login_at: now });
    const updated = await getDoc(ref);
    return serializeDoc<AppUser>(updated.id, updated.data()!);
  }

  const newUser = {
    uid: userData.uid,
    email: userData.email || "",
    display_name: userData.displayName || null,
    photo_url: userData.photoURL || null,
    created_at: now,
    last_login_at: now,
  };
  await setDoc(ref, newUser);
  return { ...newUser } as AppUser;
}

export async function getExercises(userId: string): Promise<Exercise[]> {
  const q = query(
    collection(db, "exercises"),
    where("user_id", "==", userId),
    orderBy("name")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => serializeDoc<Exercise>(d.id, d.data()));
}

export async function addExercise(
  data: Omit<Exercise, "id" | "created_at">
): Promise<Exercise> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, "exercises"), {
    ...data,
    created_at: now,
  });
  return { id: docRef.id, ...data, created_at: now } as Exercise;
}

export async function updateExercise(
  id: string,
  data: Partial<Pick<Exercise, "name" | "category" | "muscle_group">>
): Promise<Exercise> {
  const ref = doc(db, "exercises", id);
  await updateDoc(ref, data);
  const snap = await getDoc(ref);
  return serializeDoc<Exercise>(snap.id, snap.data()!);
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
  return snap.docs.map((d) => serializeDoc<Workout>(d.id, d.data()));
}

export async function getWorkout(id: string, userId: string): Promise<Workout | null> {
  const snap = await getDoc(doc(db, "workouts", id));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.user_id !== userId) return null;
  return serializeDoc<Workout>(snap.id, data);
}

export async function addWorkout(
  data: Omit<Workout, "id" | "created_at">
): Promise<Workout> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, "workouts"), {
    ...data,
    created_at: now,
  });
  return { id: docRef.id, ...data, created_at: now } as Workout;
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

export async function getWorkoutSets(workoutId: string): Promise<WorkoutSet[]> {
  const q = query(
    collection(db, "workout_sets"),
    where("workout_id", "==", workoutId),
    orderBy("set_number")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => serializeDoc<WorkoutSet>(d.id, d.data()));
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
      allSets.push(serializeDoc<WorkoutSet>(d.id, d.data()))
    );
  }
  return allSets;
}

export async function addWorkoutSets(
  sets: Omit<WorkoutSet, "id" | "created_at">[]
): Promise<void> {
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  for (const s of sets) {
    const ref = doc(collection(db, "workout_sets"));
    batch.set(ref, { ...s, created_at: now });
  }
  await batch.commit();
}
