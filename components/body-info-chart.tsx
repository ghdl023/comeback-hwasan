"use client";

import { useState, useEffect, useMemo } from "react";
import type { BodyRecord } from "@/lib/types";
import { getAllBodyRecords } from "@/lib/firebase/firestore";
import { Card } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type MetricKey = "weight" | "skeletal_muscle" | "body_fat";

const METRICS: { key: MetricKey; label: string; unit: string; color: string; }[] = [
  { key: "weight", label: "체중", unit: "kg", color: "#f97316" },
  { key: "skeletal_muscle", label: "골격근량", unit: "kg", color: "#3b82f6" },
  { key: "body_fat", label: "체지방", unit: "%", color: "#ef4444" },
];

interface BodyInfoChartProps {
  userId: string;
  refreshKey?: number;
}

function formatDateLabel(dateStr: string): string {
  const parts = dateStr.split("-");
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
}

function getTrend(data: { value: number }[]): "up" | "down" | "flat" {
  if (data.length < 2) return "flat";
  const last = data[data.length - 1].value;
  const prev = data[data.length - 2].value;
  if (last > prev) return "up";
  if (last < prev) return "down";
  return "flat";
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-background border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-bold" style={{ color: item.color }}>
        {item.value} {item.unit || ""}
      </p>
    </div>
  );
}

function MetricChart({
  records,
  metricKey,
  label,
  unit,
  color,
}: {
  records: BodyRecord[];
  metricKey: MetricKey;
  label: string;
  unit: string;
  color: string;
}) {
  const chartData = useMemo(() => {
    return records
      .filter((r) => r[metricKey] != null)
      .map((r) => ({
        date: formatDateLabel(r.date),
        fullDate: r.date,
        value: r[metricKey] as number,
      }));
  }, [records, metricKey]);

  if (chartData.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">데이터 없음</p>
      </div>
    );
  }

  const values = chartData.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = max === min ? Math.max(1, min * 0.05) : (max - min) * 0.15;
  const domainMin = Math.floor((min - padding) * 10) / 10;
  const domainMax = Math.ceil((max + padding) * 10) / 10;

  const latest = chartData[chartData.length - 1];
  const trend = getTrend(chartData);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  return (
    <div data-testid={`chart-${metricKey}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs font-bold">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold" style={{ color }}>
            {latest.value}{unit}
          </span>
          {trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-orange-500" />}
          {trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-blue-500" />}
          {trend === "flat" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </div>

      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[domainMin, domainMax]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            {chartData.length >= 3 && (
              <ReferenceLine
                y={Math.round(avg * 10) / 10}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.4}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              dot={{ r: 3, fill: color, stroke: "white", strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: color, stroke: "white", strokeWidth: 2 }}
              unit={unit}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {chartData.length >= 2 && (
        <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
          <span>최소 {min}{unit}</span>
          <span>평균 {Math.round(avg * 10) / 10}{unit}</span>
          <span>최대 {max}{unit}</span>
        </div>
      )}
    </div>
  );
}

export function BodyInfoChart({ userId, refreshKey }: BodyInfoChartProps) {
  const [records, setRecords] = useState<BodyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getAllBodyRecords(userId)
      .then((data) => setRecords(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, refreshKey]);

  const hasAnyData = records.some(
    (r) => r.weight != null || r.skeletal_muscle != null || r.body_fat != null
  );

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!hasAnyData) {
    return (
      <Card className="p-6 text-center">
        <p className="text-xs text-muted-foreground">
          신체정보를 기록하면 변화 추이가 여기에 표시됩니다
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3" data-testid="body-info-charts">
      {METRICS.map((m) => {
        const hasData = records.some((r) => r[m.key] != null);
        if (!hasData) return null;
        return (
          <Card key={m.key} className="p-3">
            <MetricChart
              records={records}
              metricKey={m.key}
              label={m.label}
              unit={m.unit}
              color={m.color}
            />
          </Card>
        );
      })}
    </div>
  );
}
