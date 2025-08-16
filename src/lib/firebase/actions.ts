
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
    // The security of this action is enforced by Firestore Security Rules.
    // The rule `allow create: if request.auth.uid == request.resource.data.userId;`
    // ensures that a user can only create tasks for themselves. The `userId` is
    // passed from the client and validated by this rule on the backend.
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
