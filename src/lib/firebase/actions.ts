
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
    // Only add the dueDate field to the object if a valid date string is provided.
    // An empty string from the form would create an invalid date.
    if (dueDateStr && dueDateStr.trim() !== '') {
      const dueDate = new Date(dueDateStr);
      // Check if the created date is valid before converting to Timestamp
      if (!isNaN(dueDate.getTime())) {
          await addDoc(collection(db, "tasks"), {
            userId: userId,
            title: title,
            status: 'ongoing',
            createdAt: serverTimestamp(),
            dueDate: Timestamp.fromDate(dueDate),
          });
      } else {
        // The date string was invalid, so save without a due date.
        await addDoc(collection(db, "tasks"), {
          userId: userId,
          title: title,
          status: 'ongoing',
          createdAt: serverTimestamp(),
        });
      }
    } else {
      // No due date string was provided, so save without a due date.
      await addDoc(collection(db, "tasks"), {
        userId: userId,
        title: title,
        status: 'ongoing',
        createdAt: serverTimestamp(),
      });
    }

  } catch (error) {
    console.error("Error adding task to Firestore:", error);
    throw new Error('Could not create task.');
  }

  revalidatePath('/dashboard/todos');
  revalidatePath('/dashboard');
}
