
'use server';

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Task } from '@/lib/types';

export async function getTasks(userId: string): Promise<Task[]> {
  if (!userId) {
    return [];
  }

  const tasksCol = collection(db, 'tasks');
  const q = query(tasksCol, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);

  const tasks: Task[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    tasks.push({
      id: doc.id,
      title: data.title,
      status: data.status,
      // Firestore timestamps need to be converted to JS Dates
      dueDate: data.dueDate ? data.dueDate.toDate() : null,
    });
  });

  return tasks;
}
