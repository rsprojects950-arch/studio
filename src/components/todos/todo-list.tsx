"use client";

import { useState, useMemo } from "react";
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
import { Plus, Search, Calendar as CalendarIcon } from "lucide-react";
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

const initialTasks: Task[] = [
  { id: "1", title: "Finalize Q3 report", status: "ongoing", dueDate: new Date(new Date().setDate(new Date().getDate() - 2)) },
  { id: "2", title: "Develop new landing page", status: "ongoing", dueDate: new Date() },
  { id: "3", title: "Schedule team offsite", status: "ongoing", dueDate: new Date(new Date().setDate(new Date().getDate() + 3)) },
  { id: "4", title: "Review marketing campaign", status: "completed", dueDate: new Date(new Date().setDate(new Date().getDate() - 5)) },
  { id: "5", title: "Onboard new hire", status: "ongoing", dueDate: new Date(new Date().setDate(new Date().getDate() + 7)) },
  { id: "6", title: "Update documentation", status: "ongoing", dueDate: null },
];

type FilterType = "all" | "overdue" | "ongoing" | "upcoming";

export function TodoList() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(undefined);

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
        if (a.status !== b.status) return a.status === 'completed' ? 1 : -1;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
  }, [tasks, searchTerm, filter]);
  
  const handleAddTask = () => {
    if (!newTaskTitle) return;
    const newTask: Task = {
      id: (tasks.length + 1).toString(),
      title: newTaskTitle,
      status: 'ongoing',
      dueDate: newDueDate || null,
    };
    setTasks([newTask, ...tasks]);
    setNewTaskTitle("");
    setNewDueDate(undefined);
    setIsDialogOpen(false);
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, status: task.status === 'ongoing' ? 'completed' : 'ongoing' }
        : task
    ));
  };
  
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
                <Button onClick={handleAddTask}>Add Task</Button>
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
              <TableHead className="text-right">Deadline</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                const badgeInfo = getBadgeInfo(task.dueDate, task.status);
                return (
                  <TableRow key={task.id} data-state={task.status === 'completed' ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={task.status === 'completed'}
                        onCheckedChange={() => toggleTaskStatus(task.id)}
                        aria-label="Mark task as completed"
                      />
                    </TableCell>
                    <TableCell className={cn("font-medium", task.status === 'completed' && 'line-through text-muted-foreground')}>
                      {task.title}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
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
