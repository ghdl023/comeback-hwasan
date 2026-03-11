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

interface SeedEntry {
  muscleGroup: string;
  parentName: string;
  children: string[];
}

const exercises: SeedEntry[] = [
  { muscleGroup: "triceps", parentName: "딥스", children: ["딥스: 삼두,기본","딥스: 삼두,벤치","딥스: 삼두,어시스트","딥스: 삼두,머신"] },
  { muscleGroup: "triceps", parentName: "트라이셉스 익스텐션", children: ["트라이셉스 익스텐션: 시티드,덤벨","트라이셉스 익스텐션: 누워서,바벨","트라이셉스 익스텐션: 클로즈그립,바벨","트라이셉스 익스텐션: 누워서,원암","트라이셉스 익스텐션: 시티드,바벨","트라이셉스 익스텐션: 인클라인,바벨","트라이셉스 익스텐션: 벤치,케이블","트라이셉스 익스텐션: 누워서,안쪽,원암,덤벨","트라이셉스 익스텐션: 누워서,투암,덤벨","트라이셉스 익스텐션: 스탠딩,덤벨","트라이셉스 익스텐션: 누워서,이지바","트라이셉스 익스텐션: 인클라인,덤벨","트라이셉스 익스텐션: 원암,스탠딩","트라이셉스 익스텐션: 원암,앉아서,덤벨"] },
  { muscleGroup: "triceps", parentName: "푸시다운", children: ["푸시다운: 스트레이트바","푸시다운: 로프"] },
  { muscleGroup: "triceps", parentName: "벤치프레스", children: ["벤치프레스: 바벨,클로즈 그립","벤치프레스: 스미스 머신,클로즈 그립","벤치프레스: 바벨,리버스 그립"] },
  { muscleGroup: "triceps", parentName: "킥백", children: ["킥백: 케이블,삼두","킥백: 시티드,덤벨,양팔","킥백: 시티드,덤벨,원암","킥백: 스탠딩,양팔","킥백: 벤치무릎대고,원암"] },
  { muscleGroup: "triceps", parentName: "푸시업", children: ["푸시업: 클로즈 그립"] },
  { muscleGroup: "triceps", parentName: "Tate프레스", children: ["Tate프레스: 덤벨,원암","Tate프레스: 덤벨,양팔"] },

  { muscleGroup: "biceps", parentName: "해머컬", children: ["해머컬: 스탠딩,덤벨,양팔","해머컬: 앉아서,덤벨,양팔","해머컬: 앉아서,덤벨,번갈아가며","해머컬: 인클라인","해머컬: 인클라인,번걸아가며","해머컬: 스탠딩,번갈아가며","해머컬: 로프,케이블"] },
  { muscleGroup: "biceps", parentName: "머신 컬", children: ["머신 컬: 머신 컬","머신 컬: 번갈아가며"] },
  { muscleGroup: "biceps", parentName: "바벨 컬", children: ["바벨 컬: 스탠딩,와이드 그립","바벨 컬: 인클라인,벤치","바벨 컬: 누워서,벤치","바벨 컬: 리버스","바벨 컬: 스탠딩,클로즈 그립","바벨 컬: 이지바","바벨 컬: 이지바,클로즈 그립"] },
  { muscleGroup: "biceps", parentName: "덤벨컬", children: ["덤벨컬: 앉아서","덤벨컬: 리버스","덤벨컬: 인클라인,번갈아가며","덤벨컬: 인클라인,양팔","덤벨컬: 스탠딩,번갈아가며","덤벨컬: 스탠딩,이너","덤벨컬: 스탠딩,양팔"] },
  { muscleGroup: "biceps", parentName: "프리쳐 컬", children: ["프리쳐 컬: 덤벨,원암","프리쳐 컬: 머신","프리쳐 컬: 원암,케이블","프리쳐 컬: 양팔,케이블","프리쳐 컬: 덤벨,양팔"] },
  { muscleGroup: "biceps", parentName: "컨벤츄레이션 컬", children: ["컨벤츄레이션 컬: 앉아서,원암"] },

  { muscleGroup: "glutes", parentName: "힙 익스텐션", children: ["힙 익스텐션: 아웃 싸이"] },
  { muscleGroup: "glutes", parentName: "백 익스텐션", children: ["백 익스텐션: 리버스,인클라인","백 익스텐션: 리버스,벤치"] },
  { muscleGroup: "glutes", parentName: "킥백", children: ["킥백: 벤트","킥백: 스트레이트,밴드","킥백: 벤트,밴드","킥백: 케이블,둔근","킥백: 스트레이트"] },
  { muscleGroup: "glutes", parentName: "힙 스러스트", children: ["힙 스러스트: 머신","힙 스러스트: 바벨","힙 스러스트: 스미스 머신"] },
  { muscleGroup: "glutes", parentName: "핵 스쿼트", children: ["핵 스쿼트: 리버스"] },

  { muscleGroup: "legs", parentName: "스쿼트", children: ["스쿼트: 프리","스쿼트: 스미스 머신","스쿼트: 원 레그,덤벨","스쿼트: 덤벨","스쿼트: 맨몸","스쿼트: V스쿼트 머신","스쿼트: 고블릿,덤벨"] },
  { muscleGroup: "legs", parentName: "레그 프레스", children: ["레그 프레스: 원 레그,머신","레그 프레스: 머신","레그 프레스: 머신,수평","레그 프레스: 원레그,수평"] },
  { muscleGroup: "legs", parentName: "핵 스쿼트", children: ["핵 스쿼트: 머신","핵 스쿼트: 원레그","핵 스쿼트: 바벨","핵 스쿼트: 내로우 스탠스","핵 스쿼트: 스미스 머신"] },
  { muscleGroup: "legs", parentName: "레그 익스텐션", children: ["레그 익스텐션: 레그 익스텐션","레그 익스텐션: 원 레그"] },
  { muscleGroup: "legs", parentName: "레그 컬", children: ["레그 컬: 스탠딩,머신","레그 컬: 앉아서,머신","레그 컬: 누워서,원레그","레그 컬: 누워서"] },
  { muscleGroup: "legs", parentName: "런지", children: ["런지: 덤벨,리어","런지: 덤벨"] },
  { muscleGroup: "legs", parentName: "데드리프트", children: ["데드리프트: 덤벨","데드리프트: 바벨","데드리프트: 컨벤셔널","데드리프트: 루마니안"] },
  { muscleGroup: "legs", parentName: "이너 싸이", children: ["이너 싸이: 머신"] },

  { muscleGroup: "calves", parentName: "카프 레이즈", children: ["카프 레이즈: 바벨","카프 레이즈: 맨몸","카프 레이즈: 덤벨"] },
];

async function main() {
  const existingSnap = await getDocs(query(
    collection(db, "exercises"),
    where("user_id", "==", "system")
  ));

  const existingParentMap = new Map<string, string>();
  const existingChildNames = new Set<string>();

  existingSnap.docs.forEach(d => {
    const data = d.data();
    if (!data.parent_id) {
      existingParentMap.set(`${data.muscle_group}::${data.name}`, d.id);
    } else {
      existingChildNames.add(`${data.muscle_group}::${data.name}::${data.parent_id}`);
    }
  });

  let parentCount = 0;
  let childCount = 0;
  let skipCount = 0;
  const now = new Date().toISOString();

  for (const ex of exercises) {
    const parentKey = `${ex.muscleGroup}::${ex.parentName}`;
    let parentId: string;

    if (existingParentMap.has(parentKey)) {
      parentId = existingParentMap.get(parentKey)!;
      console.log(`  [skip parent] ${ex.parentName} (${ex.muscleGroup})`);
      skipCount++;
    } else {
      const parentRef = await addDoc(collection(db, "exercises"), {
        user_id: "system",
        name: ex.parentName,
        category: "other",
        muscle_group: ex.muscleGroup,
        parent_id: null,
        created_at: now,
      });
      parentId = parentRef.id;
      existingParentMap.set(parentKey, parentId);
      parentCount++;
      console.log(`  [+parent] ${ex.parentName} (${ex.muscleGroup}) => ${parentId}`);
    }

    for (const childName of ex.children) {
      const childKey = `${ex.muscleGroup}::${childName}::${parentId}`;
      if (existingChildNames.has(childKey)) {
        console.log(`    [skip child] ${childName}`);
        skipCount++;
        continue;
      }
      await addDoc(collection(db, "exercises"), {
        user_id: "system",
        name: childName,
        category: "other",
        muscle_group: ex.muscleGroup,
        parent_id: parentId,
        created_at: now,
      });
      existingChildNames.add(childKey);
      childCount++;
      console.log(`    [+child] ${childName}`);
    }
  }

  console.log(`\nDone! Added ${parentCount} parents, ${childCount} children. Skipped ${skipCount} existing.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
