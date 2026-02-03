import { Bridge } from '@iii-dev/sdk'

export const iii = new Bridge(process.env.III_BRIDGE_URL ?? 'ws://localhost:49134')

export const emitEvent = async (topic: string, data: any) => {
  await iii.invokeFunction('event.emit', { topic, data })
}

export const state = {
    get: async (group_id: string, item_id: string) => {
        return iii.invokeFunction('state.get', { group_id, item_id })
    },
    set: async (group_id: string, item_id: string, data: any) => {
        return iii.invokeFunction('state.set', { group_id, item_id, data })
    },
    delete: async (group_id: string, item_id: string) => {
        return iii.invokeFunction('state.delete', { group_id, item_id })
    },
}