import { Bridge, RemoteFunctionHandler } from "@iii-dev/sdk";

export const iii = new Bridge(
  process.env.III_BRIDGE_URL ?? "ws://localhost:49134"
);

export const enqueue = async (topic: string, data: any) => {
  await iii.invokeFunction("event.emit", { topic, data });
};

export const call: typeof iii.invokeFunction = iii.invokeFunction.bind(iii);

type SdkFunctionConfig = Parameters<typeof iii.registerFunction>[0];
type SdkTriggerConfig = Parameters<typeof iii.registerTrigger>[0];

type FunctionConfig = Omit<SdkFunctionConfig, "function_path"> & {
  function_id: string;
};
type TriggerConfig = Omit<SdkTriggerConfig, "function_path"> & {
  function_id: string;
};

export function register(
  config: FunctionConfig,
  handler: RemoteFunctionHandler
): void;
export function register(
  config: TriggerConfig
): ReturnType<typeof iii.registerTrigger>;
export function register(
  config: FunctionConfig | TriggerConfig,
  handler?: RemoteFunctionHandler
) {
  const { function_id, ...rest } = config;
  const sdkConfig = { ...rest, function_path: function_id };

  if ("trigger_type" in config) {
    return iii.registerTrigger(sdkConfig as SdkTriggerConfig);
  } else {
    iii.registerFunction(sdkConfig as SdkFunctionConfig, handler!);
  }
}

export const state = {
  get: async (group_id: string, item_id: string) => {
    return iii.invokeFunction("state.get", { group_id, item_id });
  },
  set: async (group_id: string, item_id: string, data: any) => {
    return iii.invokeFunction("state.set", { group_id, item_id, data });
  },
  delete: async (group_id: string, item_id: string) => {
    return iii.invokeFunction("state.delete", { group_id, item_id });
  },
};
