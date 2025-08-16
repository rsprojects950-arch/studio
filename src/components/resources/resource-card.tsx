
'use client';
import { forwardRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Book, FileText, Video, ExternalLink, Mic, User, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Resource } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from 'date-fns';

const iconMap: { [key: string]: React.ElementType } = {
  Documentation: FileText,
  Video: Video,
  Book: Book,
  'Online Resource': FileText,
  Podcast: Mic,
};

export const ResourceCard = forwardRef<
    HTMLDivElement,
    { resource: Resource, onEdit: () => void, onDelete: () => void }
>(({ resource, onEdit, onDelete }, ref) => {
  const { user } = useAuth();
  const Icon = iconMap[resource.type] || FileText;
  
  const canModify = user?.uid === resource.submittedByUid;

  // The 'createdAt' prop is now a string, so we convert it to a Date object here
  const createdAtDate = new Date(resource.createdAt);

  return (
    <Card ref={ref} className="overflow-hidden flex flex-col group relative">
      <CardHeader className="p-0">
        <div className="aspect-video bg-muted flex items-center justify-center relative">
          <Icon className="w-16 h-16 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <div className="flex items-start gap-3">
          <Icon className="w-5 h-5 mt-1 text-muted-foreground shrink-0" />
          <div>
            <CardTitle className="text-lg">{resource.title}</CardTitle>
            <CardDescription>{resource.type}</CardDescription>
            <p className="text-sm text-muted-foreground mt-2">{resource.description}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex-col items-start gap-3">
         <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>Added by {resource.submittedByUsername} {formatDistanceToNow(createdAtDate, { addSuffix: true })}</span>
        </div>
        <Button asChild variant="outline" className="w-full">
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
             View Resource <ExternalLink className="ml-2 h-4 w-4" />
            </a>
        </Button>
      </CardFooter>
      {canModify && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <Button variant="secondary" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit resource</span>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" className="h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete resource</span>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the resource.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </Card>
  );
});
ResourceCard.displayName = 'ResourceCard';
