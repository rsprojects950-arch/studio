
'use server';

import { revalidatePath } from 'next/cache';
import { addDoc, collection, Timestamp, serverTimestamp } from 'firebase/firestore';
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

  try {
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

    if (dueDateStr && !isNaN(new Date(dueDateStr).getTime())) {
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


export async function createResourceAction(formData: FormData) {
  const userId = formData.get('userId') as string;
  const username = formData.get('username') as string;
  if (!userId || !username) {
    throw new Error('You must be logged in to add a resource.');
  }

  const title = formData.get('title') as string;
  const url = formData.get('url') as string;
  const description = formData.get('description') as string;
  const category = formData.get('category') as string;
  const type = formData.get('type') as string;

  if (!title || !url || !description || !category || !type) {
    throw new Error('All fields are required.');
  }
  
  try {
    await addDoc(collection(db, "resources"), {
      title,
      url,
      description,
      category,
      type,
      submittedByUid: userId,
      submittedByUsername: username,
      createdAt: serverTimestamp(),
    });

  } catch (error) {
    console.error("Error adding resource to Firestore:", error);
    throw new Error('Could not add resource.');
  }

  revalidatePath('/dashboard/resources');
}
