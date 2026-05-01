"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ProgressChartPoint = {
  label: string;
  progress: number;
  target: string;
  foundAt: string;
};

type ProgressLineChartProps = {
  data: ProgressChartPoint[];
};

export function ProgressLineChart({ data }: ProgressLineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-500">
        Inga fynd ännu. Starta jakten och registrera 001.
      </div>
    );
  }

  return (
    <div className="h-72 w-full min-h-1 min-w-1">
      <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
        <LineChart
          data={data}
          margin={{
            top: 12,
            right: 16,
            bottom: 8,
            left: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickMargin={8}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, 999]}
            tickMargin={8}
          />
          <Tooltip
            formatter={(value) => [`${value} / 999`, "Progress"]}
            labelFormatter={(_, payload) => {
              const point = payload?.[0]?.payload as
                | ProgressChartPoint
                | undefined;

              if (!point) return "";

              return `Nummer ${point.target} • ${point.foundAt}`;
            }}
          />
          <Line
            type="monotone"
            dataKey="progress"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}