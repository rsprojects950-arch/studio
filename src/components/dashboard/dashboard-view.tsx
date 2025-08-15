
"use client";

import { useState, useEffect, useMemo } from "react";
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
import { isPast, isToday } from "date-fns";

const upcomingTasks = [
  { id: 1, title: "Finish project proposal", due: "Tomorrow" },
  { id: 2, title: "Follow up with client", due: "Tomorrow" },
  { id: 3, title: "Prepare for team meeting", due: "In 2 days" },
];

export function DashboardView() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      getTasks(user.uid)
        .then((userTasks) => {
          setTasks(userTasks);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching tasks:", error);
          setLoading(false);
        });
    }
  }, [user]);

  const summaryStats = useMemo(() => {
    const totalTasks = tasks.length;
    const completed = tasks.filter((task) => task.status === "completed").length;
    const overdue = tasks.filter(
      (task) => task.status === "ongoing" && task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate)
    ).length;
    const accomplishmentRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    return {
      total: totalTasks.toString(),
      completed: completed.toString(),
      missed: overdue.toString(), // Assuming 'missed' means 'overdue' for now
      accomplishmentRate: `${accomplishmentRate}%`,
    };
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
            <ProgressChart />
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
                {upcomingTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell><Checkbox /></TableCell>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{task.due}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
