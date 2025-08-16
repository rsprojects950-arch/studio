
'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { Message } from '@/lib/types';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const lastMessageTimestamp = useRef<string | null>(null);

  const handleNewMessages = useCallback((newMessages: Message[]) => {
    if (newMessages.length > 0 && profile?.username) {
      const mentionRegex = new RegExp(`@${profile.username}(\\s|$)`, 'i');
      newMessages.forEach(msg => {
        // Don't notify for your own messages or if user is on chat page
        if (msg.userId !== user?.uid && mentionRegex.test(msg.text) && !window.location.pathname.includes('/chat')) {
          toast({
            title: "You were mentioned!",
            description: `${msg.username}: "${msg.text.substring(0, 50)}..."`,
          });
        }
      });
    }
  }, [user?.uid, profile?.username, toast]);

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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
