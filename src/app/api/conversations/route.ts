
import { NextResponse } from 'next/server';
import { getConversations, startConversation, markConversationAsRead } from '@/lib/firebase/firestore';
import type { Conversation } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ message: "Missing userId parameter" }, { status: 400 });
  }

  try {
    const conversations: Conversation[] = await getConversations(userId);
    return NextResponse.json(conversations);
  } catch (error: any) {
    console.error('Error fetching conversations from Firestore:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error: Failed to fetch conversations from database.' }, { status: 500 });
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
    
    return NextResponse.json(conversation, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/conversations:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
