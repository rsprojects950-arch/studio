
'use server';

import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Task } from '@/lib/types';

export async function getTasks(userId: string): Promise<Task[]> {
  if (!userId) {
    console.error("Firestore: User ID is required to fetch tasks.");
    return [];
  }

  const tasksCol = collection(db, 'tasks');
  const q = query(tasksCol, where('userId', '==', userId), orderBy('createdAt', 'desc'));
  
  try {
    const querySnapshot = await getDocs(q);
    const tasks: Task[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      tasks.push({
        id: doc.id,
        ...data,
        // Firestore timestamps need to be converted to JS Dates
        dueDate: data.dueDate ? data.dueDate.toDate() : null,
        createdAt: data.createdAt ? data.createdAt.toDate() : null,
      } as Task);
    });
    return tasks;
  } catch (error) {
    console.error("Error fetching tasks from Firestore:", error);
    return [];
  }
}

export async function addTask(userId: string, task: { title: string; dueDate: Date | null }): Promise<string> {
  if (!userId) {
    throw new Error("User ID is required to add a task.");
  }
  try {
    const docRef = await addDoc(collection(db, "tasks"), {
      ...task,
      userId: userId,
      status: 'ongoing',
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding task to Firestore:", error);
    throw new Error("Failed to add task.");
  }
}

export async function updateTaskStatus(taskId: string, status: 'ongoing' | 'completed'): Promise<void> {
  if (!taskId) {
    throw new Error("Task ID is required to update a task.");
  }
  try {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      status: status
    });
  } catch (error) {
    console.error("Error updating task status in Firestore:", error);
    throw new Error("Failed to update task.");
  }
}

export async function deleteTask(taskId: string): Promise<void> {
    if (!taskId) {
        throw new Error("Task ID is required to delete a task.");
    }
    try {
        const taskRef = doc(db, "tasks", taskId);
        await deleteDoc(taskRef);
    } catch (error) {
        console.error("Error deleting task from Firestore:", error);
        throw new Error("Failed to delete task.");
    }
}
