
'use server';

import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, getDoc, Timestamp, orderBy, limit, setDoc, writeBatch, collectionGroup, documentId,getCountFromServer, startAfter } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Task, UserProfile, ShortTermGoal, Message, Resource, ResourceLink, Note, Conversation } from '@/lib/types';
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

export async function getMessages({ conversationId, since }: { conversationId: string, since?: string | null }): Promise<Message[]> {
    const messagesPath = conversationId === 'public'
        ? 'public-messages'
        : `conversations/${conversationId}/messages`;
    const messagesCol = collection(db, messagesPath);

    const queryConstraints = [];
    if (since) {
        const sinceDate = new Date(since);
        queryConstraints.push(where('createdAt', '>', Timestamp.fromDate(sinceDate)));
    }

    const q = query(messagesCol, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    
    let messages: Message[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        conversationId: conversationId, // Ensure conversationId is set
        createdAt: toISOString(data.createdAt),
      } as Message
    });

    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    // For initial load, if more than 50 messages are returned, take the most recent 50
    if (!since && messages.length > 50) {
        messages = messages.slice(messages.length - 50);
    }

    const userIds = [...new Set(messages.map(m => m.userId))];
    if (userIds.length === 0) return messages;
    
    // Fetch user profiles in batches of 30, which is the max for 'in' queries
    const userProfiles = new Map<string, Pick<UserProfile, 'username' | 'photoURL'>>();
    const userBatches = [];
    for (let i = 0; i < userIds.length; i += 30) {
        userBatches.push(userIds.slice(i, i + 30));
    }

    for (const batch of userBatches) {
        const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', batch));
        const usersSnapshot = await getDocs(usersQuery);
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            userProfiles.set(doc.id, { username: data.username, photoURL: data.photoURL });
        });
    }

    return messages.map(msg => {
        const profile = userProfiles.get(msg.userId);
        return {
            ...msg,
            username: profile?.username || 'Anonymous',
            userAvatar: profile?.photoURL || ''
        }
    });
}


export async function addMessage({ conversationId, text, userId, replyTo, resourceLinks }: { conversationId: string, text: string; userId: string; replyTo: any; resourceLinks: ResourceLink[] | null }): Promise<Message> {
    const userProfile = await getUserProfile(userId);
    if (!userProfile) throw new Error('User profile not found');

    const messagesPath = conversationId === 'public'
      ? 'public-messages'
      : `conversations/${conversationId}/messages`;
    
    const messagesColRef = collection(db, messagesPath);

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
    
    if (conversationId !== 'public') {
        const conversationRef = doc(db, 'conversations', conversationId);
        await updateDoc(conversationRef, { lastMessageAt: serverTimestamp() });
    }
    
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
    const messagesPath = conversationId === 'public'
        ? 'public-messages'
        : `conversations/${conversationId}/messages`;
    const messageRef = doc(db, messagesPath, messageId);

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
    return notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    console.error("[getNotes] Error:", error);
    return [];
  }
}

export async function getPublicNotes(): Promise<Note[]> {
    const notesCol = collection(db, 'notes');
    const q = query(notesCol, where('isPublic', '==', true), orderBy('updatedAt', 'desc'));

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
        return notes;
    } catch (error) {
        console.error("[getPublicNotes] Error:", error);
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

// CONVERSATION FUNCTIONS
export async function getUserConversations(userId: string): Promise<Conversation[]> {
    if (!userId) return [];
    const conversationsCol = collection(db, 'conversations');
    const q = query(conversationsCol, where('participants', 'array-contains', userId), orderBy('lastMessageAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    const userProfile = await getUserProfile(userId);
    const lastReadTimestamps = userProfile?.lastRead || {};

    const conversations = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const conversationId = doc.id;
        const otherParticipantId = data.participants.find((p: string) => p !== userId);
        const otherParticipantProfile = await getUserProfile(otherParticipantId);
        
        const lastReadTime = lastReadTimestamps[conversationId] ? Timestamp.fromMillis(new Date(lastReadTimestamps[conversationId]).getTime()) : Timestamp.fromMillis(0);
        
        const messagesPath = `conversations/${conversationId}/messages`;
        const unreadQuery = query(collection(db, messagesPath), where('createdAt', '>', lastReadTime), where('userId', '!=', userId));
        const unreadSnapshot = await getCountFromServer(unreadQuery);
        const unreadCount = unreadSnapshot.data().count;

        const messagesQuery = query(collection(db, messagesPath), orderBy('createdAt', 'desc'), limit(1));
        const lastMessageSnapshot = await getDocs(messagesQuery);
        const lastMessage = lastMessageSnapshot.empty 
            ? null 
            : { 
                id: lastMessageSnapshot.docs[0].id, 
                ...lastMessageSnapshot.docs[0].data(),
                conversationId: conversationId,
                createdAt: toISOString(lastMessageSnapshot.docs[0].data().createdAt) 
              } as Message;

        return {
            id: conversationId,
            participants: data.participants,
            participantProfiles: [otherParticipantProfile].filter(Boolean).map(p => ({ uid: p!.uid, username: p!.username, photoURL: p!.photoURL })),
            lastMessage: lastMessage,
            unreadCount
        } as Conversation;
    }));

    return conversations.filter(c => c.participantProfiles.length > 0);
}

export async function getOrCreateConversation(currentUserId: string, otherUserId: string): Promise<string> {
    const conversationsCol = collection(db, 'conversations');
    
    const conversationId = [currentUserId, otherUserId].sort().join('_');
    const conversationRef = doc(conversationsCol, conversationId);
    
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
        return conversationSnap.id;
    } else {
        await setDoc(conversationRef, {
            participants: [currentUserId, otherUserId],
            createdAt: serverTimestamp(),
            lastMessageAt: serverTimestamp(),
        });
        return conversationId;
    }
}

export async function getUnreadCount(userId: string): Promise<number> {
    if (!userId) return 0;
    const conversations = await getUserConversations(userId);
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
}

export async function markAsRead(userId: string, conversationId: string) {
    if (!userId || !conversationId) return;
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        [`lastRead.${conversationId}`]: new Date().toISOString()
    });
}

    