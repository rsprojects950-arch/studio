
'use server';

import { revalidatePath } from 'next/cache';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
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
  
  const dueDateStr = formData.get('dueDate') as string | null;
  const createdAtStr = formData.get('createdAt') as string;
  
  if (!createdAtStr) {
      throw new Error('createdAt is required.');
  }

  try {
    const taskData: {
      userId: string;
      title: string;
      status: 'ongoing';
      createdAt: Timestamp;
      dueDate?: Timestamp;
    } = {
      userId: userId,
      title: title,
      status: 'ongoing',
      createdAt: Timestamp.fromDate(new Date(createdAtStr)),
    };

    if (dueDateStr) {
      const dueDate = new Date(dueDateStr);
      if (!isNaN(dueDate.getTime())) {
        taskData.dueDate = Timestamp.fromDate(dueDate);
      }
    }
    
    await addDoc(collection(db, "tasks"), taskData);

  } catch (error) {
    console.error("Error adding task to Firestore:", error);
    // This generic error is being thrown. The 'error' object above would contain the root cause.
    throw new Error('Could not create task.');
  }

  revalidatePath('/dashboard/todos');
  revalidatePath('/dashboard');
}
