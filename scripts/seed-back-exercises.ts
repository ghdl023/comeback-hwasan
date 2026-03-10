import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

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
const MUSCLE_GROUP = "back";

const midCategories: { name: string; children: string[] }[] = [
  { name: "로우", children: ["T바 로우", "시티드,케이블(롱풀)", "머신,원암", "머신", "스미스 머신", "케이블,원암", "인클라인,덤벨", "원암,덤벨", "스탠딩,케이블", "인클라인,해머그립,덤벨"] },
  { name: "랫풀다운", children: ["와이드 그립", "클로즈 그립", "V바", "비하인드,와이드그립", "오버핸드", "머신", "원암"] },
  { name: "암풀다운", children: ["로프", "스트레이트"] },
  { name: "로우 로우", children: ["머신", "원암,머신"] },
  { name: "친업", children: ["어시스트", "밴드", "맨몸"] },
  { name: "와이드 풀다운", children: ["머신", "원암,머신"] },
  { name: "풀업", children: ["어시스트", "맨몸"] },
  { name: "벤트 오버 로우", children: ["원암,케이블", "바벨", "덤벨", "케이블", "리버스 그립,바벨", "로프,케이블", "리버스 그립,케이블", "밴드"] },
  { name: "풀오버", children: ["벤트 암,바벨, 등", "벤트 암,덤벨, 등", "스트레이트 암,덤벨, 등", "머신,등"] },
  { name: "하이로우", children: ["언더핸드,머신", "원암,머신", "V바,케이블", "리버스 그립,케이블", "머신"] },
  { name: "푸시다운", children: ["광배근"] },
  { name: "매달리기", children: ["매달리기"] },
];

async function seed() {
  const now = new Date().toISOString();

  for (const mid of midCategories) {
    const parentDoc = await addDoc(collection(db, "exercises"), {
      user_id: SYSTEM_USER_ID,
      name: mid.name,
      category: "",
      muscle_group: MUSCLE_GROUP,
      parent_id: null,
      created_at: now,
    });
    console.log(`Created parent: ${mid.name} (${parentDoc.id})`);

    for (const childName of mid.children) {
      const fullName = `${mid.name}: ${childName}`;
      const childDoc = await addDoc(collection(db, "exercises"), {
        user_id: SYSTEM_USER_ID,
        name: fullName,
        category: "",
        muscle_group: MUSCLE_GROUP,
        parent_id: parentDoc.id,
        created_at: now,
      });
      console.log(`  Created child: ${fullName} (${childDoc.id})`);
    }
  }

  console.log("Back exercises seed complete!");
}

seed().catch(console.error);
