
import { NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const email = searchParams.get('email');

  if (username) {
    try {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        return NextResponse.json({ exists: true, email: userData.email });
      } else {
        return NextResponse.json({ exists: false });
      }
    } catch (error) {
      console.error('Error checking username:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }

  if (email) {
    // This part can be used in the future if needed
    return new NextResponse('Not implemented', { status: 501 });
  }

  return new NextResponse('Bad Request: username or email parameter required', { status: 400 });
}
