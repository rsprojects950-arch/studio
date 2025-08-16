
'use server';

import { collection, query, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Resource } from '@/lib/types';

export async function getResources(): Promise<Resource[]> {
  const resourcesCol = collection(db, 'resources');
  const q = query(resourcesCol, orderBy('createdAt', 'desc'));
  
  try {
    const querySnapshot = await getDocs(q);

    const resources: Resource[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      const createdAtDate = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();

      resources.push({
        id: doc.id,
        title: data.title,
        url: data.url,
        category: data.category,
        type: data.type,
        description: data.description,
        submittedByUid: data.submittedByUid,
        submittedByUsername: data.submittedByUsername,
        createdAt: createdAtDate.toISOString(), // Convert to ISO string
      });
    });
    
    return resources;
  } catch (error) {
    console.error("[getResources] Error fetching resources from Firestore:", error);
    return [];
  }
}
