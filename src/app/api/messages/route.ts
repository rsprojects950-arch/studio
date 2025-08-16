
import { NextResponse } from 'next/server';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Message } from '@/lib/types';

export async function GET() {
  try {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'), limit(50));
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

    // Fetch the newly created document to get the server-generated timestamp
    const newDoc = await getDoc(docRef);
    const newMessage = newDoc.data();

    // Serialize the new message to be sent back to the client
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
