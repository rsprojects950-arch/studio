
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import type { UserProfile, Conversation } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NewConversationDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onConversationStarted: (conversation: Conversation) => void;
}

export function NewConversationDialog({ isOpen, onOpenChange, onConversationStarted }: NewConversationDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [startingConversation, setStartingConversation] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            if (!isOpen) return;
            setLoading(true);
            try {
                const res = await fetch('/api/users');
                const data: UserProfile[] = await res.json();
                const otherUsers = data.filter(u => u.uid !== user?.uid);
                setAllUsers(otherUsers);
                setFilteredUsers(otherUsers);
            } catch (error) {
                console.error(error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch users.' });
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [isOpen, user, toast]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value.toLowerCase();
        setSearchTerm(term);
        setFilteredUsers(
            allUsers.filter(u => u.username.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
        );
    };

    const handleUserSelect = async (otherUser: UserProfile) => {
        if (!user) return;
        setStartingConversation(true);
        try {
            const res = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentUserId: user.uid, otherUserId: otherUser.uid }),
            });
            if (!res.ok) throw new Error('Failed to start conversation');

            const conversation: Conversation = await res.json();
            onConversationStarted(conversation);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not start conversation.' });
        } finally {
            setStartingConversation(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>New Message</DialogTitle>
                    <DialogDescription>Select a user to start a conversation with.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Input placeholder="Search for users..." value={searchTerm} onChange={handleSearch} />
                    <ScrollArea className="h-64">
                        {loading ? (
                            <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : (
                            <div className="space-y-2">
                                {filteredUsers.length > 0 ? filteredUsers.map(u => (
                                    <div
                                        key={u.uid}
                                        className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                                        onClick={() => handleUserSelect(u)}
                                    >
                                        <Avatar>
                                            <AvatarImage src={u.photoURL || undefined} alt={u.username} />
                                            <AvatarFallback>{u.username.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="truncate">
                                            <p className="font-semibold">{u.username}</p>
                                            <p className="text-sm text-muted-foreground">{u.email}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-center text-sm text-muted-foreground p-4">No users found.</p>
                                )}
                            </div>
                        )}
                         {startingConversation && <div className="absolute inset-0 bg-background/50 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
