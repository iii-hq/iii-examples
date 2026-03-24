import { useAlertStore } from "@/features/realtime/stores/alert.store";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSensorStore } from "../stores/sensor.store";
import { SensorSkeleton } from "./sensor-skeleton";

interface SensorDef {
  id: string;
  color: string;
  label: string;
  unit: string;
}

interface SensorGroup {
  title: string;
  unit: string;
  sensors: SensorDef[];
}

const SENSOR_GROUPS: SensorGroup[] = [
  {
    title: "Temperature",
    unit: "°C",
    sensors: [
      { id: "temp-001", color: "#22d3ee", label: "Temp 1", unit: "°C" },
      { id: "temp-002", color: "#34d399", label: "Temp 2", unit: "°C" },
    ],
  },
  {
    title: "Humidity",
    unit: "%",
    sensors: [
      { id: "humidity-001", color: "#fbbf24", label: "Humidity 1", unit: "%" },
      { id: "humidity-002", color: "#a78bfa", label: "Humidity 2", unit: "%" },
    ],
  },
  {
    title: "Pressure",
    unit: "hPa",
    sensors: [
      { id: "pressure-001", color: "#f472b6", label: "Pressure", unit: "hPa" },
    ],
  },
];

const SENSOR_MAP = Object.fromEntries(
  SENSOR_GROUPS.flatMap((g) => g.sensors.map((s) => [s.id, s])),
);

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-white/10 bg-[#141414] px-2.5 py-1.5 shadow-xl">
      <p className="mb-1 text-[10px] text-neutral-500">{formatTime(Number(label))}</p>
      <div className="flex flex-col gap-0.5">
        {payload.filter((p) => p.value != null).map((entry) => {
          const cfg = SENSOR_MAP[entry.dataKey];
          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-neutral-400">{cfg.label}</span>
              </span>
              <span className="font-mono text-white">{entry.value.toFixed(1)}{cfg.unit}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface MiniChartProps {
  group: SensorGroup;
  data: Record<string, number>[];
  anomalies: Array<{ id: string; sensorId?: string; bucketedTs: number; severity: string }>;
  isLast: boolean;
}

function MiniChart({ group, data, anomalies, isLast }: MiniChartProps) {
  const groupAnomalies = anomalies.filter(
    (a) => a.sensorId && group.sensors.some((s) => s.id === a.sensorId),
  );

  return (
    <div>
      {/* Header row: title + inline legend */}
      <div className="flex items-center gap-3 px-1 pb-0.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
          {group.title}
        </span>
        <div className="flex items-center gap-2.5">
          {group.sensors.map((s) => (
            <span key={s.id} className="flex items-center gap-1 text-[10px] text-neutral-500">
              <span className="inline-block h-[3px] w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div>
        <ResponsiveContainer width="100%" height={isLast ? 110 : 90}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTime}
              tick={{ fill: "#404040", fontSize: 9 }}
              axisLine={{ stroke: "#1f1f1f" }}
              tickLine={false}
              minTickGap={80}
              hide={!isLast}
              height={isLast ? 20 : 0}
            />
            <YAxis
              tick={{ fill: "#404040", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              domain={["auto", "auto"]}
              width={40}
              tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
            />
            <Tooltip content={<ChartTooltip />} />

            {group.sensors.map((sensor) => (
              <Area
                key={sensor.id}
                type="monotone"
                dataKey={sensor.id}
                stroke={sensor.color}
                fill={sensor.color}
                fillOpacity={0.1}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            ))}

            {groupAnomalies.map((a) => {
              const point = data.find((d) => d.timestamp === a.bucketedTs);
              const value = point?.[a.sensorId!];
              if (value == null) return null;
              return (
                <ReferenceDot
                  key={a.id}
                  x={a.bucketedTs}
                  y={value}
                  r={3}
                  fill="#ef4444"
                  stroke="#7f1d1d"
                  strokeWidth={1.5}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SensorChart() {
  const readings = useSensorStore((s) => s.readings);
  const alerts = useAlertStore((s) => s.alerts);

  const chartData = useMemo(() => {
    const timeMap = new Map<number, Record<string, number>>();
    for (const [sensorId, points] of Object.entries(readings)) {
      for (const point of points) {
        const ts = Math.floor(point.timestamp / 1000) * 1000;
        const entry = timeMap.get(ts) ?? { timestamp: ts };
        entry[sensorId] = point.value;
        timeMap.set(ts, entry);
      }
    }
    return Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [readings]);

  const anomalyMarkers = useMemo(() => {
    if (chartData.length === 0) return [];
    const minTs = chartData[0].timestamp;
    const maxTs = chartData[chartData.length - 1].timestamp;
    return alerts
      .filter((a) => a.sensorId && a.timestamp >= minTs && a.timestamp <= maxTs)
      .map((a) => ({
        ...a,
        bucketedTs: Math.floor(a.timestamp / 1000) * 1000,
      }));
  }, [alerts, chartData]);

  if (chartData.length === 0) {
    return <SensorSkeleton />;
  }

  return (
    <div className="flex flex-col gap-1">
      {SENSOR_GROUPS.map((group, i) => (
        <MiniChart
          key={group.title}
          group={group}
          data={chartData}
          anomalies={anomalyMarkers}
          isLast={i === SENSOR_GROUPS.length - 1}
        />
      ))}
    </div>
  );
}
