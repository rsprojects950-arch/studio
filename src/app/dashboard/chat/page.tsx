
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import type { Message } from '@/lib/types';
import { getMessages, sendMessage } from '@/lib/firebase/firestore';
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
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchMessages = async () => {
            setLoading(true);
            try {
                const initialMessages = await getMessages();
                setMessages(initialMessages);
            } catch (error) {
                 toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to load messages.'
                });
            } finally {
                setLoading(false);
            }
        };
        fetchMessages();
    }, [toast]);
    
    useEffect(() => {
        // Auto-scroll to the bottom
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo(0, scrollAreaRef.current.scrollHeight);
        }
    }, [messages]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newMessage.trim()) return;

        setSending(true);
        try {
            await sendMessage(user.uid, user.displayName || 'Anonymous', user.photoURL, newMessage);
            setNewMessage('');
            // Refetch messages after sending
            const updatedMessages = await getMessages();
            setMessages(updatedMessages);

        } catch (error) {
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
        <div className="flex-1 flex flex-col p-4 md:p-8 pt-6 h-full">
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
                        {loading ? (
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
                                                {format(msg.createdAt, 'p')}
                                            </span>
                                        </div>
                                        {user?.uid === msg.userId && (
                                            <Avatar>
                                                <AvatarImage src={msg.userAvatar || 'https://placehold.co/100x100.png'} alt={msg.userName} data-ai-hint="user portrait" />
                                                <AvatarFallback>{msg.userName.charAt(0).toUpperCase()}</AvatarFallback>
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
