"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
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

/* Harmonious on dark: sky blue (save) + amber (spend) – color-blind friendly, work together */
const SPEND_COLOR = "#f59e0b";
const SAVE_COLOR = "#38bdf8";
const SPEND_TREND_COLOR = "rgba(245,158,11,0.6)";
const SAVE_TREND_COLOR = "rgba(56,189,248,0.6)";

function formatDataLabel(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (value <= -1000) return `-${(Math.abs(value) / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

// Custom label so we can style it (softer, series-colored, no Excel look)
function CustomDataLabel(props: { x?: string | number; y?: string | number; value?: string | number; color: string }) {
  const { x, y, value, color } = props;
  const numX = typeof x === "number" ? x : 0;
  const numY = typeof y === "number" ? y : 0;
  const numVal = typeof value === "number" ? value : typeof value === "string" ? parseFloat(value) : NaN;
  if (value == null || Number.isNaN(numVal)) return null;
  const text = formatDataLabel(numVal);
  return (
    <text
      x={numX}
      y={numY - 8}
      textAnchor="middle"
      fill={color}
      fillOpacity={0.95}
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.02em",
      }}
    >
      {text}
    </text>
  );
}

export function SpendSaveChart({ data }: SpendSaveChartProps) {
  const [showSpend, setShowSpend] = useState(true);
  const [showSave, setShowSave] = useState(false);

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
    <div className="w-full space-y-3">
      {/* Toggles: select Spend and/or Save (default Spend only) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Show:</span>
        <button
          type="button"
          onClick={() => setShowSpend((s) => !s)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showSpend ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10"
          }`}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SPEND_COLOR }} />
          Spend
        </button>
        <button
          type="button"
          onClick={() => setShowSave((s) => !s)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showSave ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10"
          }`}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SAVE_COLOR }} />
          Save
        </button>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 24, right: 10, left: 0, bottom: 5 }}>
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
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" />
            <Line
              type="monotone"
              dataKey="spend"
              stroke={showSpend ? SPEND_COLOR : "transparent"}
              strokeWidth={2}
              dot={showSpend ? { fill: SPEND_COLOR, r: 3 } : false}
              activeDot={showSpend ? { r: 5 } : false}
              name="spend"
              connectNulls
            >
              {showSpend && (
                <LabelList dataKey="spend" position="top" content={(p: { x?: string | number; y?: string | number; value?: string | number }) => <CustomDataLabel x={p.x} y={p.y} value={p.value} color={SPEND_COLOR} />} />
              )}
            </Line>
            <Line
              type="monotone"
              dataKey="spendTrend"
              stroke={showSpend ? SPEND_TREND_COLOR : "transparent"}
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
              name="spendTrend"
              connectNulls
              legendType="none"
            />
            <Line
              type="monotone"
              dataKey="save"
              stroke={showSave ? SAVE_COLOR : "transparent"}
              strokeWidth={2}
              dot={showSave ? { fill: SAVE_COLOR, r: 3 } : false}
              activeDot={showSave ? { r: 5 } : false}
              name="save"
              connectNulls
            >
              {showSave && (
                <LabelList dataKey="save" position="top" content={(p: { x?: string | number; y?: string | number; value?: string | number }) => <CustomDataLabel x={p.x} y={p.y} value={p.value} color={SAVE_COLOR} />} />
              )}
            </Line>
            <Line
              type="monotone"
              dataKey="saveTrend"
              stroke={showSave ? SAVE_TREND_COLOR : "transparent"}
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
              name="saveTrend"
              connectNulls
              legendType="none"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
