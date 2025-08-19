
import { NextResponse } from 'next/server';
import { getOrCreateConversation, getUserConversations } from '@/lib/firebase/firestore';
import type { UserProfile } from '@/lib/types';

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
        const { currentUserId, otherUserId, currentUserProfile } = await request.json();
        if (!currentUserId || !otherUserId || !currentUserProfile) {
            return new NextResponse('Missing user IDs or profile', { status: 400 });
        }

        const newConversation = await getOrCreateConversation(currentUserId, otherUserId, currentUserProfile);
        
        return NextResponse.json(newConversation, { status: 201 });

    } catch (error) {
        console.error('Error in POST /api/conversations:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
