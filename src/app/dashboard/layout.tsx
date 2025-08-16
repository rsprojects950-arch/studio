
'use client';

import { AppSidebar, AppSidebarTrigger } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useAuth } from '@/context/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useCallback, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { Message } from '@/lib/types';
import { UnreadCountProvider } from '@/context/unread-count-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const lastMessageTimestamp = useRef<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleNewMessages = useCallback((newMessages: Message[]) => {
    if (newMessages.length > 0 && profile?.username) {
       // Filter out messages from the current user
      const otherUserMessages = newMessages.filter(msg => msg.userId !== user?.uid);

      if (pathname !== '/dashboard/chat') {
        setUnreadCount(prev => prev + otherUserMessages.length);
      }

      const mentionRegex = new RegExp(`@${profile.username}(\\s|$)`, 'i');
      otherUserMessages.forEach(msg => {
        // Don't notify if user is on chat page
        if (mentionRegex.test(msg.text) && pathname !== '/dashboard/chat') {
          toast({
            title: "You were mentioned!",
            description: `${msg.username}: "${msg.text.substring(0, 50)}..."`,
          });
        }
      });
    }
  }, [user?.uid, profile?.username, toast, pathname]);

  const pollMessagesForNotifications = useCallback(async () => {
    if (!user || !profile?.username) return;
    
    try {
        const url = `/api/messages?since=${encodeURIComponent(lastMessageTimestamp.current || new Date(Date.now() - 10000).toISOString())}`;
        const response = await fetch(url);
        if (!response.ok) return;
        
        const newMessages: Message[] = await response.json();

        if (newMessages.length > 0) {
            handleNewMessages(newMessages);
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg) {
                lastMessageTimestamp.current = lastMsg.createdAt;
            }
        } else if (!lastMessageTimestamp.current) {
            lastMessageTimestamp.current = new Date().toISOString();
        }
    } catch (error) {
         // Fail silently
    }
  }, [user, profile?.username, handleNewMessages]);

  useEffect(() => {
    const interval = setInterval(() => {
        pollMessagesForNotifications();
    }, 7000); // Poll every 7 seconds

    return () => clearInterval(interval);
  }, [pollMessagesForNotifications]);


  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

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
        <AppSidebar unreadCount={unreadCount} />
        <SidebarInset>
          <header className="p-4 md:p-2 flex items-center gap-2 md:hidden sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
            <AppSidebarTrigger />
            <h1 className="font-semibold">Beyond Theory</h1>
          </header>
          <div className="flex-1">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </UnreadCountProvider>
  );
}
