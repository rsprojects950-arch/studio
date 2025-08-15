
'use server';

import { revalidatePath } from 'next/cache';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';

export async function createTaskAction(formData: FormData) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be logged in to create a task.');
  }

  const title = formData.get('title') as string;
  const dueDate = formData.get('dueDate') as string;

  if (!title) {
    throw new Error('Task title is required.');
  }
  
  try {
    const taskData: {
      userId: string;
      title: string;
      status: 'ongoing';
      createdAt: any;
      dueDate?: Timestamp | null;
    } = {
      userId: user.uid,
      title: title,
      status: 'ongoing',
      createdAt: serverTimestamp(),
    };

    if (dueDate) {
      taskData.dueDate = Timestamp.fromDate(new Date(dueDate));
    } else {
      taskData.dueDate = null;
    }

    await addDoc(collection(db, "tasks"), taskData);

  } catch (error) {
    console.error("Error adding task to Firestore:", error);
    throw new Error('Could not create task.');
  }

  revalidatePath('/dashboard/todos');
}
