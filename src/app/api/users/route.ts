
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getAllUsers, getUserByUsername } from '@/lib/firebase/firestore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (username) {
    try {
      const user = await getUserByUsername(username);
      if (user) {
        return NextResponse.json({ exists: true, email: user.email });
      } else {
        return NextResponse.json({ exists: false });
      }
    } catch (error) {
      console.error('Error checking username:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }

  try {
    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error getting all users:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
