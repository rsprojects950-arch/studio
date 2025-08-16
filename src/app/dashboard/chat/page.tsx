
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { getUserProfile } from '@/lib/firebase/firestore';
import type { Message } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function ChatPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [userName, setUserName] = useState('');
    const [userAvatar, setUserAvatar] = useState<string | null>(null);

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const lastMessageTimestamp = useRef<string | null>(null);

    useEffect(() => {
        if (user) {
            getUserProfile(user.uid).then(profile => {
                if (profile) {
                    setUserName(profile.name || user.displayName || 'Anonymous');
                    setUserAvatar(profile.photoURL || user.photoURL || null);
                } else {
                    setUserName(user.displayName || 'Anonymous');
                    setUserAvatar(user.photoURL || null);
                }
            });
        }
    }, [user]);

    const fetchMessages = useCallback(async (isInitialLoad = false) => {
        if (!user) return;
        setLoading(isInitialLoad);
        
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
        if (scrollAreaRef.current) {
            const isScrolledToBottom = scrollAreaRef.current.scrollHeight - scrollAreaRef.current.clientHeight <= scrollAreaRef.current.scrollTop + 20;
            if (isScrolledToBottom) {
                 scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
            }
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
                    userName: userName, 
                    userAvatar: userAvatar
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

        } catch (error) {
            console.error("SendMessageError:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to send message.'
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col p-4 md:p-8 pt-6 h-[calc(100vh-4rem)]">
            <div className="flex items-center justify-between space-y-2 pb-4">
                <h2 className="text-3xl font-bold tracking-tight">Public Chat</h2>
            </div>
            <Card className="flex-1 flex flex-col">
                <CardHeader>
                    <CardTitle>Community Discussion</CardTitle>
                    <CardDescription>Discuss ideas and get support from the community.</CardDescription>
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
                                    <div key={msg.id} className={`flex items-start gap-3 ${user?.uid === msg.userId ? "justify-end" : ""}`}>
                                        {user?.uid !== msg.userId && (
                                            <Avatar>
                                                <AvatarImage src={msg.userAvatar || 'https://placehold.co/100x100.png'} alt={msg.userName} data-ai-hint="user portrait" />
                                                <AvatarFallback>{msg.userName.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        )}
                                        <div className={`flex flex-col ${user?.uid === msg.userId ? "items-end" : "items-start"}`}>
                                            <div className={`p-3 rounded-lg max-w-xs lg:max-w-md ${user?.uid === msg.userId ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                                {user?.uid !== msg.userId && <p className="font-semibold text-sm mb-1">{msg.userName}</p>}
                                                <p>{msg.text}</p>
                                            </div>
                                             <span className="text-xs text-muted-foreground mt-1">
                                                {format(new Date(msg.createdAt), 'p')}
                                            </span>
                                        </div>
                                        {user?.uid === msg.userId && (
                                            <Avatar>
                                                <AvatarImage src={userAvatar || 'https://placehold.co/100x100.png'} alt={userName} data-ai-hint="user portrait" />
                                                <AvatarFallback>{(userName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
                <CardFooter className="p-4 border-t">
                     <form onSubmit={handleSendMessage} className="flex items-center gap-2 w-full">
                        <Input 
                            placeholder="Type a message..." 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={sending || !user}
                        />
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
