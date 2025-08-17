

import { NextResponse } from 'next/server';
import { getConversations, startConversation, markConversationAsRead, deleteConversation } from '@/lib/firebase/firestore';
import { auth } from '@/lib/firebase';
import { headers } from 'next/headers';
import type { Conversation } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 });
    }

    const conversations: Conversation[] = await getConversations(userId);

    // Serialize Timestamps to plain strings before sending to client
    const serializableConversations = conversations.map(convo => {
        const serializableConvo = { ...convo } as any;
        if (serializableConvo.lastMessage && serializableConvo.lastMessage.timestamp) {
            const ts = serializableConvo.lastMessage.timestamp;
            serializableConvo.lastMessage.timestamp = (ts instanceof Timestamp ? ts.toDate() : new Date(ts)).toISOString();
        }
        // Handle both actual Timestamps and raw Firestore objects
        if (serializableConvo.createdAt) {
            if (serializableConvo.createdAt instanceof Timestamp) {
                serializableConvo.createdAt = serializableConvo.createdAt.toDate().toISOString();
            } else if (typeof serializableConvo.createdAt === 'object' && 'seconds' in serializableConvo.createdAt && serializableConvo.createdAt.seconds !== undefined) {
                 const ts = serializableConvo.createdAt;
                 serializableConvo.createdAt = new Timestamp(ts.seconds, ts.nanoseconds).toDate().toISOString();
            }
        }
        return serializableConvo;
    });

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

    // Serialize Timestamps to plain strings before sending to client
    const serializableConversation = { ...conversation } as any;
    if (serializableConversation.lastMessage && serializableConversation.lastMessage.timestamp) {
        const ts = serializableConversation.lastMessage.timestamp;
        serializableConversation.lastMessage.timestamp = (ts instanceof Timestamp ? ts.toDate() : new Date(ts)).toISOString();
    }
     // Also handle the top-level createdAt if it exists from a fresh creation
    if (serializableConversation.createdAt) {
      if (serializableConversation.createdAt instanceof Timestamp) {
        serializableConversation.createdAt = serializableConversation.createdAt.toDate().toISOString();
      } else if (typeof serializableConversation.createdAt === 'object' && 'seconds' in serializableConversation.createdAt) {
           const ts = serializableConversation.createdAt;
           serializableConversation.createdAt = new Timestamp(ts.seconds, ts.nanoseconds).toDate().toISOString();
      }
    }

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
