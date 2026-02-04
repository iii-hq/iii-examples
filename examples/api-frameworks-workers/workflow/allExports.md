### Classes (2)

- `Bridge` — main WebSocket client
- `WorkerMetricsCollector` — CPU/memory/event-loop metrics

### Constants (6)

- `DEFAULT_BRIDGE_RECONNECTION_CONFIG`
- `DEFAULT_INVOCATION_TIMEOUT_MS`
- `EngineFunctions` — `{ LIST_FUNCTIONS, LIST_WORKERS, REGISTER_WORKER }`
- `EngineTriggers` — `{ FUNCTIONS_AVAILABLE, LOG }`
- `LogFunctions` — `{ INFO, WARN, ERROR, DEBUG }`
- `SeverityNumber` — OpenTelemetry enum (re-export)
- `SpanStatusCode` — OpenTelemetry enum (re-export)

### Functions (20)

- `currentSpanId`
- `currentTraceId`
- `extractBaggage`
- `extractContext`
- `extractTraceparent`
- `getAllBaggage`
- `getBaggageEntry`
- `getContext` — **core: execution context access**
- `getLogger`
- `getMeter`
- `getTracer`
- `initOtel`
- `injectBaggage`
- `injectTraceparent`
- `registerWorkerGauges`
- `removeBaggageEntry`
- `safeStringify`
- `setBaggageEntry`
- `shutdownOtel`
- `stopWorkerGauges`
- `withContext`
- `withSpan`

### Types (39)

**Core SDK types:**

- `ApiRequest`
- `ApiResponse`
- `BridgeConnectionState`
- `BridgeOptions`
- `BridgeReconnectionConfig`
- `ConnectionStateCallback`
- `Context`
- `FunctionInfo` (also aliased as `FunctionMessage`)
- `FunctionsAvailableCallback`
- `LogCallback`
- `LogConfig`
- `LogSeverityLevel`
- `Logger`
- `RemoteFunctionHandler`
- `WorkerGaugesOptions`
- `WorkerInfo`
- `WorkerMetrics`
- `WorkerStatus`

**Telemetry types (re-exports from OpenTelemetry):**

- `Meter`
- `OtelConfig`
- `OtelLogEvent`
- `OtelLogger` (aliased from `Logger$1`)
- `Span`

**Stream types:**

- `IStream`
- `StreamAuthInput`
- `StreamAuthResult`
- `StreamContext`
- `StreamDeleteInput`
- `StreamGetGroupInput`
- `StreamGetInput`
- `StreamJoinLeaveEvent`
- `StreamJoinResult`
- `StreamListGroupsInput`
- `StreamSetInput`
- `StreamSetResult`
- `StreamUpdateInput`
- `StreamUpdateResult`
- `UpdateDecrement`
- `UpdateIncrement`
- `UpdateMerge`
- `UpdateOp`
- `UpdateRemove`
- `UpdateSet`

---

### Summary by category

| Category        | Count  |
| --------------- | ------ |
| Classes         | 2      |
| Constants/Enums | 7      |
| Functions       | 22     |
| Types           | 39     |
| **Total**       | **70** |

This validates the concern in your design doc—~50% of the export surface is telemetry-related (`otel*`, `*Span*`, `*Baggage*`, `*tracer*`, `*meter*`). The core SDK primitives are buried in there.

## Node tree recursed list

```text
Bridge (class/fn)
  .clearReconnectTimeout (fn)
  .connect (fn)
  .createStream (fn)
  .getConnectionState (fn)
  .invokeFunction (fn)
  .invokeFunctionAsync (fn)
  .isOpen (fn)
  .listFunctions (fn)
  .listWorkers (fn)
  .logError (fn)
  .on (fn)
  .onConnectionStateChange (fn)
  .onFunctionsAvailable (fn)
  .onInvocationResult (fn)
  .onInvokeFunction (fn)
  .onLog (fn)
  .onMessage (fn)
  .onRegisterTrigger (fn)
  .onSocketClose (fn)
  .onSocketError (fn)
  .onSocketOpen (fn)
  .registerFunction (fn)
  .registerService (fn)
  .registerTrigger (fn)
  .registerTriggerType (fn)
  .registerWorkerMetadata (fn)
  .scheduleReconnect (fn)
  .sendMessage (fn)
  .sendMessageRaw (fn)
  .setConnectionState (fn)
  .severityTextToNumber (fn)
  .shutdown (fn)
  .startMetricsReporting (fn)
  .stopMetricsReporting (fn)
  .unregisterTriggerType (fn)
DEFAULT_BRIDGE_RECONNECTION_CONFIG (object)
  backoffMultiplier (number)
  initialDelayMs (number)
  jitterFactor (number)
  maxDelayMs (number)
  maxRetries (number)
DEFAULT_INVOCATION_TIMEOUT_MS (number)
EngineFunctions (object)
  LIST_FUNCTIONS (string)
  LIST_WORKERS (string)
  REGISTER_WORKER (string)
EngineTriggers (object)
  FUNCTIONS_AVAILABLE (string)
  LOG (string)
LogFunctions (object)
  DEBUG (string)
  ERROR (string)
  INFO (string)
  WARN (string)
Logger (class/fn)
  .debug (fn)
  .emit (fn)
  .error (fn)
  .info (fn)
  .otelLogger (object)
  .warn (fn)
SeverityNumber (object)
  0 (string)
  1 (string)
  10 (string)
  11 (string)
  12 (string)
  13 (string)
  14 (string)
  15 (string)
  16 (string)
  17 (string)
  18 (string)
  19 (string)
  2 (string)
  20 (string)
  21 (string)
  22 (string)
  23 (string)
  24 (string)
  3 (string)
  4 (string)
  5 (string)
  6 (string)
  7 (string)
  8 (string)
  9 (string)
  DEBUG (number)
  DEBUG2 (number)
  DEBUG3 (number)
  DEBUG4 (number)
  ERROR (number)
  ERROR2 (number)
  ERROR3 (number)
  ERROR4 (number)
  FATAL (number)
  FATAL2 (number)
  FATAL3 (number)
  FATAL4 (number)
  INFO (number)
  INFO2 (number)
  INFO3 (number)
  INFO4 (number)
  TRACE (number)
  TRACE2 (number)
  TRACE3 (number)
  TRACE4 (number)
  UNSPECIFIED (number)
  WARN (number)
  WARN2 (number)
  WARN3 (number)
  WARN4 (number)
SpanStatusCode (object)
  0 (string)
  1 (string)
  2 (string)
  ERROR (number)
  OK (number)
  UNSET (number)
WorkerMetricsCollector (class/fn)
  .collect (fn)
  .startEventLoopMonitoring (fn)
  .stopMonitoring (fn)
currentSpanId (class/fn)
currentTraceId (class/fn)
extractBaggage (class/fn)
extractContext (class/fn)
extractTraceparent (class/fn)
getAllBaggage (class/fn)
getBaggageEntry (class/fn)
getContext (fn)
getLogger (class/fn)
getMeter (class/fn)
getTracer (class/fn)
initOtel (class/fn)
injectBaggage (class/fn)
injectTraceparent (class/fn)
registerWorkerGauges (class/fn)
removeBaggageEntry (class/fn)
safeStringify (class/fn)
setBaggageEntry (class/fn)
shutdownOtel (fn)
stopWorkerGauges (class/fn)
withContext (fn)
withSpan (fn)
```
