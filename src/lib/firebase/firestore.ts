
'use server';

import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, getDoc, Timestamp, orderBy, limit, setDoc, writeBatch, collectionGroup, documentId, count } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Task, UserProfile, ShortTermGoal, Message, Resource, ResourceLink, Note, Conversation, ParticipantDetails } from '@/lib/types';
import { isPast, isToday, isFuture, startOfWeek, addDays, format, isSameDay } from "date-fns";

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

// CHAT AND CONVERSATION FUNCTIONS

export async function getConversations(userId: string): Promise<Conversation[]> {
    if (!userId) return [];

    const currentUserProfile = await getUserProfile(userId);
    if (!currentUserProfile) return [];

    const conversationsQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', userId));
    const conversationsSnapshot = await getDocs(conversationsQuery);
    
    const participantIds = new Set<string>();
    conversationsSnapshot.docs.forEach(doc => {
        const participants = doc.data().participants as string[];
        participants.forEach(id => {
            if (id !== userId) participantIds.add(id);
        });
    });

    let participantDetails: Record<string, ParticipantDetails> = {};
    if (participantIds.size > 0) {
        const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', Array.from(participantIds)));
        const usersSnapshot = await getDocs(usersQuery);
        usersSnapshot.forEach(doc => {
            const data = doc.data() as UserProfile;
            participantDetails[doc.id] = { uid: data.uid, username: data.username, photoURL: data.photoURL || null };
        });
    }

    const conversationPromises = conversationsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const lastReadTimestamp = currentUserProfile.lastRead?.[doc.id] ? Timestamp.fromDate(new Date(currentUserProfile.lastRead[doc.id])) : Timestamp.fromDate(new Date(0));
        
        let unreadCount = 0;
        if (data.lastMessage && data.lastMessage.senderId !== userId) {
             const messagesRef = collection(db, 'conversations', doc.id, 'messages');
             const unreadQuery = query(messagesRef, where('createdAt', '>', lastReadTimestamp), where('userId', '!=', userId));
             const unreadSnapshot = await getDocs(unreadQuery);
             unreadCount = unreadSnapshot.size;
        }

        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate()?.toISOString() || new Date(0).toISOString(),
            lastMessage: data.lastMessage ? {
                ...data.lastMessage,
                timestamp: data.lastMessage.timestamp?.toDate() || new Date()
            } : null,
            participantsDetails: data.participants.map((id: string) => participantDetails[id]).filter(Boolean),
            unreadCount: unreadCount,
        } as Conversation;
    });

    const conversations = await Promise.all(conversationPromises);

    // Add public chat placeholder
    conversations.unshift({
        id: 'public',
        participants: [],
        participantsDetails: [],
        isPublic: true,
        lastMessage: null,
        unreadCount: 0,
        createdAt: new Date(0).toISOString(),
    });

    return conversations.sort((a,b) => {
        if (a.isPublic) return -1;
        if (b.isPublic) return 1;
        const aTime = a.lastMessage?.timestamp.getTime() || new Date(a.createdAt!).getTime();
        const bTime = b.lastMessage?.timestamp.getTime() || new Date(b.createdAt!).getTime();
        return bTime - aTime;
    });
}

export async function startConversation(currentUserId: string, otherUserId: string): Promise<Conversation> {
    const participants = [currentUserId, otherUserId].sort();
    const conversationId = participants.join('_');
    const conversationRef = doc(db, 'conversations', conversationId);
    
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
        const [user1Profile, user2Profile] = await Promise.all([
            getUserProfile(participants[0]),
            getUserProfile(participants[1])
        ]);

        return {
            id: conversationSnap.id,
            ...conversationSnap.data(),
            createdAt: conversationSnap.data().createdAt.toDate().toISOString(),
            participantsDetails: [user1Profile, user2Profile].map(p => ({uid: p!.uid, username: p!.username, photoURL: p!.photoURL}))
        } as Conversation;
    }

    const batch = writeBatch(db);
    const newConversationData = {
        participants: participants,
        createdAt: serverTimestamp(),
        lastMessage: null
    };
    batch.set(conversationRef, newConversationData);
    await batch.commit();

    const [user1Profile, user2Profile] = await Promise.all([
        getUserProfile(participants[0]),
        getUserProfile(participants[1])
    ]);
    
    // Fetch the just-created doc to get the server timestamp
    const newSnap = await getDoc(conversationRef);

    return {
        id: conversationId,
        ...newSnap.data(),
        createdAt: newSnap.data()?.createdAt.toDate().toISOString(),
        participantsDetails: [user1Profile, user2Profile].map(p => ({uid: p!.uid, username: p!.username, photoURL: p!.photoURL}))
    } as Conversation;
}

export async function getMessages({ conversationId, since, lastId }: { conversationId: string, since?: string | null, lastId?: string | null }): Promise<Message[]> {
    const collectionPath = conversationId === 'public' ? 'messages' : `conversations/${conversationId}/messages`;
    const messagesCol = collection(db, collectionPath);
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
        createdAt: (doc.data().createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
    } as Message));

    if (!since) messages.reverse();

    return messages;
}

export async function addMessage({ conversationId, text, userId, replyTo, resourceLinks }: { conversationId: string, text: string; userId: string; replyTo: any; resourceLinks: ResourceLink[] | null }): Promise<Message> {
    const userProfile = await getUserProfile(userId);
    if (!userProfile) throw new Error('User profile not found');

    const collectionPath = conversationId === 'public' ? 'messages' : `conversations/${conversationId}/messages`;
    const messagesColRef = collection(db, collectionPath);
    
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
    
    // Update last message on private conversation
    if (conversationId !== 'public') {
        const conversationRef = doc(db, 'conversations', conversationId);
        await updateDoc(conversationRef, {
            lastMessage: {
                text: text,
                senderId: userId,
                timestamp: serverTimestamp()
            }
        });
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
      createdAt: newDocData?.createdAt instanceof Timestamp ? newDocData.createdAt.toDate().toISOString() : new Date().toISOString(),
      ...(replyTo && { replyToId: replyTo.id, replyToText: replyTo.text, replyToUsername: replyTo.username }),
      ...(resourceLinks && { resourceLinks }),
    };
}


export async function deleteMessage(conversationId: string, messageId: string, userId: string): Promise<void> {
    const collectionPath = conversationId === 'public' ? 'messages' : `conversations/${conversationId}/messages`;
    const messageRef = doc(db, collectionPath, messageId);

    const messageSnap = await getDoc(messageRef);
    if (!messageSnap.exists() || messageSnap.data().userId !== userId) {
        throw new Error("You can only delete your own messages.");
    }
    
    await deleteDoc(messageRef);

    // If it's a private chat and this was the last message, update the conversation's lastMessage
    if (conversationId !== 'public') {
        const conversationRef = doc(db, 'conversations', conversationId);
        const conversationSnap = await getDoc(conversationRef);
        if (conversationSnap.exists()) {
            const messagesQuery = query(collection(db, collectionPath), orderBy('createdAt', 'desc'), limit(1));
            const messagesSnap = await getDocs(messagesQuery);
            const newLastMessage = messagesSnap.empty ? null : {
                text: messagesSnap.docs[0].data().text,
                senderId: messagesSnap.docs[0].data().userId,
                timestamp: messagesSnap.docs[0].data().createdAt,
            };
            await updateDoc(conversationRef, { lastMessage: newLastMessage });
        }
    }
}

export async function deleteConversation(conversationId: string, userId: string): Promise<void> {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (!conversationSnap.exists() || !conversationSnap.data().participants.includes(userId)) {
        throw new Error("You are not part of this conversation.");
    }

    // Firestore does not support deleting subcollections from the server SDK directly.
    // We must fetch all message documents and delete them in a batch.
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messagesSnap = await getDocs(messagesRef);

    const batch = writeBatch(db);
    messagesSnap.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(conversationRef);

    await batch.commit();
}


// RESOURCE FUNCTIONS
export async function searchResources(queryText: string): Promise<(Resource & { id: string })[]> {
    const resourcesCol = collection(db, 'resources');
    const q = queryText 
        ? query(resourcesCol, where('title_lowercase', '>=', queryText.toLowerCase()), where('title_lowercase', '<=', queryText.toLowerCase() + '\uf8ff'))
        : query(resourcesCol, orderBy('title'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (Resource & { id: string })));
}
    
// NOTE FUNCTIONS
export async function getNotes(userId: string): Promise<Note[]> {
    if (!userId) return [];
    const notesCol = collection(db, 'notes');
    const q = query(notesCol, where('userId', '==', userId), orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate().toISOString(),
        updatedAt: doc.data().updatedAt.toDate().toISOString(),
    } as Note));
}

// GENERIC GETTERS
export async function getResource(resourceId: string): Promise<Resource | null> {
    if (!resourceId) return null;
    const resourceRef = doc(db, 'resources', resourceId);
    const resourceSnap = await getDoc(resourceRef);
    return resourceSnap.exists() ? resourceSnap.data() as Resource : null;
}

export async function markConversationAsRead(userId: string, conversationId: string): Promise<void> {
    if (!userId || !conversationId) return;
    const userRef = doc(db, 'users', userId);
    // We use dot notation to update a specific field in the map
    await updateDoc(userRef, {
        [`lastRead.${conversationId}`]: new Date().toISOString(),
    });
}
