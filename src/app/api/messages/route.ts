
import { NextResponse } from 'next/server';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, Timestamp, getDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Message } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');

    let q;
    if (since) {
        // Firestore Timestamps can be tricky, so we'll convert the ISO string from the client
        // back to a JavaScript Date object, then to a Firestore Timestamp for the query.
        const sinceDate = new Date(since);
        q = query(collection(db, 'messages'), where('createdAt', '>', Timestamp.fromDate(sinceDate)), orderBy('createdAt', 'asc'));
    } else {
        // Initial load: get the last 50 messages
        q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(50));
    }
    
    const querySnapshot = await getDocs(q);
    const messages: Omit<Message, 'createdAt'>[] & { createdAt: any } = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
            id: doc.id,
            text: data.text,
            userId: data.userId,
            userName: data.userName,
            userAvatar: data.userAvatar,
            createdAt: data.createdAt,
        });
    });

    // For initial load, reverse the array to show newest messages last
    if (!since) {
        messages.reverse();
    }

    // Convert Timestamps to ISO strings for JSON serialization
    const serializableMessages = messages.map(msg => ({
      ...msg,
      createdAt: (msg.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
    }));

    return NextResponse.json(serializableMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { text, userId, userName, userAvatar } = await request.json();
    if (!text || !userId || !userName) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const docRef = await addDoc(collection(db, 'messages'), {
      text,
      userId,
      userName,
      userAvatar,
      createdAt: serverTimestamp(),
    });

    const newDoc = await getDoc(docRef);
    const newMessage = newDoc.data();

    const serializableMessage = {
      id: newDoc.id,
      ...newMessage,
      createdAt: (newMessage?.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
    };

    return NextResponse.json(serializableMessage, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
