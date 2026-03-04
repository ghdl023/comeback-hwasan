import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const SYSTEM_USER_ID = "system";

interface ExerciseData {
  name: string;
  muscle_group: string;
  category: string;
  parent_id: string | null;
}

async function seed() {
  const existing = await getDocs(
    query(collection(db, "exercises"), where("user_id", "==", SYSTEM_USER_ID))
  );
  if (existing.docs.length > 0) {
    console.log(`Already ${existing.docs.length} system exercises exist. Skipping seed.`);
    return;
  }

  const now = new Date().toISOString();

  const midCategories: { name: string; children: { name: string; category: string }[] }[] = [
    { name: "플라이", children: [{ name: "플라이: 머신", category: "machine" }] },
    { name: "벤치 프레스", children: [
      { name: "벤치 프레스: 길로틴", category: "barbell" },
      { name: "벤치 프레스: 바벨", category: "barbell" },
    ]},
    { name: "풀오버", children: [
      { name: "풀오버: 스트레이트 암", category: "machine" },
      { name: "풀오버: 덤벨", category: "dumbbell" },
      { name: "풀오버: 가슴", category: "machine" },
    ]},
    { name: "체스트 프레스", children: [{ name: "체스트 프레스: 머신", category: "machine" }] },
    { name: "딥스", children: [{ name: "딥스: 어시스트 머신", category: "machine" }] },
    { name: "푸시업", children: [{ name: "푸시업: 맨몸", category: "bodyweight" }] },
  ];

  for (const mid of midCategories) {
    const parentDoc = await addDoc(collection(db, "exercises"), {
      user_id: SYSTEM_USER_ID,
      name: mid.name,
      category: "",
      muscle_group: "chest",
      parent_id: null,
      created_at: now,
    });
    console.log(`Created parent: ${mid.name} (${parentDoc.id})`);

    for (const child of mid.children) {
      const childDoc = await addDoc(collection(db, "exercises"), {
        user_id: SYSTEM_USER_ID,
        name: child.name,
        category: child.category,
        muscle_group: "chest",
        parent_id: parentDoc.id,
        created_at: now,
      });
      console.log(`  Created child: ${child.name} (${childDoc.id})`);
    }
  }

  console.log("Seed complete!");
}

seed().catch(console.error);
