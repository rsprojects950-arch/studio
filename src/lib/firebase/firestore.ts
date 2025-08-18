

'use server';

import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, getDoc, Timestamp, orderBy, limit, setDoc, writeBatch, collectionGroup, documentId, count } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Task, UserProfile, ShortTermGoal, Message, Resource, ResourceLink, Note } from '@/lib/types';
import { isPast, isToday, isFuture, startOfWeek, addDays, format, isSameDay } from "date-fns";

// Helper to safely convert a Firestore timestamp, a raw object, or a string to an ISO string
const toISOString = (date: any): string => {
    if (!date) return new Date(0).toISOString(); // Return epoch if null/undefined to avoid crashes
    if (date instanceof Timestamp) {
        return date.toDate().toISOString();
    }
    // Handle raw { seconds, nanoseconds } objects that can come from Firestore
    if (typeof date === 'object' && date !== null && typeof date.seconds === 'number' && typeof date.nanoseconds === 'number') {
        return new Timestamp(date.seconds, date.nanoseconds).toDate().toISOString();
    }
    // Handle existing ISO strings or other date strings
    if (typeof date === 'string') {
        const d = new Date(date);
        if (!isNaN(d.getTime())) {
            return d.toISOString();
        }
    }
    // Fallback for any other valid Date constructor input, or return epoch if invalid
    const d = new Date(date);
    return !isNaN(d.getTime()) ? d.toISOString() : new Date(0).toISOString();
};


// USER PROFILE FUNCTIONS
export async function createUserProfile(profile: UserProfile): Promise<void> {
  const userDocRef = doc(db, 'users', profile.uid);
  // Initialize lastRead as an empty object
  const profileWithDefaults = { ...profile, lastRead: {} };
  await setDoc(userDocRef, profileWithDefaults);
}

export async function updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<void> {
  const userDocRef = doc(db, 'users', userId);
  await updateDoc(userDocRef, profileData);
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;
  try {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) return null;

    const data = userDoc.data() as UserProfile;
    // Ensure lastRead exists
    if (!data.lastRead) {
        data.lastRead = {};
    }
    return data;
  } catch (error) {
    console.error("[getUserProfile] Error:", error);
    return null;
  }
}

export async function getUserByUsername(username: string): Promise<UserProfile | null> {
    const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty ? querySnapshot.docs[0].data() as UserProfile : null;
}

export async function getAllUsers(): Promise<UserProfile[]> {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    return usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            uid: data.uid,
            username: data.username,
            email: data.email,
            photoURL: data.photoURL || null
        }
    }) as UserProfile[];
}

// TASK & GOAL FUNCTIONS
export async function getTasks(userId: string): Promise<Task[]> {
  if (!userId) return [];
  await checkAndTransferGoals(userId);
  const tasksCol = collection(db, 'tasks');
  const q = query(tasksCol, where('userId', '==', userId));
  
  try {
    const querySnapshot = await getDocs(q);
    const tasks = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dueDate: data.dueDate?.toDate() || null,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Task;
    });
    return tasks.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'completed' ? 1 : -1;
        return (a.dueDate?.getTime() || Infinity) - (b.dueDate?.getTime() || Infinity);
      });
  } catch (error) {
    console.error("[getTasks] Error:", error);
    return [];
  }
}

export async function updateTaskStatus(taskId: string, status: 'ongoing' | 'completed'): Promise<void> {
  if (!taskId) throw new Error("Task ID is required.");
  const taskRef = doc(db, "tasks", taskId);
  await updateDoc(taskRef, { status });
}

export async function deleteTask(taskId: string): Promise<void> {
    if (!taskId) throw new Error("Task ID is required.");
    await deleteDoc(doc(db, "tasks", taskId));
}

export async function getShortTermGoals(userId: string): Promise<ShortTermGoal[]> {
  if (!userId) return [];
  const goalsCol = collection(db, 'shortTermGoals');
  const q = query(goalsCol, where('userId', '==', userId), where('isTransferred', '==', false));
  const querySnapshot = await getDocs(q);
  const goals = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    dueDate: doc.data().dueDate.toDate(),
    createdAt: doc.data().createdAt.toDate(),
  } as ShortTermGoal));
  return goals.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

async function getAllShortTermGoals(userId: string): Promise<ShortTermGoal[]> {
  if (!userId) return [];
  const goalsCol = collection(db, 'shortTermGoals');
  const q = query(goalsCol, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  const goals = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    dueDate: doc.data().dueDate.toDate(),
    createdAt: doc.data().createdAt.toDate(),
  } as ShortTermGoal));
  return goals;
}

export async function checkAndTransferGoals(userId: string) {
  if (!userId) return;
  const goalsCol = collection(db, 'shortTermGoals');
  const today = new Date();
  const q = query(goalsCol, where('userId', '==', userId), where('isTransferred', '==', false));
  
  const dueGoalsSnapshot = await getDocs(q);
  const dueGoals = dueGoalsSnapshot.docs.filter(d => d.data().dueDate.toDate() <= today);

  if (dueGoals.length === 0) return;

  const batch = writeBatch(db);
  dueGoals.forEach(goalDoc => {
    const goalData = goalDoc.data();
    const newTaskRef = doc(collection(db, 'tasks'));
    batch.set(newTaskRef, {
      userId: userId,
      title: goalData.title,
      status: 'ongoing',
      createdAt: serverTimestamp(),
      dueDate: goalData.dueDate,
      source: 'goal',
      goalId: goalDoc.id
    });
    batch.update(goalDoc.ref, { isTransferred: true });
  });

  await batch.commit();
}

// DASHBOARD STATS
export async function getDashboardStats(userId: string) {
  const tasks = await getTasks(userId);
  const goals = await getAllShortTermGoals(userId);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const missedTasksCount = tasks.filter(t => t.status !== "completed" && t.dueDate && isPast(t.dueDate) && !isToday(t.dueDate)).length;
  const accomplishmentRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const completedGoalIds = new Set(tasks.filter(t => t.source === 'goal' && t.status === 'completed').map(t => t.goalId));
  const completedGoalsCount = goals.filter(g => completedGoalIds.has(g.id)).length;

  const summary = {
    total: totalTasks.toString(),
    completed: completedTasks.toString(),
    missed: missedTasksCount.toString(),
    accomplishmentRate: `${accomplishmentRate}%`,
    totalGoals: goals.length.toString(),
    completedGoals: completedGoalsCount.toString()
  };

  const startOfThisWeek = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekData = Array.from({ length: 7 }).map((_, i) => ({
      name: format(addDays(startOfThisWeek, i), "EEE"),
      accomplished: 0,
      missed: 0,
      date: addDays(startOfThisWeek, i),
  }));

  tasks.forEach(task => {
      if (task.dueDate) {
          const weekDayEntry = weekData.find(d => isSameDay(d.date, task.dueDate));
          if (weekDayEntry) {
              if (task.status === 'completed') weekDayEntry.accomplished += 1;
              else if (isPast(task.dueDate) && !isToday(task.dueDate)) weekDayEntry.missed += 1;
          }
      }
  });
  
  const relevantTasks = tasks
    .filter(task => task.status === 'ongoing' && (!task.dueDate || isFuture(task.dueDate) || isToday(task.dueDate) || isPast(task.dueDate)))
    .sort((a, b) => (a.dueDate?.getTime() || Infinity) - (b.dueDate?.getTime() || Infinity))
    .slice(0, 3);
  
  return { summary, progressChartData: weekData.map(({date, ...rest}) => rest), relevantTasks };
}

export async function getMessages({ conversationId, since, lastId }: { conversationId: string, since?: string | null, lastId?: string | null }): Promise<Message[]> {
    if (conversationId !== 'public') {
        return [];
    }
    const messagesCol = collection(db, 'messages');
    let q;

    if (lastId) {
        const lastDocSnap = await getDoc(doc(messagesCol, lastId));
        q = query(messagesCol, orderBy('createdAt', 'desc'), limit(20), where('createdAt', '<', lastDocSnap.data()?.createdAt || serverTimestamp()));
    } else if (since) {
        q = query(messagesCol, where('createdAt', '>', Timestamp.fromDate(new Date(since))), orderBy('createdAt', 'asc'));
    } else {
        q = query(messagesCol, orderBy('createdAt', 'desc'), limit(20));
    }
    
    const querySnapshot = await getDocs(q);
    const messages: Message[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: toISOString(doc.data().createdAt),
    } as Message));

    if (!since) messages.reverse();

    return messages;
}

export async function addMessage({ conversationId, text, userId, replyTo, resourceLinks }: { conversationId: string, text: string; userId: string; replyTo: any; resourceLinks: ResourceLink[] | null }): Promise<Message> {
    if (conversationId !== 'public') {
        throw new Error("Can only send messages to public chat.");
    }
    const userProfile = await getUserProfile(userId);
    if (!userProfile) throw new Error('User profile not found');

    const messagesColRef = collection(db, 'messages');
    
    const messageData: { [key: string]: any } = {
      text,
      userId,
      username: userProfile.username,
      userAvatar: userProfile.photoURL || '',
      createdAt: serverTimestamp(),
      ...(replyTo && { replyToId: replyTo.id, replyToText: replyTo.text, replyToUsername: replyTo.username }),
      ...(resourceLinks && { resourceLinks }),
    };
    
    const docRef = await addDoc(messagesColRef, messageData);
    
    const newDocSnap = await getDoc(docRef);
    const newDocData = newDocSnap.data();
    
    return {
      id: docRef.id,
      text: text,
      userId: userId,
      username: userProfile.username,
      userAvatar: userProfile.photoURL || '',
      conversationId: conversationId,
      createdAt: toISOString(newDocData?.createdAt),
      ...(replyTo && { replyToId: replyTo.id, replyToText: replyTo.text, replyToUsername: replyTo.username }),
      ...(resourceLinks && { resourceLinks }),
    };
}


export async function deleteMessage(conversationId: string, messageId: string, userId: string): Promise<void> {
    const messageRef = doc(db, 'messages', messageId);

    const messageSnap = await getDoc(messageRef);
    if (!messageSnap.exists() || messageSnap.data().userId !== userId) {
        throw new Error("You can only delete your own messages.");
    }
    
    await deleteDoc(messageRef);
}

// RESOURCE FUNCTIONS
export async function searchResources(queryText: string): Promise<(Resource & { id: string })[]> {
    const resourcesCol = collection(db, 'resources');
    const q = queryText 
        ? query(resourcesCol, where('title_lowercase', '>=', queryText.toLowerCase()), where('title_lowercase', '<=', queryText.toLowerCase() + '\uf8ff'))
        : query(resourcesCol, orderBy('createdAt', 'desc'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const createdAtDate = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
        return { 
            id: doc.id,
            ...data,
            createdAt: createdAtDate.toISOString(),
        } as (Resource & { id: string })
    });
}
    
// NOTE FUNCTIONS
export async function getNotes(userId: string): Promise<Note[]> {
  if (!userId) return [];
  const notesCol = collection(db, 'notes');
  // This is the corrected query without the problematic orderBy clause.
  const q = query(notesCol, where('userId', '==', userId));
  
  try {
    const querySnapshot = await getDocs(q);
    const notes = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: toISOString(data.createdAt),
        updatedAt: toISOString(data.updatedAt),
      } as Note;
    });
    // This now performs the sorting in the code, after the data is fetched.
    return notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    console.error("[getNotes] Error:", error);
    // The query should no longer fail silently, but we keep the catch block for safety.
    return [];
  }
}

// GENERIC GETTERS
export async function getResource(resourceId: string): Promise<Resource | null> {
    if (!resourceId) return null;
    const resourceRef = doc(db, 'resources', resourceId);
    const resourceSnap = await getDoc(resourceRef);
    return resourceSnap.exists() ? resourceSnap.data() as Resource : null;
}
