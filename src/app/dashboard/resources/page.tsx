
'use client';

import { useState, useMemo, useEffect, useCallback, useRef, forwardRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Book, FileText, Video, ExternalLink, Mic, Plus, Loader2, User, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import type { Resource } from '@/lib/types';
import { getResources } from '@/lib/firebase/resources';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createResourceAction, updateResourceAction } from '@/lib/firebase/actions';

const iconMap: { [key: string]: React.ElementType } = {
  Documentation: FileText,
  Video: Video,
  Book: Book,
  'Online Resource': FileText,
  Podcast: Mic,
};

const ResourceCard = ({ resource, onEdit }: { resource: Resource, onEdit: () => void }) => {
  const { user } = useAuth();
  const Icon = iconMap[resource.type] || FileText;
  
  const canEdit = user?.uid === resource.submittedByUid;

  return (
    <Card className="overflow-hidden flex flex-col group relative">
      <CardHeader className="p-0">
        <div className="aspect-video bg-muted flex items-center justify-center">
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
            <span>Added by {resource.submittedByUsername}</span>
        </div>
        <Button asChild variant="outline" className="w-full">
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
             View Resource <ExternalLink className="ml-2 h-4 w-4" />
            </a>
        </Button>
      </CardFooter>
      {canEdit && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="secondary" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit resource</span>
          </Button>
        </div>
      )}
    </Card>
  );
};

const NoResults = () => (
    <div className="text-center text-muted-foreground col-span-full py-12">
        <p className="text-lg font-semibold">No results found</p>
        <p>Try adjusting your search or filters. Or, add a new resource!</p>
    </div>
);

const ResourceSkeleton = () => (
    <Card className="overflow-hidden">
      <CardHeader className="p-0">
        <Skeleton className="aspect-video w-full" />
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
);

const ResourceForm = forwardRef<
    HTMLFormElement,
    {
        resource?: Resource | null;
        onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
        isSubmitting: boolean;
    }
>(({ resource, onSubmit, isSubmitting }, ref) => {
    return (
        <form
            ref={ref}
            onSubmit={onSubmit}
            className="space-y-4"
        >
            {resource && <input type="hidden" name="resourceId" value={resource.id} />}
            <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input id="url" name="url" placeholder="https://example.com/resource" required defaultValue={resource?.url} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" placeholder="e.g. Awesome React Tutorial" required defaultValue={resource?.title} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="A short summary of what this resource is about." required defaultValue={resource?.description} />
            </div>
            <div className='grid grid-cols-2 gap-4'>
                <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select name="category" required defaultValue={resource?.category}>
                        <SelectTrigger id="category">
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="tech">Tech</SelectItem>
                            <SelectItem value="entrepreneur">Entrepreneur</SelectItem>
                            <SelectItem value="selfHelp">Self Help</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select name="type" required defaultValue={resource?.type}>
                        <SelectTrigger id="type">
                            <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Book">Book</SelectItem>
                            <SelectItem value="Video">Video</SelectItem>
                            <SelectItem value="Documentation">Documentation</SelectItem>
                            <SelectItem value="Online Resource">Online Resource</SelectItem>
                            <SelectItem value="Podcast">Podcast</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {resource ? 'Save Changes' : 'Add Resource'}
                </Button>
            </DialogFooter>
        </form>
    );
});
ResourceForm.displayName = 'ResourceForm';

export default function ResourcesPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const addFormRef = useRef<HTMLFormElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);

  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'tech' | 'entrepreneur' | 'selfHelp'>('tech');

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const resources = await getResources();
      setAllResources(resources);
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error fetching resources",
        description: "Could not load resources from the database."
      });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);


  const resourceTypes = useMemo(() => {
    const types = new Set(['All']);
    allResources.filter(r => r.category === activeTab).forEach(r => types.add(r.type));
    return Array.from(types);
  }, [activeTab, allResources]);

  const filteredResources = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    return allResources.filter(r =>
        r.category === activeTab &&
        (r.title.toLowerCase().includes(lowercasedFilter) || r.description.toLowerCase().includes(lowercasedFilter)) &&
        (activeFilter === 'All' || r.type === activeFilter)
      );
  }, [searchTerm, activeFilter, activeTab, allResources]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'tech' | 'entrepreneur' | 'selfHelp');
    setActiveFilter('All');
    setSearchTerm('');
  }

  const handleOpenEditDialog = (resource: Resource) => {
    setEditingResource(resource);
    setIsEditDialogOpen(true);
  };

  const handleAddFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !profile) {
      toast({ variant: "destructive", title: "You must be logged in."});
      return;
    }
    
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    formData.set('userId', user.uid);
    formData.set('username', profile.username);

    try {
      await createResourceAction(formData);
      addFormRef.current?.reset();
      setIsAddDialogOpen(false);
      toast({ title: "Resource added successfully!" });
      fetchResources();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add the new resource.";
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      toast({ variant: "destructive", title: "You must be logged in."});
      return;
    }
    
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    formData.set('userId', user.uid);
    
    try {
      await updateResourceAction(formData);
      editFormRef.current?.reset();
      setIsEditDialogOpen(false);
      setEditingResource(null);
      toast({ title: "Resource updated successfully!" });
      fetchResources();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update resource.";
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="space-y-2 mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Resources</h2>
        <p className="text-muted-foreground">
          Explore and contribute to our community-curated library of resources.
        </p>
      </div>

      <Tabs defaultValue="tech" className="space-y-4" onValueChange={handleTabChange} value={activeTab}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <TabsList>
                <TabsTrigger value="tech">Tech</TabsTrigger>
                <TabsTrigger value="entrepreneur">Entrepreneur</TabsTrigger>
                <TabsTrigger value="selfHelp">Self Help</TabsTrigger>
            </TabsList>
            <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search in this category..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            {resourceTypes.map(type => (
                <Button 
                    key={type} 
                    variant={activeFilter === type ? 'default' : 'outline'}
                    onClick={() => setActiveFilter(type)}
                    className="rounded-full"
                >
                    {type}
                </Button>
            ))}
        </div>
        
        <TabsContent value={activeTab} className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <ResourceSkeleton key={i} />)
              ) : filteredResources.length > 0 ? (
                  filteredResources.map(r => <ResourceCard key={r.id} resource={r} onEdit={() => handleOpenEditDialog(r)} />)
              ) : (
                  <NoResults />
              )}
          </div>
        </TabsContent>
      </Tabs>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
              <Button className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg">
                  <Plus className="h-6 w-6" />
                  <span className="sr-only">Add Resource</span>
              </Button>
          </DialogTrigger>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Add a new resource</DialogTitle>
                  <DialogDescription>
                      Share something valuable with the community.
                  </DialogDescription>
              </DialogHeader>
              <ResourceForm ref={addFormRef} onSubmit={handleAddFormSubmit} isSubmitting={isSubmitting} />
          </DialogContent>
      </Dialog>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Edit resource</DialogTitle>
                  <DialogDescription>
                     Make changes to your submitted resource.
                  </DialogDescription>
              </DialogHeader>
              <ResourceForm
                  ref={editFormRef}
                  resource={editingResource}
                  onSubmit={handleEditFormSubmit}
                  isSubmitting={isSubmitting}
              />
          </DialogContent>
      </Dialog>
    </div>
  );
}
