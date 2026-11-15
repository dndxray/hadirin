import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';

export type CourseData = {
  id: string;
  name: string;
  code: string;
  defaultRoom?: string;
  defaultDescription?: string;
};

export const DEFAULT_COURSES: CourseData[] = [
  {
    id: 'course-ppk',
    name: 'Pemrograman Perangkat Bergerak',
    code: 'IF184052',
    defaultRoom: 'Lab Mobile 2',
    defaultDescription: 'Praktikum Pemrograman Perangkat Bergerak / Mobile (React Native)',
  },
  {
    id: 'course-basdat',
    name: 'Praktikum Basis Data',
    code: 'IF184031',
    defaultRoom: 'Lab Komputasi 1',
    defaultDescription: 'Praktikum Basis Data dan SQL',
  },
  {
    id: 'course-jarkom',
    name: 'Praktikum Jaringan Komputer',
    code: 'IF184060',
    defaultRoom: 'Lab Jaringan',
    defaultDescription: 'Praktikum Jaringan Komputer dan Konfigurasi Router',
  },
  {
    id: 'course-pm',
    name: 'Pembelajaran Mesin',
    code: 'IF184070',
    defaultRoom: 'Lab B',
    defaultDescription: 'Praktikum Machine Learning dan Pengenalan Pola',
  },
];

export function subscribeCourses(
  onData: (courses: CourseData[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!db) {
    onData(DEFAULT_COURSES);
    return () => {};
  }

  const coursesRef = collection(db, 'courses');
  return onSnapshot(
    query(coursesRef, orderBy('name')),
    (snap) => {
      if (snap.empty) {
        onData(DEFAULT_COURSES);
      } else {
        const items = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name ?? data.courseName ?? '',
            code: data.code ?? data.courseCode ?? '',
            defaultRoom: data.defaultRoom ?? data.room,
            defaultDescription: data.defaultDescription ?? data.description,
          };
        });
        onData(items);
      }
    },
    (err) => {
      // Fallback on error or missing collection permissions
      onData(DEFAULT_COURSES);
      onError?.(err);
    },
  );
}

export async function seedCoursesIfEmpty(): Promise<void> {
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, 'courses'));
    if (snap.empty) {
      for (const course of DEFAULT_COURSES) {
        await setDoc(doc(db, 'courses', course.id), {
          name: course.name,
          code: course.code,
          defaultRoom: course.defaultRoom,
          defaultDescription: course.defaultDescription,
        });
      }
    }
  } catch {
    // Non-blocking if permissions restrict or offline
  }
}
