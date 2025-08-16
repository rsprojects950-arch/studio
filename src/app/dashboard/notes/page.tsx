
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plus, Loader2, Edit, Trash2, BookOpen, Hash } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDistanceToNow } from 'date-fns';

import { getNotes } from '@/lib/firebase/firestore';
import { createNoteAction, updateNoteAction, deleteNoteAction } from '@/lib/firebase/actions';
import type { Note, Resource } from '@/lib/types';
import { searchResources } from '@/lib/firebase/firestore';

export default function NotesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  const [content, setContent] = useState('');
  const [resources, setResources] = useState<Pick<Resource, 'id' | 'title' | 'type'>[]>([]);
  const [isResourcePopoverOpen, setResourcePopoverOpen] = useState(false);
  const [resourceSearch, setResourceSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const refreshNotes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userNotes = await getNotes(user.uid);
      setNotes(userNotes);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to refresh notes.',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      refreshNotes();
    } else {
      setLoading(false);
    }
  }, [user, refreshNotes]);
  
  useEffect(() => {
    if (editingNote) {
      setContent(editingNote.content);
    } else {
      setContent('');
    }
  }, [editingNote]);

  const handleOpenDialog = (note: Note | null = null) => {
    setEditingNote(note);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.set('userId', user.uid);
    // Manually append the content from state, as it's controlled
    formData.set('content', content);

    try {
      if (editingNote) {
        formData.set('noteId', editingNote.id);
        await updateNoteAction(formData);
        toast({ title: 'Note updated!' });
      } else {
        await createNoteAction(formData);
        toast({ title: 'Note created!' });
      }
      formRef.current?.reset();
      setContent('');
      setIsDialogOpen(false);
      setEditingNote(null);
      await refreshNotes(); // This is the crucial line that was missing
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred.';
      toast({ variant: 'destructive', title: 'Error', description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if(!user) return;
    try {
      await deleteNoteAction(noteId, user.uid);
      toast({ title: "Note deleted successfully."});
      await refreshNotes();
    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete note.";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
    }
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);

    const cursorPosition = e.target.selectionStart || 0;
    const textUpToCursor = text.substring(0, cursorPosition);
    const currentWord = textUpToCursor.split(/\s+/).pop() || "";
    
    if (currentWord.startsWith('#')) {
        setResourcePopoverOpen(true);
        const query = currentWord.substring(1);
        setResourceSearch(query);
        fetchResources(query);
    } else {
        setResourcePopoverOpen(false);
    }
  };

  const fetchResources = useCallback(async(query: string) => {
      try {
          const res = await searchResources(query);
          setResources(res);
      } catch(error) {
          console.error("Failed to fetch resources for tagging", error);
      }
  }, []);

  const handleResourceSelect = (resource: Pick<Resource, 'id' | 'title' | 'type'>) => {
    const currentText = content;
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textUpToCursor = currentText.substring(0, cursorPosition);
    
    const lastHashIndex = textUpToCursor.lastIndexOf('#');
    const prefix = textUpToCursor.substring(0, lastHashIndex);

    const tag = `#[${resource.title}](${resource.id}) `;

    setContent(`${prefix}${tag}`);
    setResourcePopoverOpen(false);
    setResourceSearch('');
    setResources([]);
    textareaRef.current?.focus();
  }
  
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

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2 mb-6">
            <div>
                <p className="text-muted-foreground">
                    Capture your thoughts and ideas. Tag resources with #resourcename.
                </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => handleOpenDialog()}>
                        <Plus className="mr-2 h-4 w-4" /> Add Note
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingNote ? 'Edit Note' : 'Create a new note'}</DialogTitle>
                    </DialogHeader>
                    <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="topic">Topic</Label>
                            <Input
                                id="topic"
                                name="topic"
                                placeholder="A brief topic for your note"
                                required
                                defaultValue={editingNote?.topic}
                            />
                        </div>
                        <div className="relative">
                            <Label htmlFor="content">Content</Label>
                             <Textarea
                                ref={textareaRef}
                                id="content"
                                name="content"
                                placeholder="Write your note here..."
                                required
                                value={content}
                                onChange={handleContentChange}
                                className="min-h-[200px]"
                            />
                            <Popover open={isResourcePopoverOpen} onOpenChange={setResourcePopoverOpen}>
                                 <PopoverTrigger asChild><div/></PopoverTrigger>
                                 <PopoverContent className="w-80 p-0" align="start" side="top">
                                     <div className="flex flex-col">
                                         <div className="p-2 border-b flex items-center gap-2">
                                             <Hash className="h-4 w-4" />
                                             <p className="text-sm font-medium">Tag a resource</p>
                                         </div>
                                         <ScrollArea className="max-h-48">
                                             <div className="p-1">
                                                 {resources.length > 0 ? (
                                                     resources.map(r => (
                                                         <div
                                                             key={r.id}
                                                             className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                                                             onClick={() => handleResourceSelect(r)}
                                                         >
                                                             <BookOpen className="h-4 w-4 text-muted-foreground" />
                                                             <div className="flex flex-col">
                                                                <span className="text-sm">{r.title}</span>
                                                                <span className="text-xs text-muted-foreground">{r.type}</span>
                                                             </div>
                                                         </div>
                                                     ))
                                                 ) : (
                                                     <p className="p-2 text-sm text-muted-foreground">No resources found.</p>
                                                 )}
                                             </div>
                                         </ScrollArea>
                                     </div>
                                 </PopoverContent>
                            </Popover>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                               <Button type="button" variant="ghost">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingNote ? 'Save Changes' : 'Create Note'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
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
                            <CardTitle>{note.topic}</CardTitle>
                            <CardDescription>
                                Last updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                             <ScrollArea className="h-24">
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words pr-4">
                                    {renderNoteContent(note.content)}
                                </p>
                            </ScrollArea>
                        </CardContent>
                         <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(note)}>
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Edit note</span>
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Delete note</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete this note. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteNote(note.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                             </div>
                    </Card>
                ))
            ) : (
                <div className="col-span-full text-center py-12">
                    <h3 className="text-lg font-semibold">No notes yet</h3>
                    <p className="text-muted-foreground">Click "Add Note" to create your first one.</p>
                </div>
            )}
        </div>
    </div>
  );
}
