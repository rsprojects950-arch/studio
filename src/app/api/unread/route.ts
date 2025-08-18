
import { NextResponse } from 'next/server';
import { getUnreadCount, markAsRead } from '@/lib/firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 });
    }

    const unreadCount = await getUnreadCount(userId);
    return NextResponse.json({ count: unreadCount });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
      const { userId, conversationId } = await request.json();
  
      if (!userId || !conversationId) {
        return new NextResponse('Missing parameters', { status: 400 });
      }
  
      await markAsRead(userId, conversationId);
      return new NextResponse('Marked as read', { status: 200 });
      
    } catch (error) {
      console.error('Error marking as read:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
}
