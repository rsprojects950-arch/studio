
'use server';

import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, getDoc, Timestamp, orderBy, limit, setDoc, writeBatch } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile, type User } from 'firebase/auth';
import type { Task, UserProfile, ShortTermGoal } from '@/lib/types';
import { isPast, isToday, isFuture, startOfWeek, addDays, format, isSameDay } from "date-fns";

export async function createUserProfile(profile: UserProfile): Promise<void> {
  const userDocRef = doc(db, 'users', profile.uid);
  await setDoc(userDocRef, profile);
}

export async function updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<void> {
  const userDocRef = doc(db, 'users', userId);
  await updateDoc(userDocRef, profileData);
}

export async function uploadProfilePhoto(user: User, file: File): Promise<void> {
    if (!user) throw new Error("User not authenticated");
    if (!file) throw new Error("File not provided");

    const filePath = `profile-pictures/${user.uid}/${file.name}`;
    const storageRef = ref(storage, filePath);

    try {
        // Upload file to Firebase Storage
        const snapshot = await uploadBytes(storageRef, file);
        
        // Get the public URL of the uploaded file
        const photoURL = await getDownloadURL(snapshot.ref);

        // Update the user's profile in Firebase Auth
        await updateProfile(user, { photoURL });

        // Update the user's profile in Firestore
        await updateUserProfile(user.uid, { photoURL });
        
    } catch(error) {
        console.error("Error uploading profile photo:", error);
        throw new Error("Failed to upload photo.");
    }
}


export async function getTasks(userId: string): Promise<Task[]> {
  if (!userId) {
    return [];
  }
  await checkAndTransferGoals(userId);

  const tasksCol = collection(db, 'tasks');
  const q = query(tasksCol, where('userId', '==', userId));
  
  try {
    const querySnapshot = await getDocs(q);

    const tasks: Task[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      const dueDate = data.dueDate instanceof Timestamp ? data.dueDate.toDate() : null;
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();

      tasks.push({
        id: doc.id,
        userId: data.userId,
        title: data.title,
        status: data.status,
        dueDate: dueDate,
        createdAt: createdAt,
        source: data.source,
        goalId: data.goalId,
      });
    });
    
    return tasks.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'completed' ? 1 : -1;
        }
        const aDate = a.dueDate ? a.dueDate.getTime() : Infinity;
        const bDate = b.dueDate ? b.dueDate.getTime() : Infinity;
        return aDate - bDate;
      });
  } catch (error) {
    console.error("[getTasks] Error fetching tasks from Firestore:", error);
    return [];
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) {
    return null;
  }
  try {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("[getUserProfile] Error fetching user profile:", error);
    return null;
  }
}

async function getAllShortTermGoals(userId: string): Promise<ShortTermGoal[]> {
  if (!userId) return [];
  const goalsCol = collection(db, 'shortTermGoals');
  const q = query(goalsCol, where('userId', '==', userId));

  try {
    const querySnapshot = await getDocs(q);
    const goals: ShortTermGoal[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      goals.push({
        id: doc.id,
        userId: data.userId,
        title: data.title,
        dueDate: data.dueDate.toDate(),
        createdAt: data.createdAt.toDate(),
        isTransferred: data.isTransferred,
      });
    });
    return goals;
  } catch (error) {
    console.error("[getAllShortTermGoals] Error fetching goals:", error);
    return [];
  }
}

export async function getDashboardStats(userId: string) {
  const tasks = await getTasks(userId);
  const goals = await getAllShortTermGoals(userId);

  // Task stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const missedTasksCount = tasks.filter(
    (task) => task.status !== "completed" && task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate)
  ).length;
  const accomplishmentRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Goal stats
  const totalGoals = goals.length;
  const completedGoalIds = new Set(tasks.filter(t => t.source === 'goal' && t.status === 'completed').map(t => t.goalId));
  const completedGoalsCount = goals.filter(g => completedGoalIds.has(g.id)).length;

  const summary = {
    total: totalTasks.toString(),
    completed: completedTasks.toString(),
    missed: missedTasksCount.toString(),
    accomplishmentRate: `${accomplishmentRate}%`,
    totalGoals: totalGoals.toString(),
    completedGoals: completedGoalsCount.toString()
  };

  // Chart data
  const today = new Date();
  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 0 }); 

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

  // Relevant tasks
  const relevantTasks = tasks
    .filter(task => {
      const isMissed = task.status === 'ongoing' && task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate);
      const isUpcoming = task.status === 'ongoing' && task.dueDate && (isFuture(task.dueDate) || isToday(task.dueDate));
      return isMissed || isUpcoming;
    })
    .sort((a, b) => (a.dueDate && b.dueDate) ? a.dueDate.getTime() - b.dueDate.getTime() : 0)
    .slice(0, 3);
  
  return { summary, progressChartData, relevantTasks };
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


export async function getShortTermGoals(userId: string): Promise<ShortTermGoal[]> {
  if (!userId) return [];
  const goalsCol = collection(db, 'shortTermGoals');
  // Query only by userId to avoid needing a composite index.
  const q = query(goalsCol, where('userId', '==', userId));

  try {
    const querySnapshot = await getDocs(q);
    const goals: ShortTermGoal[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      goals.push({
        id: doc.id,
        userId: data.userId,
        title: data.title,
        dueDate: data.dueDate.toDate(),
        createdAt: data.createdAt.toDate(),
        isTransferred: data.isTransferred,
      });
    });

    // Filter and sort in-memory
    return goals
      .filter(goal => goal.isTransferred === false)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  } catch (error) {
    console.error("[getShortTermGoals] Error fetching goals from Firestore:", error);
    return [];
  }
}

export async function checkAndTransferGoals(userId: string) {
  if (!userId) return;

  const goalsCol = collection(db, 'shortTermGoals');
  const today = new Date();
  
  // Simplified query to fetch all non-transferred goals for the user.
  const q = query(
    goalsCol, 
    where('userId', '==', userId), 
    where('isTransferred', '==', false)
  );
  
  const allGoalsSnapshot = await getDocs(q);

  if (allGoalsSnapshot.empty) {
    return;
  }

  const batch = writeBatch(db);
  let hasDueGoals = false;

  allGoalsSnapshot.forEach(goalDoc => {
    const goalData = goalDoc.data();
    const dueDate = goalData.dueDate.toDate();

    // Perform the date check in-memory.
    if (dueDate <= today) {
      hasDueGoals = true;
      // Create a new task
      const tasksColRef = collection(db, 'tasks');
      const newTaskRef = doc(tasksColRef); 
      batch.set(newTaskRef, {
        userId: userId,
        title: goalData.title,
        status: 'ongoing',
        createdAt: serverTimestamp(),
        dueDate: goalData.dueDate,
        source: 'goal',
        goalId: goalDoc.id
      });
      
      // Mark goal as transferred
      const goalRef = doc(db, 'shortTermGoals', goalDoc.id);
      batch.update(goalRef, { isTransferred: true });
    }
  });

  if (!hasDueGoals) {
    return;
  }

  try {
    await batch.commit();
  } catch (error) {
    console.error("Error transferring goals to tasks:", error);
  }
}
