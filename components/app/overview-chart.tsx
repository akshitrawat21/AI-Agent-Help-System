"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Day = {
  label: string;
  conversations: number;
  escalations: number;
};

/**
 * Conversation volume with the escalated share stacked underneath, so the gap
 * between the two bands *is* the assistant's contribution — the one thing worth
 * reading off this chart at a glance.
 */
export function OverviewChart({ days }: { days: Day[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={days}
          margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
        >
          <defs>
            <linearGradient id="handled" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="escalated" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.04} />
            </linearGradient>
          </defs>

          {/* Horizontal rules only — vertical gridlines add noise, not meaning. */}
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="label"
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontSize: 12,
              boxShadow: "0 8px 32px oklch(0 0 0 / 0.12)",
              color: "var(--popover-foreground)",
            }}
            labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4 }}
          />
          <Area
            type="monotone"
            dataKey="conversations"
            name="Conversations"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#handled)"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="escalations"
            name="Escalated"
            stroke="var(--chart-4)"
            strokeWidth={2}
            fill="url(#escalated)"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
