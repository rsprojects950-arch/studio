
import { NextResponse } from 'next/server';
import { getMessages, addMessage, deleteMessage } from '@/lib/firebase/firestore';
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

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get('conversationId');
        const messageId = searchParams.get('messageId');
        const userId = searchParams.get('userId'); // Assuming userId is sent for authorization

        if (!conversationId || !messageId || !userId) {
            return new NextResponse('Missing required parameters', { status: 400 });
        }

        await deleteMessage(conversationId, messageId, userId);

        return new NextResponse('Message deleted successfully', { status: 200 });

    } catch (error: any) {
        console.error('Error deleting message:', error);
        return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
    }
}
