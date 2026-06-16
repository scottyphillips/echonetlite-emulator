/**
 * Device Registry - Manages device plugins and instances
 * 
 * Provides centralized registration of plugin types and creation/management
 * of device instances from configuration. Replaces the hardcoded if-chain
 * dispatch in the original Controller class.
 */

import {
  DevicePlugin,
  DeviceConfig,
  EchoObject,
  EchoStatus,
  SendPropertyChangedMethod,
  SendCommandCallback,
  ILogger,
} from "./types";

interface DeviceInstance {
  plugin: DevicePlugin;
  status: EchoStatus;
}

export class DeviceRegistry {
  private pluginTypes = new Map<string, DevicePlugin>();
  private deviceInstances = new Map<string, DeviceInstance>();
  private logger: ILogger;
  private sendPropertyChanged?: SendPropertyChangedMethod;
  private sendCommandCallback?: SendCommandCallback;
  private timerDelayTime: number;

  constructor(logger: ILogger, options?: {
    sendPropertyChanged?: SendPropertyChangedMethod;
    sendCommandCallback?: SendCommandCallback;
    timerDelayTime?: number;
  }) {
    this.logger = logger;
    this.sendPropertyChanged = options?.sendPropertyChanged;
    this.sendCommandCallback = options?.sendCommandCallback;
    this.timerDelayTime = options?.timerDelayTime ?? 0;
  }

  // -----------------------------------------------------------------------
  // Plugin Type Registration
  // -----------------------------------------------------------------------

  /**
   * Register a device plugin type by name.
   * Plugins are registered once during initialization, then used to create instances.
   */
  register(plugin: DevicePlugin): void {
    if (this.pluginTypes.has(plugin.name)) {
      this.logger.log(`Warning: Overwriting plugin "${plugin.name}"`);
    }
    this.pluginTypes.set(plugin.name, plugin);
    this.logger.log(`Registered plugin: ${plugin.name} (${plugin.eojClasses.join(", ")})`);
  }

  /**
   * Get a registered plugin type by name.
   */
  getPluginType(name: string): DevicePlugin | undefined {
    return this.pluginTypes.get(name);
  }

  // -----------------------------------------------------------------------
  // Device Instance Creation
  // -----------------------------------------------------------------------

  /**
   * Create a device instance from configuration.
   * Looks up the plugin by name, creates the EchoObject, and registers the instance.
   * 
   * @param config - Device configuration
   * @returns The created EchoStatus, or null if plugin not found
   */
  createDevice(config: DeviceConfig): EchoStatus | null {
    const plugin = this.pluginTypes.get(config.plugin);
    if (!plugin) {
      this.logger.log(`Warning: Plugin "${config.plugin}" not found for device "${config.name}"`);
      return null;
    }

    const echoObject = plugin.createEchoObject(config);
    const eoj = this.buildEojAddress(config.eojgc, config.eojcc, config.instance);

    const status: EchoStatus = {
      eoj,
      echoObject,
      enabled: config.enabled ?? true,
    };

    // Store instance keyed by EOJ address + instance-specific suffix
    const key = `${eoj}${config.instance}`;
    this.deviceInstances.set(key, { plugin, status });

    if (status.enabled) {
      plugin.startTimer?.(status);
    }

    this.logger.log(`Created device: ${config.name} (${eoj})`);
    return status;
  }

  /**
   * Remove a device instance by EOJ address.
   */
  removeDevice(eoj: string): void {
    for (const entry of Array.from(this.deviceInstances.entries())) {
      const [key, instance] = entry;
      if (instance.status.eoj === eoj) {
        instance.plugin.dispose?.(instance.status);
        this.deviceInstances.delete(key);
        this.logger.log(`Removed device: ${eoj}`);
        return;
      }
    }
  }

  /**
   * Update the enabled state of a device.
   */
  setDeviceEnabled(eoj: string, enabled: boolean): void {
    for (const entry of Array.from(this.deviceInstances.entries())) {
      const [key, instance] = entry;
      if (instance.status.eoj === eoj) {
        const wasEnabled = instance.status.enabled;
        instance.status.enabled = enabled;

        if (enabled && !wasEnabled) {
          instance.plugin.startTimer?.(instance.status);
        } else if (!enabled && wasEnabled) {
          instance.plugin.dispose?.(instance.status);
        }

        this.logger.log(`Device ${eoj} enabled: ${enabled}`);
        return;
      }
    }
  }

  // -----------------------------------------------------------------------
  // EchoObject Collection (for echonet-lite initialization)
  // -----------------------------------------------------------------------

  /**
   * Get all active echo objects for echonet-lite initialization.
   * Returns flat array of all enabled device EOJ definitions.
   */
  getAllEchoObjects(): EchoObject[] {
    return Array.from(this.deviceInstances.values())
      .filter((instance): instance is DeviceInstance => instance.status.enabled)
      .map((instance) => instance.status.echoObject);
  }

  /**
   * Get all active EchoStatus entries for REST API / monitoring.
   */
  getAllStatusList(): EchoStatus[] {
    return Array.from(this.deviceInstances.values())
      .filter((instance): instance is DeviceInstance => instance.status.enabled)
      .map((instance) => instance.status);
  }

  // -----------------------------------------------------------------------
  // ECHONET Command Dispatch (replaces if-chain in Controller.setValueFromEchoNet)
  // -----------------------------------------------------------------------

  /**
   * Dispatch an ECHONET SET command to the correct plugin.
   * This replaces the hardcoded if-chain that checked EOJ keys.
   * 
   * @param echoObject - The target device's EchoObject
   * @param propertyCode - EPC code as hex string
   * @param newValue - Byte values from ECHONET packet
   * @returns true if handled, false otherwise
   */
  handleSet(
    echoObject: EchoObject,
    propertyCode: string,
    newValue: number[]
  ): boolean {
    // Find the matching device instance by checking which EOJ key exists in echoObject
    const eojKey = Object.keys(echoObject)[0];
    if (!eojKey) return false;

    for (const entry of Array.from(this.deviceInstances.entries())) {
      const [, instance] = entry;
      if (instance.status.eoj === eojKey && instance.status.enabled) {
        return instance.plugin.handleSet(
          instance.status,
          propertyCode,
          newValue
        );
      }
    }

    return false;
  }

  // -----------------------------------------------------------------------
  // State Retrieval (for REST API / WebSocket responses)
  // -----------------------------------------------------------------------

  /**
   * Get human-readable state of all devices.
   */
  getAllStates(): Record<string, any> {
    const states: Record<string, any> = {};

    for (const entry of Array.from(this.deviceInstances.entries())) {
      const [, instance] = entry;
      if (!instance.status.enabled) continue;

      const eojKey = Object.keys(instance.status.echoObject)[0];
      if (!eojKey) continue;

      const state = instance.plugin.getState(instance.status);
      states[instance.status.eoj] = {
        name: this.getDeviceName(instance.status.eoj),
        ...state,
      };
    }

    return states;
  }

  /**
   * Get human-readable state for a specific device.
   */
  getDeviceState(eoj: string): Record<string, any> | null {
    for (const entry of Array.from(this.deviceInstances.entries())) {
      const [, instance] = entry;
      if (instance.status.eoj === eoj && instance.status.enabled) {
        const eojKey = Object.keys(instance.status.echoObject)[0];
        if (!eojKey) return null;

        const state = instance.plugin.getState(instance.status);
        return {
          name: this.getDeviceName(eoj),
          ...state,
        };
      }
    }
    return null;
  }

  // -----------------------------------------------------------------------
  // Command Callbacks
  // -----------------------------------------------------------------------

  /**
   * Forward command callbacks to registered handlers.
   */
  dispatchCommand(command: string, option?: any): void {
    this.sendCommandCallback?.(command, option);
  }

  // -----------------------------------------------------------------------
  // Utility Methods
  // -----------------------------------------------------------------------

  /**
   * Build ECHONET EOJ address from components.
   */
  private buildEojAddress(eojgc: string, eojcc: string, instance: number): string {
    const gc = parseInt(eojgc, 16).toString(16).padStart(2, "0").toUpperCase();
    const cc = parseInt(eojcc, 16).toString(16).padStart(2, "0").toUpperCase();
    return `${gc}${cc}0${instance}`;
  }

  /**
   * Look up device name by EOJ address.
   */
  private getDeviceName(eoj: string): string {
    for (const entry of Array.from(this.deviceInstances.entries())) {
      const [, instance] = entry;
      if (instance.status.eoj === eoj) {
        // Name is stored in the config - we'd need to track configs separately
        // For now, return a generic name based on EOJ
        return `Device ${eoj}`;
      }
    }
    return "Unknown";
  }

  /**
   * Get count of registered devices.
   */
  getDeviceCount(): number {
    return this.deviceInstances.size;
  }

  /**
   * Get count of enabled devices.
   */
  getEnabledDeviceCount(): number {
    return Array.from(this.deviceInstances.values()).filter(
      (instance): instance is DeviceInstance => instance.status.enabled
    ).length;
  }
}