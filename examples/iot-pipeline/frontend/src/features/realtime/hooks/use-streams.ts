import { useAlertStore } from "@/features/realtime/stores/alert.store";
import { useEventStore } from "@/features/realtime/stores/event.store";
import { SENSOR_IDS, useSensorStore } from "@/features/sensors/stores/sensor.store";
import { useConnectionStore } from "@/shared/stores/connection.store";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import type { DashboardEvent, StreamAlertPayload, StreamEvent, StreamEventPayload } from "../types";

const MAX_RECONNECT_DELAY = 15_000;
const BASE_DELAY = 1_000;

/** Stream subscriptions the dashboard needs */
const SUBSCRIPTIONS = [
  ...SENSOR_IDS.map((id) => ({ streamName: "readings", groupId: id, id: "latest" })),
  ...SENSOR_IDS.map((id) => ({ streamName: "alerts", groupId: id })),
  { streamName: "events", groupId: "function_calls" },
  { streamName: "events", groupId: "worker_status" },
];

let subCounter = 0;

export function useStreams(): void {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as StreamEvent;
        if (msg.type !== "stream") return;

        const { streamName, groupId, event: streamEvent } = msg;
        if (!streamEvent) return;

        if (streamName === "readings") {
          if (streamEvent.type === "sync" || streamEvent.type === "create" || streamEvent.type === "update") {
            const data = streamEvent.data as Record<string, unknown> | undefined;
            if (!data) return;
            const sensorId = groupId;
            const value = data.value as number;
            const timestamp = data.timestamp
              ? new Date(data.timestamp as string).getTime()
              : Date.now();
            useSensorStore.getState().push(sensorId, { sensorId, value, timestamp });
          }
          return;
        }

        if (streamName === "alerts") {
          if (streamEvent.type === "create" || streamEvent.type === "sync") {
            const payload = streamEvent.data as StreamAlertPayload | undefined;
            if (!payload) return;
            useAlertStore.getState().addAlert({
              sensor_id: payload.sensor_id,
              severity: payload.severity,
              message: payload.message,
              z_score: payload.z_score,
            });
            const dashEvent: DashboardEvent = {
              type: "anomaly_alert",
              timestamp: Date.now(),
              payload: payload as unknown as Record<string, unknown>,
            };
            useEventStore.getState().addEvent(dashEvent);
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
          }
          return;
        }

        if (streamName === "events") {
          if (streamEvent.type === "create" || streamEvent.type === "sync") {
            const payload = streamEvent.data as StreamEventPayload | undefined;
            if (!payload) return;

            if (payload.type === "function_call") {
              useEventStore.getState().addEvent({
                type: "function_call",
                timestamp: payload.timestamp,
                payload: payload as unknown as Record<string, unknown>,
              });
            } else if (payload.type === "worker_status") {
              queryClient.invalidateQueries({ queryKey: ["workers"] });
              queryClient.invalidateQueries({ queryKey: ["functions"] });
              useEventStore.getState().addEvent({
                type: "worker_status",
                timestamp: payload.timestamp,
                payload: payload as unknown as Record<string, unknown>,
              });
              useAlertStore.getState().addWorkerEvent(
                payload as unknown as Record<string, unknown>,
              );
            }
          }
          return;
        }
      } catch {
        // Ignore malformed messages
      }
    },
    [queryClient],
  );

  const connect = useCallback(() => {
    const wsUrl = `ws://${window.location.host}/streams`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      attemptsRef.current = 0;
      useConnectionStore.getState().setConnected();

      for (const sub of SUBSCRIPTIONS) {
        const joinMsg = {
          type: "join",
          data: {
            subscriptionId: `sub-${++subCounter}`,
            streamName: sub.streamName,
            groupId: sub.groupId,
            ...("id" in sub ? { id: sub.id } : {}),
          },
        };
        ws.send(JSON.stringify(joinMsg));
      }
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      useConnectionStore.getState().setDisconnected();
      wsRef.current = null;

      const attempt = attemptsRef.current;
      attemptsRef.current = attempt + 1;
      const delay = Math.min(BASE_DELAY * 2 ** attempt, MAX_RECONNECT_DELAY);
      const jitter = delay * 0.3 * Math.random();
      timerRef.current = setTimeout(connect, delay + jitter);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [handleMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);
}
