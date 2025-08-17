

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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  const fetchConversations = useCallback(async () => {
    if (!user?.uid) return; // Guard against undefined user.uid
    try {
        const res = await fetch(`/api/conversations?userId=${user.uid}`);
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Could not fetch conversation data.');
        }
        
        const userConversations: Conversation[] = await res.json();
        setConversations(userConversations);
    } catch (error) {
        console.error("Failed to fetch conversations for unread counts", error);
         toast({
            variant: "destructive",
            title: "Error",
            description: (error as Error).message || "Could not fetch conversation data.",
        });
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
        fetchConversations();
        const intervalId = setInterval(fetchConversations, 15000); // Poll every 15 seconds
        return () => clearInterval(intervalId);
    }
  }, [user, fetchConversations]);


  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  const totalUnreadCount = conversations
    .filter(c => !c.isPublic)
    .reduce((acc, c) => acc + (c.unreadCount || 0), 0);

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
    <UnreadCountProvider value={{ refreshUnreadCount: fetchConversations }}>
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
