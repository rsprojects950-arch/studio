
import { NextResponse } from 'next/server';
import { getConversations, startConversation } from '@/lib/firebase/firestore';
import { auth } from '@/lib/firebase';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 });
    }

    const conversations = await getConversations(userId);
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
    
    const conversation = await startConversation(currentUserId, otherUserId);

    return NextResponse.json(conversation, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/conversations:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
