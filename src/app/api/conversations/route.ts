
import { NextResponse } from 'next/server';
import { getOrCreateConversation, getUserConversations } from '@/lib/firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 });
    }
    
    const conversations = await getUserConversations(userId);
    return NextResponse.json(conversations);

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

        const conversationId = await getOrCreateConversation(currentUserId, otherUserId);
        
        return NextResponse.json({ conversationId }, { status: 201 });

    } catch (error) {
        console.error('Error in POST /api/conversations:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
