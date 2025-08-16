
import { NextResponse } from 'next/server';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Message, UserProfile } from '@/lib/types';
import { getUserProfile }from '@/lib/firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'get_users') {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users: Omit<UserProfile, 'email'>[] = [];
        usersSnapshot.forEach((doc) => {
            const data = doc.data();
            users.push({
                uid: data.uid,
                username: data.username,
                photoURL: data.photoURL
            });
        });
        return NextResponse.json(users);
    }

    const since = searchParams.get('since');
    let q;
    if (since) {
        const sinceDate = new Date(since);
        q = query(collection(db, 'messages'), where('createdAt', '>', Timestamp.fromDate(sinceDate)), orderBy('createdAt', 'asc'));
    } else {
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
            username: data.username,
            userAvatar: data.userAvatar,
            createdAt: data.createdAt,
        });
    });

    if (!since) {
        messages.reverse();
    }

    const serializableMessages = messages.map(msg => ({
      ...msg,
      createdAt: (msg.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
    }));

    return NextResponse.json(serializableMessages);
  } catch (error) {
    console.error('Error in GET /api/messages:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { text, userId } = await request.json();
    if (!text || !userId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const userProfile = await getUserProfile(userId) as UserProfile | null;

    if (!userProfile) {
        return new NextResponse('User profile not found', { status: 404 });
    }

    const messageData = {
      text,
      userId,
      username: userProfile.username,
      userAvatar: userProfile.photoURL || '',
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, 'messages'), messageData);

    const serializableMessage: Message = {
      id: docRef.id,
      text: text,
      userId: userId,
      username: userProfile.username,
      userAvatar: userProfile.photoURL || '',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(serializableMessage, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
