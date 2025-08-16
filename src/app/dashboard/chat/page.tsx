
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import type { Message, UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, Loader2, MessageSquareReply, X } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useUnreadCount } from '@/context/unread-count-context';
import { cn } from '@/lib/utils';

const renderMessageWithMentions = (text: string, currentUserName: string, isSender: boolean) => {
    if (isSender) {
        return <span>{text}</span>;
    }
    
    const mentionRegex = /(@[a-zA-Z0-9_]+)/g;
    const parts = text.split(mentionRegex);

    return parts.map((part, index) => {
        if (part.match(mentionRegex)) {
            const isCurrentUserMention = part.substring(1).trim().toLowerCase() === currentUserName.toLowerCase();
            return (
                <strong key={index} className={cn('font-bold', isCurrentUserMention ? 'bg-primary/20 text-primary rounded px-1' : 'text-primary')}>
                    {part}
                </strong>
            );
        }
        return part;
    });
};


export default function ChatPage() {
    const { user, profile: userProfile } = useAuth();
    const { toast } = useToast();
    const { resetUnreadCount } = useUnreadCount();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
    const [users, setUsers] = useState<Pick<UserProfile, 'uid' | 'username' | 'photoURL'>[]>([]);
    const [mentionSearch, setMentionSearch] = useState('');
    const [isMentionPopoverOpen, setMentionPopoverOpen] = useState(false);
    
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const lastMessageTimestamp = useRef<string | null>(null);

    useEffect(() => {
      if (resetUnreadCount) {
        resetUnreadCount();
      }
    }, [resetUnreadCount]);

    const fetchMessages = useCallback(async (isInitialLoad = false) => {
        if (!user) return;
        if (isInitialLoad) setLoading(true);
        
        try {
            const url = isInitialLoad 
                ? '/api/messages' 
                : `/api/messages?since=${encodeURIComponent(lastMessageTimestamp.current || new Date(0).toISOString())}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch messages');
            
            const newMessages: Message[] = await response.json();

            if (newMessages.length > 0) {
                 if (isInitialLoad) {
                    setMessages(newMessages);
                } else {
                    setMessages(prevMessages => {
                        const existingIds = new Set(prevMessages.map(m => m.id));
                        const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));
                        return [...prevMessages, ...uniqueNewMessages];
                    });
                }
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg) {
                    lastMessageTimestamp.current = lastMsg.createdAt;
                }
            }
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load messages.'
            });
        } finally {
            if(isInitialLoad) setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchMessages(true); // Initial fetch

        const interval = setInterval(() => {
            fetchMessages(false); // Poll for new messages
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(interval);
    }, [fetchMessages]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/messages?action=get_users');
                const data = await res.json();
                setUsers(data);
            } catch (error) {
                console.error("Failed to fetch users for mentions", error);
            }
        };
        fetchUsers();
    }, []);
    
    useEffect(() => {
        if (scrollAreaRef.current) {
            setTimeout(() => {
                 scrollAreaRef.current?.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
            }, 100);
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newMessage.trim()) return;

        setSending(true);
        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text: newMessage, 
                    userId: user.uid,
                    replyTo: replyingTo ? {
                        id: replyingTo.id,
                        text: replyingTo.text,
                        username: replyingTo.username
                    } : null
                }),
            });

            if (!response.ok) {
                 const errorData = await response.text();
                 throw new Error(`Failed to send message: ${errorData}`);
            }
            
            const newlySentMessage: Message = await response.json();
            setMessages(prevMessages => [...prevMessages, newlySentMessage]);
            if (newlySentMessage.createdAt) {
                lastMessageTimestamp.current = newlySentMessage.createdAt;
            }
            setNewMessage('');
            setReplyingTo(null);

        } catch (error) {
            console.error("SendMessageError:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to send message.'
            });
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        setNewMessage(text);

        const lastWord = text.split(" ").pop() || "";
        
        if (lastWord.startsWith('@')) {
            setMentionPopoverOpen(true);
            setMentionSearch(lastWord.substring(1));
        } else {
            setMentionPopoverOpen(false);
        }
    };

    const handleMentionSelect = (username: string) => {
        setNewMessage(current => {
            const parts = current.trim().split(' ');
            parts.pop(); // remove the partial @mention
            return `${parts.join(' ')} @${username} `;
        });
        setMentionPopoverOpen(false);
        setMentionSearch('');
        inputRef.current?.focus();
    };

    const handleSetReply = (message: Message) => {
        setReplyingTo(message);
        inputRef.current?.focus();
    }
    
    const filteredUsers = users.filter(u => u.username && u.username.toLowerCase().includes(mentionSearch.toLowerCase()) && u.uid !== user?.uid);

    return (
        <div className="flex-1 flex flex-col p-4 md:p-8 pt-6 h-[calc(100vh-4rem)]">
            <div className="flex items-center justify-between space-y-2 pb-4">
                <h2 className="text-3xl font-bold tracking-tight">Public Chat</h2>
            </div>
            <Card className="flex-1 flex flex-col">
                <CardHeader>
                    <CardTitle>Community Discussion</CardTitle>
                    <CardDescription>Discuss ideas and get support from the community. Mention others with @username.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full p-6" ref={scrollAreaRef}>
                        {loading && messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="space-y-4 pr-4">
                                {messages.map((msg) => (
                                    <div key={msg.id} className="group relative">
                                        <div className={`flex items-start gap-3 ${user?.uid === msg.userId ? "justify-end" : ""}`}>
                                            {user?.uid !== msg.userId && (
                                                <Avatar>
                                                    <AvatarImage src={msg.userAvatar || 'https://placehold.co/100x100.png'} alt={msg.username || 'User'} data-ai-hint="user portrait" />
                                                    <AvatarFallback>{msg.username ? msg.username.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className={`flex flex-col ${user?.uid === msg.userId ? "items-end" : "items-start"}`}>
                                                <div className={`p-3 rounded-lg max-w-xs lg:max-w-md ${user?.uid === msg.userId ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                                    {user?.uid !== msg.userId && <p className="font-semibold text-sm mb-1 text-primary">{msg.username || 'Anonymous'}</p>}
                                                    {msg.replyToId && msg.replyToUsername && (
                                                        <div className="p-2 mb-2 rounded-md bg-black/10 dark:bg-white/10 text-sm opacity-80 border-l-2 border-primary/50">
                                                            <p className="font-semibold text-xs">{msg.replyToUsername}</p>
                                                            <p className="truncate">{msg.replyToText}</p>
                                                        </div>
                                                    )}
                                                    <p className="whitespace-pre-wrap break-words">{renderMessageWithMentions(msg.text, userProfile?.username || '', user?.uid === msg.userId)}</p>
                                                </div>
                                                <span className="text-xs text-muted-foreground mt-1">
                                                    {format(new Date(msg.createdAt), 'p')}
                                                </span>
                                            </div>
                                            {user?.uid === msg.userId && (
                                                <Avatar>
                                                    <AvatarImage src={userProfile?.photoURL || 'https://placehold.co/100x100.png'} alt={userProfile?.username || ''} data-ai-hint="user portrait" />
                                                    <AvatarFallback>{(userProfile?.username || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                         {user && (
                                            <div className={cn("absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity",
                                                user.uid === msg.userId ? 'left-0' : 'right-0'
                                            )}>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSetReply(msg)}>
                                                    <MessageSquareReply className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
                <CardFooter className="p-4 border-t flex flex-col items-start gap-2">
                    {replyingTo && (
                        <div className="w-full bg-muted p-2 rounded-md flex items-center justify-between animate-in fade-in-50">
                            <div className="text-sm">
                                <p className="font-semibold">Replying to {replyingTo.username}</p>
                                <p className="text-muted-foreground truncate max-w-xs">{replyingTo.text}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setReplyingTo(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2 w-full">
                        <Popover open={isMentionPopoverOpen} onOpenChange={setMentionPopoverOpen}>
                            <PopoverTrigger asChild>
                                <div className="w-full" />
                            </PopoverTrigger>
                             <Input
                                ref={inputRef}
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={handleInputChange}
                                autoComplete="off"
                                disabled={sending || !user}
                                className="w-full"
                            />
                            <PopoverContent className="w-80 p-0" align="start" side="top">
                                <div className="flex flex-col">
                                    <div className="p-2 border-b">
                                        <p className="text-sm font-medium">Mention a user</p>
                                    </div>
                                    <ScrollArea className="max-h-48">
                                        <div className="p-1">
                                            {filteredUsers.length > 0 ? (
                                                filteredUsers.map(u => (
                                                    <div
                                                        key={u.uid}
                                                        className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                                                        onClick={() => handleMentionSelect(u.username)}
                                                    >
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarImage src={u.photoURL || undefined} />
                                                            <AvatarFallback>{u.username.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm">{u.username}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="p-2 text-sm text-muted-foreground">No users found.</p>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </PopoverContent>
                        </Popover>
                         <Button type="submit" variant="ghost" size="icon" disabled={sending || !newMessage.trim() || !user}>
                            {sending ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Send className="h-5 w-5" />
                            )}
                            <span className="sr-only">Send</span>
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    );
}
