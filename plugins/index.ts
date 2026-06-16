/**
 * Plugin Index - Exports all available device plugins
 * 
 * Import individual plugins or use getAllPlugins() to register
 * all available plugin types with a DeviceRegistry.
 */

import { CeilingLightPlugin } from "./ceilingLight";
import { DevicePlugin, ILogger } from "../server/types";

/**
 * Create and return all available plugin instances.
 * Useful for bulk registration during emulator initialization.
 */
export function getAllPlugins(logger?: ILogger): DevicePlugin[] {
  const plugins: DevicePlugin[] = [
    new CeilingLightPlugin(),
    // Add more plugins here as they are implemented:
    // new GeneralLightingPlugin(),
    // new ShutterPlugin(),
    // new ElectricLockPlugin(),
    // new BathWaterHeaterPlugin(),
    // new HomeAirConditionerPlugin(),
    // new TemperatureSensorPlugin(),
    // new HumiditySensorPlugin(),
    // new HumanDetectionSensorPlugin(),
    // new SwitchPlugin(),
  ];

  if (logger) {
    for (const plugin of plugins) {
      logger.log(`Found plugin: ${plugin.name} (${plugin.eojClasses.join(", ")})`);
    }
  }

  return plugins;
}

/**
 * Named exports for individual plugin imports
 */
export { CeilingLightPlugin } from "./ceilingLight";