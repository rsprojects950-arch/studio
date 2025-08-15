
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { getTasks } from "@/lib/firebase/firestore";
import type { Task } from "@/lib/types";
import { SummaryTile } from "@/components/dashboard/summary-tile";
import { ProgressChart } from "@/components/dashboard/progress-chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListTodo, CheckCircle2, XCircle, Percent, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { isPast, isToday, formatDistanceToNow, isFuture, startOfWeek, addDays, format, isSameDay } from "date-fns";

export function DashboardView() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        const userTasks = await getTasks(user.uid);
        setTasks(userTasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const handleFocus = () => {
      fetchTasks();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchTasks]);

  const summaryStats = useMemo(() => {
    const totalTasks = tasks.length;
    const completed = tasks.filter((task) => task.status === "completed").length;
    const overdue = tasks.filter(
      (task) => task.dueDate && task.status === "ongoing" && isPast(task.dueDate) && !isToday(task.dueDate)
    ).length;
    const accomplishmentRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    return {
      total: totalTasks.toString(),
      completed: completed.toString(),
      missed: overdue.toString(),
      accomplishmentRate: `${accomplishmentRate}%`,
    };
  }, [tasks]);

  const upcomingTasks = useMemo(() => {
    return tasks
      .filter(task => task.status === 'ongoing' && task.dueDate && isFuture(task.dueDate))
      .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
      .slice(0, 3);
  }, [tasks]);

  const progressChartData = useMemo(() => {
    const today = new Date();
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekData = Array.from({ length: 7 }).map((_, i) => {
      const day = addDays(startOfThisWeek, i);
      return {
        name: format(day, "EEE"),
        accomplished: 0,
        missed: 0,
      };
    });

    tasks.forEach(task => {
        if(task.dueDate) {
            const taskDate = task.dueDate;
            const dayOfWeek = format(taskDate, "EEE");
            const weekDayEntry = weekData.find(d => d.name === dayOfWeek);

            if(weekDayEntry) {
                if (task.status === 'completed' && isSameDay(task.dueDate, taskDate)) {
                    weekDayEntry.accomplished += 1;
                } else if (task.status === 'ongoing' && isPast(taskDate) && !isToday(taskDate)) {
                    weekDayEntry.missed += 1;
                }
            }
        }
    });

    return weekData;
  }, [tasks]);


  if (loading) {
    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Skeleton className="col-span-4 h-80" />
            <Skeleton className="col-span-4 lg:col-span-3 h-80" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryTile title="Total Tasks" value={summaryStats.total} icon={ListTodo} />
        <SummaryTile title="Completed" value={summaryStats.completed} icon={CheckCircle2} />
        <SummaryTile title="Missed" value={summaryStats.missed} icon={XCircle} />
        <SummaryTile title="Accomplishment Rate" value={summaryStats.accomplishmentRate} icon={Percent} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Daily Progress</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ProgressChart data={progressChartData} />
          </CardContent>
        </Card>

        <Card className="col-span-4 lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Tasks</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/todos">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingTasks.length > 0 ? upcomingTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell><Checkbox disabled /></TableCell>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell className="text-right">
                      {task.dueDate && <Badge variant="outline">{formatDistanceToNow(task.dueDate, { addSuffix: true })}</Badge>}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No upcoming tasks.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
