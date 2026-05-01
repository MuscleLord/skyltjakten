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
  index: number;
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
    <div className="h-72 w-full m-auto min-w-0">
      
        <LineChart
          data={data}
          style={{ width:'100%', aspectRatio: 1.618, maxWidth: 600, }}
          margin={{
            top: 12,
            right: 16,
            bottom: 16,
            left: -10,
          }}
          responsive
        >
          <CartesianGrid strokeDasharray="5 5" stroke="#24598e"/>
          <XAxis
            dataKey="label"
            tickMargin={8}
            minTickGap={24}
          />
          <YAxis
          scale={'auto'}
            allowDecimals={false}
            
            tickMargin={8}
          />
          <Tooltip
            contentStyle={{ 
              backgroundColor: "#0e1b38",
              borderColor: "#13456f"
            }}            
            formatter={(value) => [`${value} / 999`, "Progress"]}
            labelFormatter={(_, payload) => {
              const point = payload?.[0]?.payload as
                | ProgressChartPoint
                | undefined;

              if (!point) return "";

               return `Fynd ${point.label} • Nummer ${point.target} • ${point.foundAt}`;
            }}
          />
          <Line
            type="monotone"
            dataKey="progress"
            strokeWidth={3}
            stroke= "#d1972c"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
     
    </div>
  );
}
/**
 margin={{
            top: 12,
            right: 16,
            bottom: 8,
            left: 0,
          }} 
 **/