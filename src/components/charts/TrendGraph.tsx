import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAppStore } from "../../store/useAppStore";
import styles from "./TrendGraph.module.css";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.tooltip}>
        <div className={styles.tooltipTime}>{label}</div>
        <div className={styles.tooltipValue}>
          <span className={styles.tooltipLabel}>Reports:</span>
          <span className={styles.tooltipCount}>{payload[0].value}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const TrendGraph: React.FC = () => {
  const trendData = useAppStore((state) => state.trendData);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>24-Hour Reporting Trend</h3>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={trendData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border-light)"
            />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 12, fill: "var(--text-muted)" }}
              tickMargin={10}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--text-muted)" }}
              tickMargin={10}
              axisLine={false}
              tickLine={false}
              label={{
                value: "Reports/hr",
                angle: -90,
                position: "insideLeft",
                offset: -10,
                dx: -15, // Offset to prevent overlap with tick labels
                style: {
                  fill: "var(--text-muted)",
                  fontSize: 12,
                  fontWeight: 500,
                },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="stepAfter"
              dataKey="count"
              stroke="var(--accent)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCount)"
              dot={{
                r: 4,
                fill: "var(--bg-surface)",
                stroke: "var(--accent)",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: "var(--accent)",
                stroke: "var(--bg-surface)",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
