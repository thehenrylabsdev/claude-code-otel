"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = [
  "#0d9488",
  "#0369a1",
  "#b45309",
  "#7c3aed",
  "#be123c",
  "#15803d",
  "#475569",
];

export type ValueFormat = "usd" | "usd4" | "number" | "raw";

function formatValue(v: number, format: ValueFormat = "raw"): string {
  if (!Number.isFinite(v)) return "—";
  if (format === "usd") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(v);
  }
  if (format === "usd4") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(v);
  }
  if (format === "number") {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v);
  }
  return String(v);
}

function ChartShell({
  children,
  height = 260,
}: {
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }} className="min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

export function TimeSeriesArea({
  data,
  dataKey = "v",
  color = "#0d9488",
  format = "raw",
}: {
  data: Array<{ t: number; v: number; [k: string]: number | string }>;
  dataKey?: string;
  color?: string;
  format?: ValueFormat;
}) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-slate-400">No series data</p>;
  }
  return (
    <ChartShell>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="fillTeal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="t"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(t) =>
            new Date(t).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })
          }
          stroke="#94a3b8"
          fontSize={11}
        />
        <YAxis
          stroke="#94a3b8"
          fontSize={11}
          tickFormatter={(v) => formatValue(Number(v), format)}
          width={64}
        />
        <Tooltip
          labelFormatter={(t) => new Date(Number(t)).toLocaleString()}
          formatter={(value) => [formatValue(Number(value), format), "Value"]}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          fill="url(#fillTeal)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartShell>
  );
}

export function MultiLineChart({
  data,
  lines,
}: {
  data: Array<Record<string, string | number>>;
  lines: Array<{ key: string; color: string; label: string }>;
}) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-slate-400">No series data</p>;
  }
  return (
    <ChartShell>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
        <YAxis stroke="#94a3b8" fontSize={11} width={40} />
        <Tooltip />
        <Legend />
        {lines.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.label}
            stroke={l.color}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ChartShell>
  );
}

export function HorizontalBars({
  data,
  nameKey,
  valueKey,
  format = "raw",
}: {
  data: Array<Record<string, string | number>>;
  nameKey: string;
  valueKey: string;
  format?: ValueFormat;
}) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-slate-400">No data</p>;
  }
  return (
    <ChartShell height={Math.max(220, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" stroke="#94a3b8" fontSize={11} />
        <YAxis
          type="category"
          dataKey={nameKey}
          width={120}
          stroke="#94a3b8"
          fontSize={11}
        />
        <Tooltip formatter={(value) => formatValue(Number(value), format)} />
        <Bar dataKey={valueKey} fill="#0d9488" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartShell>
  );
}

export function DonutChart({
  data,
  nameKey,
  valueKey,
  format = "raw",
}: {
  data: Array<Record<string, string | number>>;
  nameKey: string;
  valueKey: string;
  format?: ValueFormat;
}) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-slate-400">No data</p>;
  }
  return (
    <ChartShell>
      <PieChart>
        <Pie
          data={data}
          dataKey={valueKey}
          nameKey={nameKey}
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatValue(Number(value), format)} />
        <Legend />
      </PieChart>
    </ChartShell>
  );
}
