
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Calendar as CalendarIcon, Loader2, Trash2, Target } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ShortTermGoal } from '@/lib/types';
import { getShortTermGoals } from '@/lib/firebase/firestore';
import { createShortTermGoalAction, deleteShortTermGoalAction } from '@/lib/firebase/actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function GoalsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);

    const [goals, setGoals] = useState<ShortTermGoal[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newDueDate, setNewDueDate] = useState<Date | undefined>(undefined);

    const fetchGoals = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const userGoals = await getShortTermGoals(user.uid);
            setGoals(userGoals);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not fetch your goals."
            });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchGoals();
    }, [fetchGoals]);

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!user) return;
        
        setIsSubmitting(true);
        const formData = new FormData(event.currentTarget);
        if (newDueDate) {
            formData.set('dueDate', newDueDate.toISOString());
        }
        formData.set('userId', user.uid);

        try {
            await createShortTermGoalAction(formData);
            formRef.current?.reset();
            setNewDueDate(undefined);
            setIsDialogOpen(false);
            toast({ title: "Goal added successfully!" });
            await fetchGoals();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to add goal.";
            toast({ variant: "destructive", title: "Error", description: errorMessage });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteGoal = async (goalId: string) => {
        if(!user) return;
        try {
            await deleteShortTermGoalAction(goalId, user.uid);
            toast({ title: "Goal deleted successfully."});
            await fetchGoals();
        } catch(error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to delete goal.";
            toast({ variant: "destructive", title: "Error", description: errorMessage });
        }
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2 mb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Short Term Goals</h2>
                    <p className="text-muted-foreground">
                        Set your targets. They will become to-do items on their due date.
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Goal
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Set a new goal</DialogTitle>
                            <DialogDescription>
                                What do you want to achieve? This will turn into a task on its due date.
                            </DialogDescription>
                        </DialogHeader>
                        <form ref={formRef} onSubmit={handleFormSubmit}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="title" className="text-right">Goal</Label>
                                    <Input id="title" name="title" className="col-span-3" placeholder="e.g., Launch new feature" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="dueDate" className="text-right">Due Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn("col-span-3 justify-start text-left font-normal", !newDueDate && "text-muted-foreground")}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {newDueDate ? format(newDueDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={newDueDate} onSelect={setNewDueDate} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Set Goal
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
                                <Skeleton className="h-8 w-20" />
                            </CardContent>
                        </Card>
                    ))
                ) : goals.length > 0 ? (
                    goals.map(goal => (
                        <Card key={goal.id} className="group relative">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="h-5 w-5 text-primary" />
                                    {goal.title}
                                </CardTitle>
                                <CardDescription>
                                    Due on {format(goal.dueDate, "PPP")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                               <p className="text-sm text-muted-foreground">This will become a task on its due date.</p>
                            </CardContent>
                             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Delete goal</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete this goal. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteGoal(goal.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                             </div>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full text-center py-12">
                        <h3 className="text-lg font-semibold">No upcoming goals</h3>
                        <p className="text-muted-foreground">Click "Add Goal" to set your first target.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
