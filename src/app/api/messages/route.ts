
import { NextResponse } from 'next/server';
import { getMessages, addMessage } from '@/lib/firebase/firestore';
import type { Message } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const since = searchParams.get('since');
    const lastId = searchParams.get('lastId');
    
    if (!conversationId) {
      return new NextResponse('Missing conversationId', { status: 400 });
    }

    const messages = await getMessages({ conversationId, since, lastId });

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
    const { conversationId, text, userId, replyTo, resourceLinks } = await request.json();
    if (!conversationId || !text || !userId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const newMessage = await addMessage({ conversationId, text, userId, replyTo, resourceLinks });
    
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
