"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { useMemo } from "react";

const BALANCE_COLOR = "#60a5fa";

function formatBalanceLabel(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (value <= -1000) return `-${(Math.abs(value) / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

function BalanceDataLabel(props: { x?: number; y?: number; value?: number }) {
  const { x = 0, y = 0, value } = props;
  if (value == null || typeof value !== "number") return null;
  return (
    <text
      x={x}
      y={(y ?? 0) - 8}
      textAnchor="middle"
      fill={BALANCE_COLOR}
      fillOpacity={0.95}
      style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: "0.02em" }}
    >
      {formatBalanceLabel(value)}
    </text>
  );
}

interface BalanceData {
  month_year: string;
  balance: number;
  bank_account_id: string | null;
}

interface BalanceChartProps {
  data: BalanceData[];
  selectedAccountIds?: string[]; // If empty/null, show total. If provided, filter by accounts
}

export function BalanceChart({ data, selectedAccountIds }: BalanceChartProps) {
  // Prepare chart data - aggregate by month
  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    // Filter by selected accounts if provided
    let filteredData = data;
    if (selectedAccountIds && selectedAccountIds.length > 0) {
      filteredData = data.filter(
        (item) => item.bank_account_id && selectedAccountIds.includes(item.bank_account_id)
      );
    }

    // Group by month and sum balances
    const monthlyTotals = new Map<string, number>();

    filteredData.forEach((item) => {
      const monthKey = item.month_year;
      const currentTotal = monthlyTotals.get(monthKey) || 0;
      monthlyTotals.set(monthKey, currentTotal + Number(item.balance));
    });

    // Convert to array and sort by date
    const sorted = Array.from(monthlyTotals.entries())
      .map(([month_year, balance]) => ({
        month_year,
        balance,
      }))
      .sort((a, b) => new Date(a.month_year).getTime() - new Date(b.month_year).getTime());

    // Get last 12 months
    const last12Months = sorted.slice(-12);

    return last12Months.map((item) => ({
      month: new Date(item.month_year).toLocaleDateString("en-AU", {
        month: "short",
        year: "numeric",
      }),
      balance: item.balance,
      fullDate: item.month_year,
    }));
  }, [data, selectedAccountIds]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Add at least one balance to see the trend chart
      </div>
    );
  }

  // If only one data point, duplicate it for the chart to render
  const displayData = chartData.length === 1 ? [chartData[0], chartData[0]] : chartData;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={displayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.8} />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.3} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
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
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
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
            formatter={(value: number) => [
              `$${value.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
              "Balance",
            ]}
          />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="url(#balanceGradient)"
            strokeWidth={3}
            dot={{ fill: "#60a5fa", r: 4 }}
            activeDot={{ r: 6, fill: "#3b82f6" }}
            filter="url(#glow)"
          >
            <LabelList dataKey="balance" position="top" content={(p) => <BalanceDataLabel {...p} />} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
