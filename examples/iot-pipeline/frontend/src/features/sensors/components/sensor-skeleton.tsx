export function SensorSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-32 w-64 animate-pulse rounded bg-bg-elevated" />
        <span className="text-xs text-text-muted">Waiting for sensor data...</span>
      </div>
    </div>
  );
}
