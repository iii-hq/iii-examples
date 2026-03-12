export type ThresholdConfig = {
  sensor_id: string
  threshold: number
}

type TriggerConfig<TConfig> = {
  id: string
  function_id: string
  config: TConfig
}

type TriggerHandler<TConfig> = {
  registerTrigger(config: TriggerConfig<TConfig>): Promise<void>
  unregisterTrigger(config: TriggerConfig<TConfig>): Promise<void>
}

export class ThresholdTriggerHandler implements TriggerHandler<ThresholdConfig> {
  private triggers = new Map<string, { function_id: string; config: ThresholdConfig }>()

  async registerTrigger(trigger: { id: string; function_id: string; config: ThresholdConfig }): Promise<void> {
    this.triggers.set(trigger.id, { function_id: trigger.function_id, config: trigger.config })
    console.log(`[threshold] Registered trigger ${trigger.id} for sensor ${trigger.config.sensor_id} (threshold: ${trigger.config.threshold})`)
  }

  async unregisterTrigger(trigger: { id: string; function_id: string; config: ThresholdConfig }): Promise<void> {
    this.triggers.delete(trigger.id)
  }

  checkReading(sensorId: string, value: number, iii: { callVoid: (fn: string, data: unknown) => void }): void {
    for (const [triggerId, { function_id, config }] of this.triggers) {
      if (config.sensor_id === sensorId && value > config.threshold) {
        iii.callVoid(function_id, {
          trigger_id: triggerId,
          sensor_id: sensorId,
          value,
          threshold: config.threshold,
          exceeded_by: value - config.threshold,
        })
      }
    }
  }
}
