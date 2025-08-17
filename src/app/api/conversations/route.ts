

import { NextResponse } from 'next/server';
import { getConversations, startConversation, markConversationAsRead, deleteConversation } from '@/lib/firebase/firestore';
import { auth } from '@/lib/firebase';
import { headers } from 'next/headers';
import type { Conversation } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

// Helper to safely convert a Firestore timestamp or a raw object to an ISO string
const toISOString = (date: any): string => {
  if (!date) return new Date(0).toISOString(); // Fallback for null/undefined
  if (date instanceof Timestamp) {
    return date.toDate().toISOString();
  }
  if (typeof date === 'string') {
    return new Date(date).toISOString();
  }
  if (typeof date === 'object' && date.seconds !== undefined) {
    return new Timestamp(date.seconds, date.nanoseconds).toDate().toISOString();
  }
  return new Date(date).toISOString(); // Final attempt for other types
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 });
    }

    const conversations: Conversation[] = await getConversations(userId);

    const serializableConversations = conversations.map(convo => ({
        ...convo,
        createdAt: convo.createdAt ? toISOString(convo.createdAt) : undefined,
        lastMessage: convo.lastMessage ? {
            ...convo.lastMessage,
            timestamp: toISOString(convo.lastMessage.timestamp),
        } : null,
    }));

    return NextResponse.json(serializableConversations);

  } catch (error) {
    console.error('Error in GET /api/conversations:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { currentUserId, otherUserId, action, conversationId } = await request.json();

    if (action === 'markAsRead') {
        if (!currentUserId || !conversationId) {
             return new NextResponse('Missing userId or conversationId for marking as read', { status: 400 });
        }
        await markConversationAsRead(currentUserId, conversationId);
        return new NextResponse('Success', { status: 200 });
    }

    if (!currentUserId || !otherUserId) {
      return new NextResponse('Missing user IDs', { status: 400 });
    }
    
    const conversation = await startConversation(currentUserId, otherUserId);
    
    const serializableConversation = {
        ...conversation,
        createdAt: conversation.createdAt ? toISOString(conversation.createdAt) : undefined,
        lastMessage: conversation.lastMessage ? {
            ...conversation.lastMessage,
            timestamp: toISOString(conversation.lastMessage.timestamp),
        } : null,
    };

    return NextResponse.json(serializableConversation, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/conversations:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get('conversationId');
        const userId = searchParams.get('userId');

        if (!conversationId || !userId) {
            return new NextResponse('Missing conversationId or userId', { status: 400 });
        }

        await deleteConversation(conversationId, userId);

        return new NextResponse('Conversation deleted successfully', { status: 200 });

    } catch (error: any) {
        console.error('Error deleting conversation:', error);
        return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
    }
}
