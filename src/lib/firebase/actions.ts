
'use server';

import { revalidatePath } from 'next/cache';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function createTaskAction(formData: FormData) {
  const userId = formData.get('userId') as string;
  if (!userId) {
    throw new Error('You must be logged in to create a task.');
  }

  const title = formData.get('title') as string;
  const dueDateStr = formData.get('dueDate') as string | null;

  if (!title) {
    throw new Error('Task title is required.');
  }
  
  try {
    // Base task data object.
    const taskData: {
      userId: string;
      title: string;
      status: 'ongoing';
      createdAt: any;
      dueDate?: Timestamp;
    } = {
      userId: userId,
      title: title,
      status: 'ongoing',
      createdAt: serverTimestamp(),
    };

    // Only add dueDate if the string is not null and not empty.
    // An empty string from the form would create an invalid date.
    if (dueDateStr) {
      taskData.dueDate = Timestamp.fromDate(new Date(dueDateStr));
    }

    await addDoc(collection(db, "tasks"), taskData);

  } catch (error) {
    console.error("Error adding task to Firestore:", error);
    throw new Error('Could not create task.');
  }

  revalidatePath('/dashboard/todos');
  revalidatePath('/dashboard');
}
