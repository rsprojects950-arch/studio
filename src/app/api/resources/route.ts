
import { NextResponse } from 'next/server';
import { searchResources } from '@/lib/firebase/firestore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  // If query is null (no q param) or empty, we will search for everything.
  // The client-side logic will now handle calling this with an empty query
  // to fetch all resources.
  try {
    const resources = await searchResources(query || '');
    return NextResponse.json(resources);
  } catch (error) {
    console.error('Error searching resources:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
