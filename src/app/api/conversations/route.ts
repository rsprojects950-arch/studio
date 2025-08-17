

import { NextResponse } from 'next/server';
import { getConversations, startConversation, markConversationAsRead, deleteConversation } from '@/lib/firebase/firestore';
import { auth } from '@/lib/firebase';
import { headers } from 'next/headers';
import type { Conversation } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

// Helper to safely convert a Firestore timestamp, a raw object, or a string to an ISO string
const toISOString = (date: any): string | undefined => {
  if (!date) return undefined;
  if (date instanceof Timestamp) {
    return date.toDate().toISOString();
  }
  // Handle raw { seconds, nanoseconds } objects
  if (typeof date === 'object' && typeof date.seconds === 'number' && typeof date.nanoseconds === 'number') {
    return new Timestamp(date.seconds, date.nanoseconds).toDate().toISOString();
  }
  // Handle existing ISO strings or other date strings
  if (typeof date === 'string') {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }
  // Fallback for any other valid Date constructor input
  const d = new Date(date);
  if (!isNaN(d.getTime())) {
    return d.toISOString();
  }
  return undefined;
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
        createdAt: toISOString(convo.createdAt),
        lastMessage: convo.lastMessage ? {
            ...convo.lastMessage,
            // Ensure lastMessage.timestamp is also serialized
            timestamp: toISOString(convo.lastMessage.timestamp)!,
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
        createdAt: toISOString(conversation.createdAt),
        lastMessage: conversation.lastMessage ? {
            ...conversation.lastMessage,
            timestamp: toISOString(conversation.lastMessage.timestamp)!,
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
