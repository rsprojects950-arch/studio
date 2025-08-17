

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
import { useUnreadCount } from '@/context/unread-count-context';

interface ConversationListProps {
    selectedConversation: Conversation | null;
    onSelectConversation: (conversation: Conversation) => void;
    onNewConversation: () => void;
}

export function ConversationList({ selectedConversation, onSelectConversation, onNewConversation }: ConversationListProps) {
    const { user } = useAuth();
    const { refreshUnreadCount } = useUnreadCount();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchConversations = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/conversations?userId=${user.uid}`);
            if (!res.ok) throw new Error('Failed to fetch conversations');
            const data: Conversation[] = await res.json();
            
            setConversations(prevConvos => {
                // Create a map for quick lookups
                const prevConvosMap = new Map(prevConvos.map(c => [c.id, c]));
                // Update or add new conversations
                data.forEach(newConvo => {
                    prevConvosMap.set(newConvo.id, newConvo);
                });
                const updatedConvos = Array.from(prevConvosMap.values());
                
                if (!selectedConversation && updatedConvos.length > 0) {
                     onSelectConversation(updatedConvos[0]); // Select public chat by default
                }
                return updatedConvos;
            });

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user, onSelectConversation, selectedConversation]);

    useEffect(() => {
        if (user) {
            fetchConversations();
            const interval = setInterval(fetchConversations, 5000); // Refresh every 5s
            return () => clearInterval(interval);
        }
    }, [user, fetchConversations]);
    
     useEffect(() => {
        if (refreshUnreadCount) {
             const handleRefresh = () => {
                fetchConversations();
            };
            // This is a bit of a hack to tie into the provider's value changing
            // A more robust solution might use a dedicated event emitter or callback system
            // But for this context, it will work.
            handleRefresh();
        }
    }, [refreshUnreadCount, fetchConversations]);

    return (
        <div className="w-1/4 min-w-[250px] max-w-[300px] border-r flex flex-col bg-muted/50">
            <div className="p-4 border-b">
                <Button className="w-full" onClick={onNewConversation}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    New Message
                </Button>
            </div>
            <ScrollArea className="flex-1">
                {loading && conversations.length === 0 ? (
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
                        const isSelected = selectedConversation?.id === convo.id;

                        return (
                            <div
                                key={convo.id}
                                className={cn(
                                    "flex items-start gap-3 p-3 cursor-pointer hover:bg-background transition-colors relative",
                                    isSelected && "bg-background"
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
                                        <p className={cn("font-semibold truncate", convo.unreadCount && convo.unreadCount > 0 ? "font-bold" : "")}>{displayName}</p>
                                        {convo.lastMessage && (
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(convo.lastMessage.timestamp), { addSuffix: true })}
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">{lastMessageText}</p>
                                </div>
                                 {convo.unreadCount && convo.unreadCount > 0 && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-primary rounded-full" />
                                )}
                            </div>
                        );
                    })
                )}
            </ScrollArea>
        </div>
    );
}

    