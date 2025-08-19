
'use client';

import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import type { Message, UserProfile, Resource, ResourceLink, Conversation } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, Loader2, BookOpen, MessageSquare, Plus, Users, Search as SearchIcon } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useUnreadCount } from '@/context/unread-count-context';

const renderMessageWithContent = (text: string, currentUserName: string, isOwnMessage: boolean) => {
    const regex = /(@[a-zA-Z0-9_]+)|(#\[([^\]]+?)\]\(([a-zA-Z0-9-]+)\))/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }

        if (match[1]) {
            const mention = match[1].substring(1);
            const isCurrentUserMention = mention.trim().toLowerCase() === currentUserName.toLowerCase();
            parts.push({ type: 'mention', content: match[1], isCurrentUser: isCurrentUserMention });
        } else if (match[2]) {
            parts.push({ type: 'resource', content: match[3], id: match[4] });
        }

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) parts.push(text.substring(lastIndex));

    return parts.map((part, index) => {
        if (typeof part === 'string') return <span key={index}>{part}</span>;
        if (part.type === 'mention') return <strong key={index} className={cn('font-bold', part.isCurrentUser ? 'bg-primary/20 text-primary rounded px-1' : isOwnMessage ? '' : 'text-primary' )}>{part.content}</strong>;
        if (part.type === 'resource') return <Link key={index} href={`/dashboard/resources?highlight=${part.id}`} passHref><Badge variant="secondary" className="cursor-pointer hover:bg-primary/20"><BookOpen className="h-3 w-3 mr-1" />{part.content}</Badge></Link>;
        return null;
    });
};

function ChatPageContent() {
    const { user, profile: userProfile } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshUnreadCount } = useUnreadCount();

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(true);
    
    const activeConversationId = searchParams.get('id') || 'public';

    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [isNewDmDialogOpen, setIsNewDmDialogOpen] = useState(false);
    const [dmUserSearch, setDmUserSearch] = useState('');
    
    const [usersForMentions, setUsersForMentions] = useState<Pick<UserProfile, 'uid' | 'username' | 'photoURL'>[]>([]);
    const [resources, setResources] = useState<Pick<Resource, 'id' | 'title' | 'type'>[]>([]);
    
    const [mentionSearch, setMentionSearch] = useState('');
    const [isMentionPopoverOpen, setMentionPopoverOpen] = useState(false);
    
    const [resourceSearch, setResourceSearch] = useState('');
    const [isResourcePopoverOpen, setResourcePopoverOpen] = useState(false);
    
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const lastMessageTimestamp = useRef<string | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const activeConversation = useMemo(() => {
        if (activeConversationId === 'public') {
            return {
                id: 'public',
                title: 'Community Discussion',
                description: 'Discuss ideas and get support.',
                icon: <Users className="h-8 w-8" />
            }
        }
        const conversation = conversations.find(c => c.id === activeConversationId);
        if (!conversation || !conversation.participantProfiles || conversation.participantProfiles.length === 0) return null;
        const otherUser = conversation.participantProfiles.find(p => p.uid !== user?.uid);
        if(!otherUser) return null;
        return {
            id: conversation.id,
            title: otherUser.username,
            description: `Direct message with ${otherUser.username}`,
            icon: <Avatar className="h-8 w-8"><AvatarImage src={otherUser.photoURL || undefined} /><AvatarFallback>{otherUser.username.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
        }
    }, [activeConversationId, conversations, user]);

    const fetchMessages = useCallback(async (conversationId: string, isInitialLoad = false) => {
        if (!user) return;
        if (isInitialLoad) {
            setLoading(true);
            setMessages([]);
            lastMessageTimestamp.current = null;
        }
        
        try {
            let url = `/api/messages?conversationId=${conversationId}`;
            if (!isInitialLoad && lastMessageTimestamp.current) {
                // Ensure the timestamp is URL-encoded to handle special characters.
                url += `&since=${encodeURIComponent(lastMessageTimestamp.current)}`;
            }

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
                if (lastMsg) lastMessageTimestamp.current = lastMsg.createdAt;
            }
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to load messages.' });
        } finally {
            if(isInitialLoad) setLoading(false);
        }
    }, [user, toast]);

    const fetchConversations = useCallback(async () => {
        if (!user) return;
        setLoadingConversations(true);
        try {
            const res = await fetch(`/api/conversations?userId=${user.uid}`);
            if(res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch (error) {
            console.error("Failed to fetch conversations", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load conversations.' });
        } finally {
            setLoadingConversations(false);
        }
    }, [user, toast]);
    
    useEffect(() => {
        if (user) {
            fetchConversations();
        }
    }, [user, fetchConversations]);

    const markConversationAsRead = useCallback(async (conversationId: string) => {
        if (!user || conversationId === 'public') return;
        try {
            await fetch('/api/unread', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid, conversationId }),
            });
            // Optimistic update
            setConversations(prev => prev.map(c => c.id === conversationId ? {...c, unreadCount: 0} : c));
            refreshUnreadCount();
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    }, [user, refreshUnreadCount]);

    useEffect(() => {
        if (!activeConversationId) return;
        
        // Stop any existing polling
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        
        // Initial fetch for the new conversation
        fetchMessages(activeConversationId, true);

        // Start polling for the active conversation
        pollingIntervalRef.current = setInterval(() => fetchMessages(activeConversationId, false), 5000);
        
        // Mark DMs as read when opened
        if(activeConversationId !== 'public') {
            markConversationAsRead(activeConversationId);
        }
        
        // Cleanup on component unmount or when conversation changes
        return () => { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current) };
    }, [activeConversationId, fetchMessages, markConversationAsRead]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/users');
                const data = await res.json();
                setAllUsers(data);
            } catch (error) {
                console.error("Failed to fetch users", error);
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
        if (!user || !newMessage.trim() || !activeConversationId) return;
        setSending(true);
        const resourceTagRegex = /#\[([^\]]+?)\]\(([a-zA-Z0-9-]+)\)/g;
        let match;
        const resourceLinks: ResourceLink[] = [];
        while((match = resourceTagRegex.exec(newMessage)) !== null) resourceLinks.push({ id: match[2], title: match[1], type: 'resource' });

        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId: activeConversationId, text: newMessage, userId: user.uid, replyTo: null, resourceLinks: resourceLinks.length > 0 ? resourceLinks : null }),
            });

            if (!response.ok) throw new Error(`Failed to send message: ${await response.text()}`);
            
            const newlySentMessage: Message = await response.json();
            
            // Optimistically add the new message to the state
            setMessages(prev => [...prev, newlySentMessage]);

            if (newlySentMessage.createdAt) {
                lastMessageTimestamp.current = newlySentMessage.createdAt;
            }
            
            setNewMessage('');
            // Refresh conversation list to show new last message
            fetchConversations(); 

        } catch (error) {
            console.error("SendMessageError:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to send message.' });
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        setNewMessage(text);
        const cursorPosition = e.target.selectionStart || 0;
        const textUpToCursor = text.substring(0, cursorPosition);
        const currentWord = textUpToCursor.split(/\s+/).pop() || "";
        
        if (currentWord.startsWith('@')) {
            setResourcePopoverOpen(false); setMentionPopoverOpen(true); setMentionSearch(currentWord.substring(1));
        } else if (currentWord.startsWith('#')) {
            setMentionPopoverOpen(false); setResourcePopoverOpen(true); const query = currentWord.substring(1); setResourceSearch(query); fetchResources(query);
        } else {
            setResourcePopoverOpen(false); setMentionPopoverOpen(false);
        }
    };

    const handleMentionSelect = (username: string) => {
        const currentText = newMessage;
        const cursorPosition = inputRef.current?.selectionStart || 0;
        const textUpToCursor = currentText.substring(0, cursorPosition);
        const lastAtIndex = textUpToCursor.lastIndexOf('@');
        const prefix = textUpToCursor.substring(0, lastAtIndex);
        setNewMessage(`${prefix}@${username} `);
        setMentionPopoverOpen(false);
        setMentionSearch('');
        inputRef.current?.focus();
    };
    
    const handleResourceSelect = (resource: Pick<Resource, 'id' | 'title' | 'type'>) => {
        const currentText = newMessage;
        const cursorPosition = inputRef.current?.selectionStart || 0;
        const textUpToCursor = currentText.substring(0, cursorPosition);
        const lastHashIndex = textUpToCursor.lastIndexOf('#');
        const prefix = textUpToCursor.substring(0, lastHashIndex);
        const tag = `#[${resource.title}](${resource.id}) `;
        setNewMessage(`${prefix}${tag}`);
        setResourcePopoverOpen(false);
        setResourceSearch('');
        setResources([]);
        inputRef.current?.focus();
    }

    const fetchResources = useCallback(async(query: string) => {
        try {
            const res = await fetch(`/api/resources?q=${query}`);
            const data = await res.json();
            setResources(data);
        } catch(error) { console.error("Failed to fetch resources for tagging", error); }
    }, []);

    const handleStartNewDm = async (otherUserId: string) => {
        if (!user || !userProfile) return;
        setIsNewDmDialogOpen(false);
        
        try {
            const res = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentUserId: user.uid, otherUserId, currentUserProfile: { uid: user.uid, username: userProfile.username, photoURL: userProfile.photoURL } })
            });
            if (res.ok) {
                const newConversation: Conversation = await res.json();
                
                // Add to local state if not already there
                if (!conversations.some(c => c.id === newConversation.id)) {
                    setConversations(prev => [newConversation, ...prev]);
                }
                
                // Switch to the new conversation
                router.push(`/dashboard/chat?id=${newConversation.id}`, { scroll: false });

            } else {
                throw new Error("Failed to create conversation");
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not start a new chat.' });
        }
    }

    const handleConversationSelect = (id: string) => {
        router.push(`/dashboard/chat?id=${id}`, { scroll: false });
    }

    const filteredUsersForMentions = useMemo(() => {
        return allUsers.filter(u => u.username && u.username.toLowerCase().includes(mentionSearch.toLowerCase()) && u.uid !== user?.uid);
    }, [allUsers, mentionSearch, user]);

    const filteredUsersForDm = useMemo(() => {
        const existingDmUserIds = new Set(conversations.flatMap(c => c.participants));
        return allUsers.filter(u =>
            u.uid !== user?.uid &&
            !existingDmUserIds.has(u.uid) &&
            (u.username?.toLowerCase().includes(dmUserSearch.toLowerCase()) || 
             u.email?.toLowerCase().includes(dmUserSearch.toLowerCase()))
        );
    }, [allUsers, conversations, dmUserSearch, user]);

    const filteredResources = resources.filter(r => r.title.toLowerCase().includes(resourceSearch.toLowerCase()));

    return (
        <div className="flex h-[calc(100vh-4rem)]">
            <Card className="w-1/3 min-w-[300px] flex flex-col rounded-none border-r">
                <CardHeader>
                    <CardTitle>Conversations</CardTitle>
                     <Dialog open={isNewDmDialogOpen} onOpenChange={setIsNewDmDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full mt-2"><Plus className="mr-2 h-4 w-4" /> New Message</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Start a new conversation</DialogTitle></DialogHeader>
                            <div className="relative">
                                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search for a user..." value={dmUserSearch} onChange={(e) => setDmUserSearch(e.target.value)} className="pl-8" />
                            </div>
                            <ScrollArea className="max-h-72">
                                {filteredUsersForDm.length > 0 ? filteredUsersForDm.map(u => (
                                    <div key={u.uid} onClick={() => handleStartNewDm(u.uid)} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer">
                                        <Avatar className="h-8 w-8"><AvatarImage src={u.photoURL || undefined} /><AvatarFallback>{u.username?.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                                        <span className="text-sm font-medium">{u.username}</span>
                                    </div>
                                )) : <p className="p-4 text-center text-sm text-muted-foreground">No users found.</p>}
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-0">
                    <ScrollArea className="h-full">
                        <div className="p-2 space-y-1">
                            <div onClick={() => handleConversationSelect('public')} className={cn("flex items-center gap-3 p-2 rounded-md cursor-pointer", activeConversationId === 'public' ? 'bg-accent' : 'hover:bg-accent')}>
                                <Avatar><AvatarFallback><Users/></AvatarFallback></Avatar>
                                <div>
                                    <p className="font-semibold">Community</p>
                                    <p className="text-sm text-muted-foreground truncate">Public discussion</p>
                                </div>
                            </div>
                            {loadingConversations ? Array.from({length: 3}).map((_, i) => <div key={i} className="flex items-center gap-3 p-2"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div></div>) 
                            : conversations.map(c => {
                                const otherUser = c.participantProfiles.find(p => p.uid !== user?.uid);
                                if (!otherUser) return null;
                                return (
                                <div key={c.id} onClick={() => handleConversationSelect(c.id)} className={cn("flex items-center gap-3 p-2 rounded-md cursor-pointer", activeConversationId === c.id ? 'bg-accent' : 'hover:bg-accent')}>
                                    <Avatar><AvatarImage src={otherUser.photoURL || undefined} /><AvatarFallback>{otherUser.username.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold">{otherUser.username}</p>
                                            {c.unreadCount > 0 && <Badge className="h-5">{c.unreadCount}</Badge>}
                                        </div>
                                        <p className="text-sm text-muted-foreground truncate">{c.lastMessage ? c.lastMessage.text : 'No messages yet'}</p>
                                    </div>
                                </div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card className="flex-1 flex flex-col rounded-none">
                {activeConversation ? (
                    <>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                {activeConversation.icon}
                                <div>
                                    <CardTitle>{activeConversation.title}</CardTitle>
                                    <CardDescription>{activeConversation.description}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-0">
                            <ScrollArea className="h-full p-6" ref={scrollAreaRef}>
                                {loading ? <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                                : messages.length === 0 ? <div className="flex items-center justify-center h-full text-muted-foreground text-center"><p>No messages yet. <br /> Be the first to say something!</p></div>
                                : <div className="space-y-4 pr-4">
                                    {messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((msg) => (
                                        <div key={msg.id} className="group/message relative">
                                            <div className={`flex items-start gap-3 ${user?.uid === msg.userId ? "justify-end" : ""}`}>
                                                {user?.uid !== msg.userId && <Avatar><AvatarImage src={msg.userAvatar || undefined} alt={msg.username || 'User'} /><AvatarFallback>{msg.username ? msg.username.charAt(0).toUpperCase() : 'U'}</AvatarFallback></Avatar>}
                                                <div className={`flex flex-col ${user?.uid === msg.userId ? "items-end" : "items-start"}`}>
                                                    <div className={`p-3 rounded-lg max-w-xs lg:max-w-md ${user?.uid === msg.userId ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                                        {user?.uid !== msg.userId && <p className="font-semibold text-sm mb-1 text-primary">{msg.username || 'Anonymous'}</p>}
                                                        <div className="whitespace-pre-wrap break-words">{renderMessageWithContent(msg.text, userProfile?.username || '', user?.uid === msg.userId)}</div>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground mt-1">{msg.createdAt ? format(new Date(msg.createdAt), 'p') : ''}</span>
                                                </div>
                                                {user?.uid === msg.userId && <Avatar><AvatarImage src={userProfile?.photoURL || undefined} alt={userProfile?.username || ''} /><AvatarFallback>{(userProfile?.username || 'U').charAt(0).toUpperCase()}</AvatarFallback></Avatar>}
                                            </div>
                                        </div>
                                    ))}
                                </div>}
                            </ScrollArea>
                        </CardContent>
                        <CardFooter className="p-4 border-t flex flex-col items-start gap-2">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2 w-full">
                                <div className="w-full relative">
                                    <Input ref={inputRef} placeholder="Type a message..." value={newMessage} onChange={handleInputChange} autoComplete="off" disabled={sending || !user} className="w-full"/>
                                    <><Popover open={isMentionPopoverOpen && filteredUsersForMentions.length > 0 && activeConversationId === 'public'} onOpenChange={setMentionPopoverOpen}><PopoverTrigger asChild><div/></PopoverTrigger><PopoverContent className="w-80 p-0" align="start" side="top"><div className="p-2 border-b"><p className="text-sm font-medium">Mention a user</p></div><ScrollArea className="max-h-48 p-1">{filteredUsersForMentions.map(u => (<div key={u.uid} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer" onClick={() => handleMentionSelect(u.username)}><Avatar className="h-6 w-6"><AvatarImage src={u.photoURL || undefined} /><AvatarFallback>{u.username.charAt(0)}</AvatarFallback></Avatar><span className="text-sm">{u.username}</span></div>))}</ScrollArea></PopoverContent></Popover>
                                    <Popover open={isResourcePopoverOpen && filteredResources.length > 0 && activeConversationId === 'public'} onOpenChange={setResourcePopoverOpen}><PopoverTrigger asChild><div/></PopoverTrigger><PopoverContent className="w-80 p-0" align="start" side="top"><div className="p-2 border-b"><p className="text-sm font-medium">Tag a resource</p></div><ScrollArea className="max-h-48 p-1">{filteredResources.map(r => (<div key={r.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer" onClick={() => handleResourceSelect(r)}><BookOpen className="h-4 w-4 text-muted-foreground" /><div className="flex flex-col"><span className="text-sm">{r.title}</span><span className="text-xs text-muted-foreground">{r.type}</span></div></div>))}</ScrollArea></PopoverContent></Popover></>
                                </div>
                                <Button type="submit" variant="ghost" size="icon" disabled={sending || !newMessage.trim() || !user}>{sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}<span className="sr-only">Send</span></Button>
                            </form>
                        </CardFooter>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                           {loadingConversations ? <Loader2 className="h-8 w-8 animate-spin" /> : <MessageSquare className="h-12 w-12" />}
                           <p className="text-lg font-medium">{loadingConversations ? "Loading..." : "Select a conversation"}</p>
                           <p>Choose a conversation from the left panel to start chatting.</p>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <ChatPageContent />
        </Suspense>
    )
}
