

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import type { Conversation } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MessageSquare, UserPlus, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useUnreadCount } from '@/context/unread-count-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

interface ConversationListProps {
    selectedConversation: Conversation | null;
    onSelectConversation: (conversation: Conversation | null) => void;
    onNewConversation: () => void;
}

export function ConversationList({ selectedConversation, onSelectConversation, onNewConversation }: ConversationListProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const { refreshUnreadCount } = useUnreadCount();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchConversations = useCallback(async (shouldSelectDefault = false) => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/conversations?userId=${user.uid}`);
            if (!res.ok) throw new Error('Failed to fetch conversations');
            const data: Conversation[] = await res.json();
            
            setConversations(data);
            
            if (shouldSelectDefault && data.length > 0) {
                 onSelectConversation(data[0]); // Select first conversation by default
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user, onSelectConversation]);

    useEffect(() => {
        if (user) {
            fetchConversations(true); // Select default on initial load
            const interval = setInterval(() => fetchConversations(false), 5000); // Just refresh list, don't re-select
            return () => clearInterval(interval);
        }
    }, [user, fetchConversations]);
    
     useEffect(() => {
        if (refreshUnreadCount) {
            const handleRefresh = () => fetchConversations(false);
            handleRefresh();
        }
    }, [refreshUnreadCount, fetchConversations]);

    const handleDeleteConversation = async (e: React.MouseEvent, conversationId: string) => {
        e.stopPropagation();
        if (!user) return;
        
        try {
            const res = await fetch('/api/conversations', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId, userId: user.uid }),
            });

            if (!res.ok) {
                const errorData = await res.text();
                throw new Error(errorData || 'Failed to delete conversation');
            }

            toast({ title: 'Conversation deleted.' });
            
            // If the deleted conversation was the selected one, clear the selection.
            if (selectedConversation?.id === conversationId) {
                onSelectConversation(null);
            }
            
            await fetchConversations(true);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };


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
                                    "flex items-start gap-3 p-3 cursor-pointer hover:bg-background transition-colors relative group/convo-item",
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
                                 {convo.unreadCount && convo.unreadCount > 0 && !isSelected && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-primary rounded-full" />
                                )}
                                {!convo.isPublic && (
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button variant="ghost" size="icon" className="h-7 w-7 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/convo-item:opacity-100" onClick={e => e.stopPropagation()}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete this entire conversation for all participants. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={(e) => handleDeleteConversation(e, convo.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                        );
                    })
                )}
            </ScrollArea>
        </div>
    );
}
