

'use server';

import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, getDoc, Timestamp, orderBy, limit, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Task, UserProfile, ShortTermGoal, Message, Resource, ResourceLink } from '@/lib/types';
import { isPast, isToday, isFuture, startOfWeek, addDays, format, isSameDay } from "date-fns";

export async function createUserProfile(profile: UserProfile): Promise<void> {
  const userDocRef = doc(db, 'users', profile.uid);
  await setDoc(userDocRef, profile);
}

export async function updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<void> {
  const userDocRef = doc(db, 'users', userId);
  await updateDoc(userDocRef, profileData);
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

export async function getUserByUsername(username: string): Promise<UserProfile | null> {
    const q = query(collection(db, 'users'), where('username', '==', username));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as UserProfile;
    }
    return null;
}

export async function getAllUsers(): Promise<Pick<UserProfile, 'uid' | 'username' | 'photoURL'>[]> {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users: Pick<UserProfile, 'uid' | 'username' | 'photoURL'>[] = [];
    usersSnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
            uid: data.uid,
            username: data.username,
            photoURL: data.photoURL || null
        });
    });
    return users;
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


export async function getMessages({ since, lastId }: { since?: string | null, lastId?: string | null }): Promise<Message[]> {
    let q;
    let baseQuery = collection(db, 'messages');
    
    if (lastId) {
        // "Load More" scenario
        const lastDocSnap = await getDoc(doc(db, 'messages', lastId));
        q = query(baseQuery, orderBy('createdAt', 'desc'), limit(20), where('createdAt', '<', lastDocSnap.data()?.createdAt || serverTimestamp()));
    } else if (since) {
        // Polling for new messages
        const sinceDate = new Date(since);
        q = query(baseQuery, where('createdAt', '>', Timestamp.fromDate(sinceDate)), orderBy('createdAt', 'asc'));
    } else {
        // Initial load
        q = query(baseQuery, orderBy('createdAt', 'desc'), limit(20));
    }
    
    const querySnapshot = await getDocs(q);
    const messages: Message[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();
        messages.push({
            id: doc.id,
            text: data.text,
            userId: data.userId,
            username: data.username,
            userAvatar: data.userAvatar,
            createdAt: createdAt,
            replyToId: data.replyToId,
            replyToText: data.replyToText,
            replyToUsername: data.replyToUsername,
            resourceLinks: data.resourceLinks,
        });
    });

    // Don't reverse for polling since we want them in ascending order
    if (lastId || !since) {
        messages.reverse();
    }

    return messages;
}

export async function addMessage({ text, userId, replyTo, resourceLinks }: { text: string; userId: string; replyTo: any; resourceLinks: ResourceLink[] | null }): Promise<Message> {
    const userProfile = await getUserProfile(userId) as UserProfile | null;

    if (!userProfile) {
        throw new Error('User profile not found');
    }

    const messageData: { [key: string]: any } = {
      text,
      userId,
      username: userProfile.username,
      userAvatar: userProfile.photoURL || '',
      createdAt: serverTimestamp(),
    };
    
    if (replyTo) {
        messageData.replyToId = replyTo.id;
        messageData.replyToText = replyTo.text;
        messageData.replyToUsername = replyTo.username;
    }
    
    if (resourceLinks) {
        messageData.resourceLinks = resourceLinks;
    }
    
    const docRef = await addDoc(collection(db, 'messages'), messageData);
    
    const newDocSnap = await getDoc(docRef);
    const newDocData = newDocSnap.data();
    
    const newMessage: Message = {
      id: docRef.id,
      text: text,
      userId: userId,
      username: userProfile.username,
      userAvatar: userProfile.photoURL || '',
      createdAt: newDocData?.createdAt instanceof Timestamp ? newDocData.createdAt.toDate().toISOString() : new Date().toISOString(),
       ...(replyTo && { 
        replyToId: replyTo.id,
        replyToText: replyTo.text,
        replyToUsername: replyTo.username,
      }),
      ...(resourceLinks && { resourceLinks }),
    };
    return newMessage;
}

export async function searchResources(queryText: string): Promise<Pick<Resource, 'id' | 'title' | 'type'>[]> {
    if (!queryText) return [];

    const lowerCaseQuery = queryText.toLowerCase();

    try {
        const resourcesSnapshot = await getDocs(collection(db, 'resources'));
        const allResources: Pick<Resource, 'id' | 'title' | 'type'>[] = [];

        resourcesSnapshot.forEach(doc => {
            const data = doc.data();
            // Ensure the title exists and is a string before calling toLowerCase
            if (data.title && typeof data.title === 'string' && data.title.toLowerCase().includes(lowerCaseQuery)) {
                allResources.push({ 
                    id: doc.id, 
                    title: data.title, 
                    type: data.type 
                });
            }
        });

        // Limit the results after filtering
        return allResources.slice(0, 10);
    } catch (error) {
        console.error("Error searching resources:", error);
        return [];
    }
}

    