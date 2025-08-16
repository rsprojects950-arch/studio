'use server';

import { revalidatePath } from 'next/cache';
import { addDoc, collection, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized.
// This is safe to run on every server action invocation.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'beyond-theory-nnj8t', // Explicitly set the project ID
  });
}


export async function createTaskAction(formData: FormData) {
  const idToken = formData.get("idToken") as string;
  if (!idToken) {
    throw new Error("Authentication token is missing. Please log in again.");
  }

  let uid: string;
  try {
    // Verify the ID token with the Firebase Admin SDK.
    // This securely confirms the user's identity.
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    uid = decodedToken.uid;
  } catch (error) {
    console.error("Error verifying ID token:", error);
    throw new Error("Invalid authentication token.");
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
      userId: uid,   // 👈 Always use the UID from the verified token
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
