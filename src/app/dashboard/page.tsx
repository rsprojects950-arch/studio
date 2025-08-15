import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProgressChart } from "@/components/dashboard/progress-chart";
import { SummaryTile } from "@/components/dashboard/summary-tile";
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

const upcomingTasks = [
  { id: 1, title: "Finish project proposal", due: "Tomorrow" },
  { id: 2, title: "Follow up with client", due: "Tomorrow" },
  { id: 3, title: "Prepare for team meeting", due: "In 2 days" },
];

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryTile title="Total Tasks" value="58" icon={ListTodo} />
        <SummaryTile title="Completed" value="42" icon={CheckCircle2} />
        <SummaryTile title="Missed" value="5" icon={XCircle} />
        <SummaryTile title="Accomplishment Rate" value="88%" icon={Percent} />
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
    </div>
  );
}
