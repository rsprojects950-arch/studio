
import { NextResponse } from 'next/server';
import { getMessages, addMessage } from '@/lib/firebase/firestore';
import type { Message, ResourceLink } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const lastId = searchParams.get('lastId');
    
    const messages = await getMessages({since, lastId});

    const serializableMessages = messages.map(msg => ({
      ...msg,
      createdAt: (msg.createdAt instanceof Timestamp ? msg.createdAt.toDate() : new Date(msg.createdAt)).toISOString(),
    }));

    return NextResponse.json(serializableMessages);
  } catch (error) {
    console.error('Error in GET /api/messages:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { text, userId, replyTo, resourceLinks } = await request.json();
    if (!text || !userId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const newMessage = await addMessage({ text, userId, replyTo, resourceLinks });
    
    const serializableMessage: Message = {
      ...newMessage,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(serializableMessage, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
