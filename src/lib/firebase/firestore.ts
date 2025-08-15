
'use server';

import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Task } from '@/lib/types';
import { isPast, isToday, isFuture, startOfWeek, addDays, format, isSameDay } from "date-fns";


export async function getTasks(userId: string): Promise<Task[]> {
  if (!userId) {
    console.error("Firestore: User ID is required to fetch tasks.");
    return [];
  }

  const tasksCol = collection(db, 'tasks');
  const q = query(tasksCol, where('userId', '==', userId));
  
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
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(), // Fallback for older tasks
      } as Task);
    });
    // Manual sort on the server after fetching
    return tasks.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'completed' ? 1 : -1;
        }
        const aDate = a.dueDate ? a.dueDate.getTime() : Infinity;
        const bDate = b.dueDate ? b.dueDate.getTime() : Infinity;
        return aDate - bDate;
      });
  } catch (error) {
    console.error("Error fetching tasks from Firestore:", error);
    return [];
  }
}

export async function getDashboardStats(userId: string) {
  const tasks = await getTasks(userId);
  
  // Summary Stats Calculation
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const overdueTasks = tasks.filter(
    (task) => task.status !== "completed" && task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate)
  ).length;

  const accomplishmentRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const summary = {
    total: totalTasks.toString(),
    completed: completedTasks.toString(),
    missed: overdueTasks.toString(),
    accomplishmentRate: `${accomplishmentRate}%`,
  };

  // Progress Chart Data Calculation
  const today = new Date();
  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });

  const weekData = Array.from({ length: 7 }).map((_, i) => {
      const day = addDays(startOfThisWeek, i);
      return {
          name: format(day, "EEE"),
          accomplished: 0,
          missed: 0,
          date: day,
      };
  });

  tasks.forEach(task => {
      if (task.dueDate) {
          const taskDueDate = task.dueDate;
          const weekDayEntry = weekData.find(d => isSameDay(d.date, taskDueDate));

          if (weekDayEntry) {
              if (task.status === 'completed') {
                  weekDayEntry.accomplished += 1;
              } else if (task.status === 'ongoing' && isPast(taskDueDate) && !isToday(taskDueDate)) {
                  weekDayEntry.missed += 1;
              }
          }
      }
  });
  
  const progressChartData = weekData.map(({date, ...rest}) => rest);

  // Upcoming Tasks Calculation
  const upcomingTasks = tasks
    .filter(task => task.status === 'ongoing' && task.dueDate && (isFuture(task.dueDate) || isToday(task.dueDate)))
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 3);
  
  return { summary, progressChartData, upcomingTasks };
}


export async function addTask(userId: string, task: { title: string; dueDate: Date | null }): Promise<Task> {
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
    
    // Fetch the document we just created to get the server-generated timestamp
    const newDocSnapshot = await getDoc(docRef);
    const data = newDocSnapshot.data();

    if (!data) {
        throw new Error("Failed to retrieve new task after creation.");
    }

    return {
        id: newDocSnapshot.id,
        title: data.title,
        status: data.status,
        dueDate: data.dueDate ? data.dueDate.toDate() : null,
        createdAt: data.createdAt.toDate(),
        userId: data.userId,
    };
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
