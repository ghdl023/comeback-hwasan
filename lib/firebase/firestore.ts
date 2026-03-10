import type { BodyRecord, CalendarSettings, Memo } from "@/lib/types";
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
    where("user_id", "in", [userId, "system"])
  );
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => serializeDoc<Exercise>(d.id, d.data()));
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

export async function getExercisesByMuscleGroup(
  userId: string,
  muscleGroup: string
): Promise<Exercise[]> {
  const q = query(
    collection(db, "exercises"),
    where("user_id", "in", [userId, "system"]),
    where("muscle_group", "==", muscleGroup),
    where("parent_id", "==", null)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => serializeDoc<Exercise>(d.id, d.data()));
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

export async function getChildExercises(
  userId: string,
  parentId: string
): Promise<Exercise[]> {
  const q = query(
    collection(db, "exercises"),
    where("user_id", "in", [userId, "system"]),
    where("parent_id", "==", parentId)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => serializeDoc<Exercise>(d.id, d.data()));
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

export async function getExerciseCountsByMuscleGroup(
  userId: string
): Promise<Record<string, number>> {
  const q = query(
    collection(db, "exercises"),
    where("user_id", "in", [userId, "system"]),
    where("parent_id", "==", null)
  );
  const snap = await getDocs(q);
  const counts: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const mg = d.data().muscle_group;
    if (mg) {
      counts[mg] = (counts[mg] || 0) + 1;
    }
  });
  return counts;
}

export async function addExercise(
  data: Omit<Exercise, "id" | "created_at">
): Promise<Exercise> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, "exercises"), {
    ...data,
    parent_id: data.parent_id ?? null,
    created_at: now,
  });
  return { id: docRef.id, ...data, parent_id: data.parent_id ?? null, created_at: now } as Exercise;
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
  return snap.docs.map((d) => {
    const w = serializeDoc<Workout>(d.id, d.data());
    if (!w.exercise_order) w.exercise_order = [];
    return w;
  });
}

export async function getWorkout(id: string, userId: string): Promise<Workout | null> {
  const snap = await getDoc(doc(db, "workouts", id));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.user_id !== userId) return null;
  const w = serializeDoc<Workout>(snap.id, data);
  if (!w.exercise_order) w.exercise_order = [];
  return w;
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

export async function updateWorkoutExerciseOrder(
  workoutId: string,
  exerciseOrder: string[]
): Promise<void> {
  const ref = doc(db, "workouts", workoutId);
  await updateDoc(ref, { exercise_order: exerciseOrder });
}

export async function deleteExerciseSetsFromWorkouts(
  workoutIds: string[],
  exerciseId: string
): Promise<void> {
  if (workoutIds.length === 0) return;
  const batch = writeBatch(db);
  for (const wId of workoutIds) {
    const q = query(
      collection(db, "workout_sets"),
      where("workout_id", "==", wId),
      where("exercise_id", "==", exerciseId)
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => batch.delete(d.ref));
  }
  await batch.commit();
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

export async function updateWorkoutSet(
  id: string,
  data: Partial<Pick<WorkoutSet, "weight" | "reps" | "rest_seconds" | "completed" | "set_number">>
): Promise<void> {
  const ref = doc(db, "workout_sets", id);
  await updateDoc(ref, data);
}

export async function deleteWorkoutSet(id: string): Promise<void> {
  await deleteDoc(doc(db, "workout_sets", id));
}

export async function addSingleWorkoutSet(
  data: Omit<WorkoutSet, "id" | "created_at">
): Promise<WorkoutSet> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, "workout_sets"), {
    ...data,
    created_at: now,
  });
  return { id: docRef.id, ...data, created_at: now };
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

function bodyRecordDocId(userId: string, date: string): string {
  return `${userId}_${date}`;
}

export async function getBodyRecord(userId: string, date: string): Promise<BodyRecord | null> {
  const docId = bodyRecordDocId(userId, date);
  const snap = await getDoc(doc(db, "body_records", docId));
  if (!snap.exists()) return null;
  return serializeDoc<BodyRecord>(snap.id, snap.data());
}

export async function saveBodyRecord(
  data: Omit<BodyRecord, "id" | "created_at">
): Promise<BodyRecord> {
  const docId = bodyRecordDocId(data.user_id, data.date);
  const ref = doc(db, "body_records", docId);
  const now = new Date().toISOString();
  await setDoc(
    ref,
    {
      ...data,
      created_at: now,
    },
    { merge: true }
  );
  return { id: docId, ...data, created_at: now };
}

export async function getLatestBodyRecord(userId: string): Promise<BodyRecord | null> {
  const q = query(
    collection(db, "body_records"),
    where("user_id", "==", userId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const records = snap.docs.map((d) => serializeDoc<BodyRecord>(d.id, d.data()));
  records.sort((a, b) => b.date.localeCompare(a.date));
  return records[0];
}

export async function getBodyRecordsByMonth(
  userId: string,
  year: number,
  month: number
): Promise<BodyRecord[]> {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const q = query(
    collection(db, "body_records"),
    where("user_id", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => serializeDoc<BodyRecord>(d.id, d.data()))
    .filter((r) => r.date.startsWith(prefix));
}

export async function getMemos(userId: string, date: string): Promise<Memo[]> {
  const q = query(
    collection(db, "memos"),
    where("user_id", "==", userId),
    where("date", "==", date)
  );
  const snap = await getDocs(q);
  const memos = snap.docs.map((d) => serializeDoc<Memo>(d.id, d.data()));
  memos.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return memos;
}

export async function addMemo(
  data: Omit<Memo, "id" | "created_at">
): Promise<Memo> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, "memos"), {
    ...data,
    created_at: now,
  });
  return { id: docRef.id, ...data, created_at: now };
}

export async function updateMemo(
  id: string,
  data: { content: string; show_on_calendar: boolean }
): Promise<void> {
  const ref = doc(db, "memos", id);
  await updateDoc(ref, data);
}

export async function deleteMemo(id: string): Promise<void> {
  await deleteDoc(doc(db, "memos", id));
}

export async function getMemosByUserMonth(
  userId: string,
  year: number,
  month: number
): Promise<Memo[]> {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const q = query(
    collection(db, "memos"),
    where("user_id", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => serializeDoc<Memo>(d.id, d.data()))
    .filter((m) => m.date.startsWith(prefix) && m.show_on_calendar);
}

export const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  fontSize: 8,
  displayOrder: ["workout", "body", "memo"],
  showDuration: true,
};

const VALID_DISPLAY_ITEMS = new Set<CalendarDisplayItem>(["workout", "body", "memo"]);

function normalizeDisplayOrder(order: unknown): CalendarDisplayItem[] {
  if (!Array.isArray(order)) return [...DEFAULT_CALENDAR_SETTINGS.displayOrder];
  const filtered = order.filter((item): item is CalendarDisplayItem => VALID_DISPLAY_ITEMS.has(item));
  const seen = new Set<CalendarDisplayItem>();
  const unique = filtered.filter((item) => {
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
  for (const item of DEFAULT_CALENDAR_SETTINGS.displayOrder) {
    if (!unique.includes(item)) unique.push(item);
  }
  return unique;
}

export async function getCalendarSettings(userId: string): Promise<CalendarSettings> {
  const ref = doc(db, "user_settings", userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ...DEFAULT_CALENDAR_SETTINGS };
  const data = snap.data();
  const fontSize = typeof data.fontSize === "number" ? Math.min(10, Math.max(6, data.fontSize)) : DEFAULT_CALENDAR_SETTINGS.fontSize;
  return {
    fontSize,
    displayOrder: normalizeDisplayOrder(data.displayOrder),
    showDuration: typeof data.showDuration === "boolean" ? data.showDuration : DEFAULT_CALENDAR_SETTINGS.showDuration,
  };
}

export async function saveCalendarSettings(userId: string, settings: CalendarSettings): Promise<void> {
  const ref = doc(db, "user_settings", userId);
  await setDoc(ref, settings, { merge: true });
}
