
'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search } from "lucide-react";
import type { Resource } from '@/lib/types';
import { getResources } from '@/lib/firebase/resources';
import { createResourceAction, updateResourceAction, deleteResourceAction } from '@/lib/firebase/actions';
import { ResourceCard } from '@/components/resources/resource-card';
import { ResourceSkeleton } from '@/components/resources/resource-skeleton';
import { NoResults } from '@/components/resources/no-results';
import { ResourceForm } from '@/components/resources/resource-form';

export default function ResourcesPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const addFormRef = useRef<HTMLFormElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);
  const searchParams = useSearchParams();
  const resourceRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'tech' | 'entrepreneur' | 'selfHelp'>('tech');

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [highlightedResource, setHighlightedResource] = useState<string | null>(null);

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
    const highlightId = searchParams.get('highlight');
    if (highlightId) {
      setHighlightedResource(highlightId);
    }
  }, [fetchResources, searchParams]);

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

  useEffect(() => {
    if (!loading && highlightedResource) {
      const matchingResource = allResources.find(r => r.id === highlightedResource);
      if (matchingResource && matchingResource.category !== activeTab) {
        setActiveTab(matchingResource.category);
      }
    }
  }, [loading, highlightedResource, allResources, activeTab]);

  useEffect(() => {
    if (highlightedResource && filteredResources.some(r => r.id === highlightedResource)) {
        const element = resourceRefs.current[highlightedResource];
        if (element) {
            setTimeout(() => {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'transition-shadow', 'duration-1000');
                setTimeout(() => {
                    element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
                }, 2000);
                 // Reset highlight after scrolling
                setHighlightedResource(null);
            }, 100);
        }
    }
}, [filteredResources, highlightedResource]);


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
  
  const handleDeleteResource = async (resourceId: string) => {
    if (!user) {
      toast({ variant: "destructive", title: "You must be logged in."});
      return;
    }
    
    try {
        await deleteResourceAction(resourceId, user.uid);
        toast({ title: "Resource deleted successfully!" });
        fetchResources();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete resource.";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="space-y-2 mb-6">
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
                  filteredResources.map(r => (
                      <ResourceCard 
                          key={r.id}
                          ref={el => resourceRefs.current[r.id] = el}
                          resource={r}
                          onEdit={() => handleOpenEditDialog(r)}
                          onDelete={() => handleDeleteResource(r.id)} />
                  ))
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
              <ResourceForm ref={addFormRef} onSubmit={handleAddFormSubmit} isSubmitting={isSubmitting} onClose={() => setIsAddDialogOpen(false)} />
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
                  onClose={() => setIsEditDialogOpen(false)}
              />
          </DialogContent>
      </Dialog>
    </div>
  );
}
