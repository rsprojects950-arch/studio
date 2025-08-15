
"use client";

import { useState, useMemo, useEffect } from "react";
import { format, isPast, isToday, isFuture } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Search, Calendar as CalendarIcon, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { getTasks, addTask, updateTaskStatus, deleteTask } from "@/lib/firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type FilterType = "all" | "overdue" | "ongoing" | "upcoming";

export function TodoList() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (user) {
      setLoading(true);
      getTasks(user.uid)
        .then(setTasks)
        .catch(error => {
          console.error(error);
          toast({
            variant: "destructive",
            title: "Error fetching tasks",
            description: "Could not load tasks from the database."
          });
        })
        .finally(() => setLoading(false));
    }
  }, [user, toast]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (!task.title.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        if (filter === "all") return true;
        if (task.status === 'completed') return false; 
        if (filter === "overdue") return task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate);
        if (filter === "ongoing") return (task.dueDate && isToday(task.dueDate)) || !task.dueDate;
        if (filter === "upcoming") return task.dueDate && isFuture(task.dueDate);
        return true;
      })
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'completed' ? 1 : -1;
        }
        const aDate = a.dueDate ? a.dueDate.getTime() : Infinity;
        const bDate = b.dueDate ? b.dueDate.getTime() : Infinity;
        return aDate - bDate;
      });
  }, [tasks, searchTerm, filter]);
  
  const handleAddTask = async () => {
    if (!newTaskTitle || !user) return;
    
    setIsSubmitting(true);
    try {
      const newTaskData = { title: newTaskTitle, dueDate: newDueDate || null };
      const newTaskId = await addTask(user.uid, newTaskData);
      
      const newTask: Task = {
        id: newTaskId,
        userId: user.uid,
        title: newTaskTitle,
        status: 'ongoing',
        dueDate: newDueDate || null,
        createdAt: new Date(), // Use current date for client-side sorting
      };
      
      setTasks(prevTasks => [newTask, ...prevTasks]);
      setNewTaskTitle("");
      setNewDueDate(undefined);
      setIsDialogOpen(false);
      toast({ title: "Task added successfully" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add the new task."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: 'ongoing' | 'completed') => {
    const newStatus = currentStatus === 'ongoing' ? 'completed' : 'ongoing';
    const originalTasks = [...tasks];
    
    // Optimistically update UI
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));

    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (error) {
      // Revert UI on failure
      setTasks(originalTasks);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Could not update the task status."
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const originalTasks = [...tasks];
    
    // Optimistically update UI
    setTasks(tasks.filter(task => task.id !== taskId));

    try {
      await deleteTask(taskId);
      toast({ title: "Task deleted" });
    } catch (error) {
       // Revert UI on failure
      setTasks(originalTasks);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Could not delete the task."
      });
    }
  }
  
  const getBadgeInfo = (dueDate: Date | null, status: 'ongoing' | 'completed'): { variant: "default" | "secondary" | "destructive" | "outline", label: string } => {
    if (status === 'completed') return { variant: "default", label: "Completed" };
    if (!dueDate) return { variant: "secondary", label: "No Due Date" };
    if (isPast(dueDate) && !isToday(dueDate)) return { variant: "destructive", label: `Overdue` };
    if (isToday(dueDate)) return { variant: "outline", label: `Today` };
    if (isFuture(dueDate)) return { variant: "secondary", label: format(dueDate, "MMM d") };
    return { variant: "secondary", label: "N/A" };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search tasks..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant={filter === 'overdue' ? 'outline' : 'ghost'} onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')}>Overdue</Button>
          <Button variant={filter === 'ongoing' ? 'outline' : 'ghost'} onClick={() => setFilter(filter === 'ongoing' ? 'all' : 'ongoing')}>Ongoing</Button>
          <Button variant={filter === 'upcoming' ? 'outline' : 'ghost'} onClick={() => setFilter(filter === 'upcoming' ? 'all' : 'upcoming')}>Upcoming</Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a new task</DialogTitle>
                <DialogDescription>
                  What do you need to get done?
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="task-title" className="text-right">Task</Label>
                  <Input id="task-title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="col-span-3" placeholder="e.g. Finish the report" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="due-date" className="text-right">Due Date</Label>
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
                <Button onClick={handleAddTask} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Status</TableHead>
              <TableHead>Task</TableHead>
              <TableHead className="w-[100px] text-center">Due</TableHead>
              <TableHead className="w-[50px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-4/5" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                const badgeInfo = getBadgeInfo(task.dueDate, task.status);
                return (
                  <TableRow key={task.id} data-state={task.status === 'completed' ? 'completed' : 'ongoing'}>
                    <TableCell>
                      <Checkbox
                        checked={task.status === 'completed'}
                        onCheckedChange={() => toggleTaskStatus(task.id, task.status)}
                        aria-label="Mark task as completed"
                      />
                    </TableCell>
                    <TableCell className={cn("font-medium", task.status === 'completed' && 'line-through text-muted-foreground')}>
                      {task.title}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
                    </TableCell>
                     <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete task</span>
                       </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No tasks found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
