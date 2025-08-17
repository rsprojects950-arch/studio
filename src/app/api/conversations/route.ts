
import { NextResponse } from 'next/server';
import { getConversations, startConversation } from '@/lib/firebase/firestore';
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
        const serializableConvo = { ...convo };
        if (serializableConvo.lastMessage && serializableConvo.lastMessage.timestamp) {
            const ts = serializableConvo.lastMessage.timestamp;
            serializableConvo.lastMessage.timestamp = (ts instanceof Timestamp ? ts.toDate() : new Date(ts)).toISOString();
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
    const { currentUserId, otherUserId } = await request.json();
    if (!currentUserId || !otherUserId) {
      return new NextResponse('Missing user IDs', { status: 400 });
    }
    
    const conversation = await startConversation(currentUserId, otherUserId);

    // Serialize Timestamps to plain strings before sending to client
    const serializableConversation = { ...conversation };
    if (serializableConversation.lastMessage && serializableConversation.lastMessage.timestamp) {
        const ts = serializableConversation.lastMessage.timestamp;
        serializableConversation.lastMessage.timestamp = (ts instanceof Timestamp ? ts.toDate() : new Date(ts)).toISOString();
    }
     // Also handle the top-level createdAt if it exists from a fresh creation
    if ((serializableConversation as any).createdAt instanceof Timestamp) {
      (serializableConversation as any).createdAt = (serializableConversation as any).createdAt.toDate().toISOString();
    }

    return NextResponse.json(serializableConversation, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/conversations:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
