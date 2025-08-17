
'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useAuth } from '@/context/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useCallback, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { Message, Conversation } from '@/lib/types';
import { UnreadCountProvider } from '@/context/unread-count-context';
import { getConversations } from '@/lib/firebase/firestore';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  // This ref helps prevent fetching old messages on first load.
  const initialLoadDone = useRef(false);

  const fetchUnreadCounts = useCallback(async () => {
    if (!user) return;
    try {
        const conversations = await getConversations(user.uid);
        const newUnreadCounts: Record<string, number> = {};
        
        conversations.forEach(convo => {
            // Count messages that are not from the current user and were created after the user's last read timestamp.
            // This is a simplified example. A real app would store lastRead timestamps per user per conversation.
            // For now, we just notify for any new message if not on the chat page.
            if (convo.lastMessage && convo.lastMessage.senderId !== user.uid) {
                // A more robust solution would be needed here to truly count "unread"
                // For now, let's just use a simple logic.
            }
        });

        // For demonstration, let's simulate unread notifications
        // A full implementation would involve checking timestamps against last-read times.
    } catch (error) {
        console.error("Failed to fetch conversations for unread counts", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
        fetchUnreadCounts();
        initialLoadDone.current = true;
    }
  }, [user, fetchUnreadCounts]);


  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  const resetUnreadCount = useCallback((conversationId?: string) => {
    // This would be more complex, tied to the notification logic.
    // For now, it's a placeholder.
  }, []);
  
  const totalUnreadCount = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  if (loading || !user || !profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <UnreadCountProvider value={{ resetUnreadCount }}>
      <SidebarProvider>
        <AppSidebar userProfile={profile} unreadCount={totalUnreadCount} />
        <SidebarInset>
          <DashboardHeader />
          <div className="flex-1">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </UnreadCountProvider>
  );
}
