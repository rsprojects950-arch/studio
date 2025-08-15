
'use server';

import { revalidatePath } from 'next/cache';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function createTaskAction(formData: FormData) {
  const userId = formData.get('userId') as string;
  if (!userId) {
    throw new Error('You must be logged in to create a task.');
  }

  const title = formData.get('title') as string;
  if (!title) {
    throw new Error('Task title is required.');
  }
  
  try {
    // Radically simplified: only save the essential fields to test the core functionality.
    await addDoc(collection(db, "tasks"), {
      userId: userId,
      title: title,
      status: 'ongoing',
      createdAt: serverTimestamp(),
    });

  } catch (error) {
    console.error("Error adding task to Firestore:", error);
    // This generic error is being thrown. The 'error' object above would contain the root cause.
    throw new Error('Could not create task.');
  }

  revalidatePath('/dashboard/todos');
  revalidatePath('/dashboard');
}
