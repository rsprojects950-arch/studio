
'use client';

import { forwardRef } from 'react';
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Resource } from '@/lib/types';


export const ResourceForm = forwardRef<
    HTMLFormElement,
    {
        resource?: Resource | null;
        onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
        isSubmitting: boolean;
        onClose: () => void;
    }
>(({ resource, onSubmit, isSubmitting, onClose }, ref) => {
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
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {resource ? 'Save Changes' : 'Add Resource'}
                </Button>
            </DialogFooter>
        </form>
    );
});
ResourceForm.displayName = 'ResourceForm';
