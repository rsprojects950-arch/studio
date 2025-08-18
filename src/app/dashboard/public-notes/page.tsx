
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { BookOpen, Globe, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getPublicNotes } from '@/lib/firebase/firestore';
import type { Note } from '@/lib/types';

const renderNoteContent = (text: string) => {
    const regex = /#\[([^\]]+?)\]\(([a-zA-Z0-9-]+)\)/g;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }
        parts.push({ type: 'resource', content: match[1], id: match[2] });
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts.map((part, index) => {
        if (typeof part === 'string') {
            return <span key={index}>{part}</span>;
        }

        if (part.type === 'resource') {
            return (
                <Link key={index} href={`/dashboard/resources?highlight=${part.id}`} passHref>
                    <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20">
                        <BookOpen className="h-3 w-3 mr-1" />
                        {part.content}
                    </Badge>
                </Link>
            );
        }
        
        return null;
    });
};

export default function PublicNotesPage() {
  const { toast } = useToast();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshNotes = useCallback(async () => {
    setLoading(true);
    try {
      const publicNotes = await getPublicNotes();
      setNotes(publicNotes);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to refresh public notes.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    refreshNotes();
  }, [refreshNotes]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between gap-4 space-y-2 mb-6">
            <div>
                 <h2 className="text-3xl font-bold tracking-tight">Public Notes</h2>
                <p className="text-muted-foreground">
                    Notes shared by the community. Read-only.
                </p>
            </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                ))
            ) : notes.length > 0 ? (
                notes.map(note => (
                    <Card key={note.id} className="group relative flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5 text-primary" />
                                {note.topic}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                               <User className="h-4 w-4" />
                               <span>by {note.username || 'Anonymous'}</span>
                               <span>·</span>
                               <span>{formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                             <ScrollArea className="h-24">
                                <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words pr-4">
                                    {renderNoteContent(note.content)}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <div className="col-span-full flex flex-col items-center justify-center text-center py-12 rounded-lg border-2 border-dashed">
                    <Globe className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No public notes yet</h3>
                    <p className="text-muted-foreground">Be the first to share a note with the community!</p>
                </div>
            )}
        </div>
    </div>
  );
}
