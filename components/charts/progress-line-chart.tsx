"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
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
    <div className="h-full w-full m-auto min-w-0">
      
        <LineChart
          data={data}
          style={{ width:'100%', height:'100%',  maxWidth: 600, }}
          margin={{
            top: 12,
            right: 8,
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
            allowDecimals={false}
            domain={[0, data.length < 999 ? Math.round(data.length*1.8) : 999]}
            tickMargin={8}
          />
          <Tooltip
            contentStyle={{ 
              backgroundColor: "#0e1b38",
              borderColor: "#13456f",
              width: "80%",
              textWrap: "auto",
              overflowWrap: "normal"
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