
import { NextResponse } from 'next/server';
import { getConversations, startConversation, markConversationAsRead, deleteConversation } from '@/lib/firebase/firestore';
import { auth } from '@/lib/firebase';
import { headers } from 'next/headers';
import type { Conversation } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 });
    }

    // The getConversations function now handles all serialization
    const conversations: Conversation[] = await getConversations(userId);
    return NextResponse.json(conversations);

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
    
    // The startConversation function now handles all serialization
    const conversation = await startConversation(currentUserId, otherUserId);
    
    return NextResponse.json(conversation, { status: 201 });

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

    