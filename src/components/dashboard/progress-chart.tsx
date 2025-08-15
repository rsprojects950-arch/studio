
"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

const data = [
  { name: "Mon", accomplished: 0, missed: 0 },
  { name: "Tue", accomplished: 0, missed: 0 },
  { name: "Wed", accomplished: 0, missed: 0 },
  { name: "Thu", accomplished: 0, missed: 0 },
  { name: "Fri", accomplished: 0, missed: 0 },
  { name: "Sat", accomplished: 0, missed: 0 },
  { name: "Sun", accomplished: 0, missed: 0 },
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
