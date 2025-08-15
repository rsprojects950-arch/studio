"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

const data = [
  { name: "Mon", accomplished: 8, missed: 2 },
  { name: "Tue", accomplished: 10, missed: 1 },
  { name: "Wed", accomplished: 5, missed: 3 },
  { name: "Thu", accomplished: 12, missed: 0 },
  { name: "Fri", accomplished: 7, missed: 1 },
  { name: "Sat", accomplished: 9, missed: 2 },
  { name: "Sun", accomplished: 4, missed: 4 },
];

export function ProgressChart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
          }}
          labelStyle={{ color: "hsl(var(--card-foreground))" }}
          cursor={{ fill: "hsl(var(--muted))" }}
        />
        <Bar dataKey="accomplished" name="Accomplished" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="missed" name="Missed" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
