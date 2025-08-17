
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import type { Conversation } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MessageSquare, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
    selectedConversation: Conversation | null;
    onSelectConversation: (conversation: Conversation) => void;
    onNewConversation: () => void;
}

export function ConversationList({ selectedConversation, onSelectConversation, onNewConversation }: ConversationListProps) {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchConversations = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/conversations?userId=${user.uid}`);
            if (!res.ok) throw new Error('Failed to fetch conversations');
            const data: Conversation[] = await res.json();
            setConversations(data);

            if (!selectedConversation && data.length > 0) {
                onSelectConversation(data[0]); // Select public chat by default
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user, onSelectConversation, selectedConversation]);

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [fetchConversations]);

    return (
        <div className="w-1/4 min-w-[250px] max-w-[300px] border-r flex flex-col bg-muted/50">
            <div className="p-4 border-b">
                <Button className="w-full" onClick={onNewConversation}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    New Message
                </Button>
            </div>
            <ScrollArea className="flex-1">
                {loading ? (
                    <div className="p-2 space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                           <div key={i} className="flex items-center gap-3 p-2">
                               <Skeleton className="h-10 w-10 rounded-full" />
                               <div className="space-y-1 w-full">
                                   <Skeleton className="h-4 w-3/4" />
                                   <Skeleton className="h-3 w-1/2" />
                               </div>
                           </div>
                        ))}
                    </div>
                ) : (
                    conversations.map(convo => {
                        const otherParticipant = convo.participantsDetails?.find(p => p.uid !== user?.uid);
                        const displayName = convo.isPublic ? "Community Discussion" : otherParticipant?.username || 'Unknown User';
                        const lastMessageText = convo.lastMessage?.text || 'No messages yet...';

                        return (
                            <div
                                key={convo.id}
                                className={cn(
                                    "flex items-start gap-3 p-3 cursor-pointer hover:bg-background transition-colors",
                                    selectedConversation?.id === convo.id && "bg-background"
                                )}
                                onClick={() => onSelectConversation(convo)}
                            >
                                <Avatar className="h-10 w-10">
                                    {convo.isPublic ? (
                                        <AvatarFallback><MessageSquare /></AvatarFallback>
                                    ) : (
                                        <>
                                            <AvatarImage src={otherParticipant?.photoURL || undefined} alt={displayName} />
                                            <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                                        </>
                                    )}
                                </Avatar>
                                <div className="flex-1 truncate">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold truncate">{displayName}</p>
                                        {convo.lastMessage && (
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(convo.lastMessage.timestamp), { addSuffix: true })}
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">{lastMessageText}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </ScrollArea>
        </div>
    );
}
