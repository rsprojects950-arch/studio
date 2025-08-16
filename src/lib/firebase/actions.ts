
'use server';

import { revalidatePath } from 'next/cache';
import { addDoc, collection, Timestamp, serverTimestamp, updateDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Resource } from '@/lib/types';

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
      source: 'user';
    } = {
      userId: userId,
      title: title,
      status: 'ongoing',
      createdAt: serverTimestamp(),
      source: 'user',
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
      title_lowercase: title.toLowerCase(), // for searching
    });

  } catch (error) {
    console.error("Error adding resource to Firestore:", error);
    throw new Error('Could not add resource.');
  }

  revalidatePath('/dashboard/resources');
}

export async function updateResourceAction(formData: FormData) {
  const userId = formData.get('userId') as string;
  if (!userId) {
    throw new Error('You must be logged in to update a resource.');
  }

  const resourceId = formData.get('resourceId') as string;
  if (!resourceId) {
    throw new Error('Resource ID is missing.');
  }

  const resourceRef = doc(db, 'resources', resourceId);
  const resourceSnap = await getDoc(resourceRef);

  if (!resourceSnap.exists()) {
    throw new Error('Resource not found.');
  }

  const resourceData = resourceSnap.data() as Resource;
  if (resourceData.submittedByUid !== userId) {
    throw new Error('You are not authorized to edit this resource.');
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
    await updateDoc(resourceRef, {
      title,
      url,
      description,
      category,
      type,
      title_lowercase: title.toLowerCase(),
    });
  } catch (error) {
    console.error("Error updating resource in Firestore:", error);
    throw new Error('Could not update resource.');
  }
  
  revalidatePath('/dashboard/resources');
}

export async function deleteResourceAction(resourceId: string, userId: string) {
  if (!userId) {
    throw new Error('You must be logged in to delete a resource.');
  }
  if (!resourceId) {
    throw new Error('Resource ID is missing.');
  }

  const resourceRef = doc(db, 'resources', resourceId);
  const resourceSnap = await getDoc(resourceRef);

  if (!resourceSnap.exists()) {
    throw new Error('Resource not found.');
  }

  const resourceData = resourceSnap.data() as Resource;
  if (resourceData.submittedByUid !== userId) {
    throw new Error('You are not authorized to delete this resource.');
  }

  try {
    await deleteDoc(resourceRef);
  } catch (error) {
    console.error("Error deleting resource from Firestore:", error);
    throw new Error('Could not delete resource.');
  }

  revalidatePath('/dashboard/resources');
}


export async function createShortTermGoalAction(formData: FormData) {
  const userId = formData.get('userId') as string;
  if (!userId) {
    throw new Error('You must be logged in to create a goal.');
  }

  const title = formData.get('title') as string;
  if (!title) {
    throw new Error('Goal title is required.');
  }
  
  const dueDateStr = formData.get('dueDate') as string | null;
  if (!dueDateStr) {
      throw new Error('Due date is required for a goal.');
  }

  try {
    await addDoc(collection(db, "shortTermGoals"), {
      userId: userId,
      title: title,
      isTransferred: false,
      createdAt: serverTimestamp(),
      dueDate: Timestamp.fromDate(new Date(dueDateStr)),
    });
  } catch (error) {
    console.error("Error adding goal to Firestore:", error);
    throw new Error('Could not create goal.');
  }

  revalidatePath('/dashboard/goals');
}

export async function updateShortTermGoalAction(formData: FormData) {
  const userId = formData.get('userId') as string;
  if (!userId) {
    throw new Error('You must be logged in to update a goal.');
  }
  
  const goalId = formData.get('goalId') as string;
  if (!goalId) {
    throw new Error('Goal ID is missing.');
  }

  const goalRef = doc(db, 'shortTermGoals', goalId);
  const goalSnap = await getDoc(goalRef);

  if (!goalSnap.exists()) {
    throw new Error('Goal not found.');
  }

  if (goalSnap.data().userId !== userId) {
    throw new Error('You are not authorized to edit this goal.');
  }

  const title = formData.get('title') as string;
  if (!title) {
    throw new Error('Goal title is required.');
  }
  
  const dueDateStr = formData.get('dueDate') as string | null;
  if (!dueDateStr) {
      throw new Error('Due date is required for a goal.');
  }

  try {
    await updateDoc(goalRef, {
      title: title,
      dueDate: Timestamp.fromDate(new Date(dueDateStr)),
    });
  } catch (error) {
    console.error("Error updating goal in Firestore:", error);
    throw new Error('Could not update goal.');
  }

  revalidatePath('/dashboard/goals');
}


export async function deleteShortTermGoalAction(goalId: string, userId: string) {
  if (!userId) {
    throw new Error('You must be logged in to delete a goal.');
  }
  if (!goalId) {
    throw new Error('Goal ID is missing.');
  }

  const goalRef = doc(db, 'shortTermGoals', goalId);
  const goalSnap = await getDoc(goalRef);

  if (!goalSnap.exists()) {
    throw new Error('Goal not found.');
  }

  if (goalSnap.data().userId !== userId) {
    throw new Error('You are not authorized to delete this goal.');
  }

  try {
    await deleteDoc(goalRef);
  } catch (error) {
    console.error("Error deleting goal from Firestore:", error);
    throw new Error('Could not delete goal.');
  }

  revalidatePath('/dashboard/goals');
}
