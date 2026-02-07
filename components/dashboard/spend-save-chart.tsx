"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { useMemo } from "react";

export interface SpendSavePoint {
  month_year: string;
  spend: number | null;
  save: number | null;
}

interface SpendSaveChartProps {
  data: SpendSavePoint[];
}

function linearTrend(values: (number | null)[]): (number | null)[] {
  const valid = values.map((v, i) => (v != null ? { x: i, y: v } : null)).filter((p): p is { x: number; y: number } => p != null);
  if (valid.length < 2) return values.map(() => null);
  const n = valid.length;
  const sumX = valid.reduce((a, p) => a + p.x, 0);
  const sumY = valid.reduce((a, p) => a + p.y, 0);
  const sumXY = valid.reduce((a, p) => a + p.x * p.y, 0);
  const sumX2 = valid.reduce((a, p) => a + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
  const intercept = sumY / n - slope * (sumX / n);
  return values.map((v, i) => (v != null ? slope * i + intercept : null));
}

export function SpendSaveChart({ data }: SpendSaveChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...data]
      .filter((d) => d.spend != null || d.save != null)
      .sort((a, b) => new Date(a.month_year).getTime() - new Date(b.month_year).getTime());
    const last12 = sorted.slice(-12);
    if (last12.length === 0) return [];
    // Exclude the first (oldest) month from the chart
    const chartMonths = last12.slice(1);
    if (chartMonths.length === 0) return [];

    const spendValues = chartMonths.map((d) => d.spend);
    const saveValues = chartMonths.map((d) => d.save);
    const spendTrend = linearTrend(spendValues);
    const saveTrend = linearTrend(saveValues);

    return chartMonths.map((d, i) => ({
      month: new Date(d.month_year).toLocaleDateString("en-AU", { month: "short", year: "numeric" }),
      fullDate: d.month_year,
      spend: d.spend ?? undefined,
      save: d.save ?? undefined,
      spendTrend: spendTrend[i] ?? undefined,
      saveTrend: saveTrend[i] ?? undefined,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Add income and balances to see spend and save over time
      </div>
    );
  }

  const displayData = chartData.length === 1 ? [chartData[0], chartData[0]] : chartData;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={displayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="month"
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: "12px" }}
            tick={{ fill: "rgba(255,255,255,0.6)" }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: "12px" }}
            tick={{ fill: "rgba(255,255,255,0.6)" }}
            tickFormatter={(value) => `$${Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
          />
          <Tooltip
            wrapperClassName="chart-tooltip"
            contentStyle={{
              backgroundColor: "rgba(9, 9, 11, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "0.5rem",
              color: "#fff",
              fontSize: "12px",
              padding: "8px 12px",
            }}
            labelStyle={{ color: "rgba(255,255,255,0.8)", fontSize: "12px" }}
            itemStyle={{ fontSize: "12px" }}
            formatter={(value: number, name: string) => [
              `$${value.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
              name === "spend" ? "Spend" : name === "save" ? "Save" : name === "spendTrend" ? "Spend trend" : "Save trend",
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px" }}
            formatter={(value) => (value === "spend" ? "Spend" : value === "save" ? "Save" : "")}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" />
          <Line type="monotone" dataKey="spend" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", r: 3 }} activeDot={{ r: 5 }} name="spend" connectNulls />
          <Line type="monotone" dataKey="save" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 3 }} activeDot={{ r: 5 }} name="save" connectNulls />
          <Line type="monotone" dataKey="spendTrend" stroke="rgba(245,158,11,0.6)" strokeWidth={1} strokeDasharray="3 3" dot={false} name="spendTrend" connectNulls legendType="none" />
          <Line type="monotone" dataKey="saveTrend" stroke="rgba(34,197,94,0.6)" strokeWidth={1} strokeDasharray="3 3" dot={false} name="saveTrend" connectNulls legendType="none" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
