
import { NextResponse } from 'next/server';
import { getConversations, startConversation, markConversationAsRead, deleteConversation } from '@/lib/firebase/firestore';
import type { Conversation } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

// Helper to safely convert Firestore Timestamps or other date formats to ISO strings
const toISOString = (date: any): string => {
    if (!date) return new Date(0).toISOString(); // Return epoch if null/undefined
    if (date instanceof Timestamp) {
        return date.toDate().toISOString();
    }
    // Handle raw { seconds, nanoseconds } objects that can come from Firestore
    if (typeof date === 'object' && date !== null && typeof date.seconds === 'number' && typeof date.nanoseconds === 'number') {
        return new Timestamp(date.seconds, date.nanoseconds).toDate().toISOString();
    }
    // Handle existing ISO strings or other date strings
    if (typeof date === 'string') {
        const d = new Date(date);
        if (!isNaN(d.getTime())) {
            return d.toISOString();
        }
    }
    // Fallback for any other valid Date constructor input, or return epoch if invalid
    const d = new Date(date);
    return !isNaN(d.getTime()) ? d.toISOString() : new Date(0).toISOString();
};


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ message: "Missing userId parameter" }, { status: 400 });
  }

  try {
    const conversations: Conversation[] = await getConversations(userId);
    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations from Firestore:', error);
    return NextResponse.json({ message: 'Internal Server Error: Failed to fetch conversations from database.' }, { status: 500 });
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
    
    // Ensure the returned conversation is fully serializable
    const serializableConversation = {
        ...conversation,
        createdAt: toISOString(conversation.createdAt),
        lastMessage: conversation.lastMessage
            ? { ...conversation.lastMessage, timestamp: toISOString(conversation.lastMessage.timestamp) }
            : null,
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
