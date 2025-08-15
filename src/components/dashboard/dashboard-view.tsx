
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { getDashboardStats } from "@/lib/firebase/firestore";
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
import { formatDistanceToNow } from "date-fns";

type DashboardStats = {
  summary: {
    total: string;
    completed: string;
    missed: string;
    accomplishmentRate: string;
  };
  progressChartData: {
    name: string;
    accomplished: number;
    missed: number;
  }[];
  upcomingTasks: Task[];
};


export function DashboardView() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        const dashboardStats = await getDashboardStats(user.uid);
        setStats(dashboardStats);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const handleFocus = () => {
      fetchStats();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchStats]);


  if (loading || !stats) {
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
        <SummaryTile title="Total Tasks" value={stats.summary.total} icon={ListTodo} />
        <SummaryTile title="Completed" value={stats.summary.completed} icon={CheckCircle2} />
        <SummaryTile title="Missed" value={stats.summary.missed} icon={XCircle} />
        <SummaryTile title="Accomplishment Rate" value={stats.summary.accomplishmentRate} icon={Percent} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Daily Progress</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ProgressChart data={stats.progressChartData} />
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
                {stats.upcomingTasks.length > 0 ? stats.upcomingTasks.map((task) => (
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
