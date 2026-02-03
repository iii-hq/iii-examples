import { Bridge, RemoteFunctionHandler } from "@iii-dev/sdk";

export const iii = new Bridge(
  process.env.III_BRIDGE_URL ?? "ws://localhost:49134"
);

export const enqueue = async (topic: string, data: any) => {
  await iii.invokeFunction("event.emit", { topic, data });
};

export const call: typeof iii.invokeFunction = iii.invokeFunction.bind(iii);
export const callAsync: typeof iii.invokeFunctionAsync =
  iii.invokeFunctionAsync.bind(iii);

type SdkFunctionConfig = Parameters<typeof iii.registerFunction>[0];
type SdkTriggerConfig = Parameters<typeof iii.registerTrigger>[0];

type FunctionConfig = Omit<SdkFunctionConfig, "function_path"> & { id: string };

export function registerFunction(
  config: FunctionConfig,
  handler: RemoteFunctionHandler
): void {
  const { id, ...rest } = config;
  iii.registerFunction({ ...rest, function_path: id }, handler);
}

export const registerTrigger: typeof iii.registerTrigger = iii.registerTrigger;

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
