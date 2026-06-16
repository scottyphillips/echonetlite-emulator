/**
 * ECHONET Lite Device Plugin Interface
 * 
 * Defines the contract for device plugins that can be dynamically
 * registered and loaded into the ECHONET Lite emulator.
 */

import { InspectOptions } from "util";

// ---------------------------------------------------------------------------
// Core ECHONET Types (mirrored from echonet-lite for plugin compatibility)
// ---------------------------------------------------------------------------

/**
 * ECHONET Object (EOJ) structure.
 * Key: EOJ address (e.g., "013001")
 * Value: Property map where key is EPC code and value is array of hex bytes
 */
export type EchoObject = { [key: string]: { [key: string]: number[] } };

/**
 * ECHONET device status wrapper.
 * Contains the EOJ address, echo object definition, and enabled state.
 */
export interface EchoStatus {
  eoj: string;           // EOJ address (e.g., "013001")
  echoObject: EchoObject;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Plugin Interface
// ---------------------------------------------------------------------------

/**
 * Base interface for all ECHONET Lite device plugins.
 * 
 * Each plugin handles one or more EOJ classes and provides:
 * - EchoObject definitions for the echonet-lite library
 * - SET command handling logic
 * - State retrieval for REST API / WebSocket responses
 */
export interface DevicePlugin {
  /**
   * ECHONET EOJ class addresses this plugin handles (e.g., ["013001"])
   * Format: 6 hex characters (2-digit GC + 2-digit CC + 2-digit instance)
   */
  eojClasses: string[];

  /**
   * Plugin name for configuration lookup and identification.
   * Must match the "plugin" field in DeviceConfig.
   */
  name: string;

  /**
   * Create an EchoObject from device configuration.
   * Called during device initialization to build the ECHONET object definition.
   * 
   * @param config - Device configuration from settings file
   * @returns EchoObject ready for echonet-lite initialization
   */
  createEchoObject(config: DeviceConfig): EchoObject;

  /**
   * Handle incoming ECHONET SET commands (SETI, SETC).
   * 
   * @param echoStatus - The EchoStatus containing the target device's state
   * @param propertyCode - EPC code as hex string (e.g., "B0" for operating mode)
   * @param newValue - Array of byte values from ECHONET packet DETAIL
   * @returns true if command was handled, false otherwise
   */
  handleSet(
    echoStatus: EchoStatus,
    propertyCode: string,
    newValue: number[]
  ): boolean;

  /**
   * Get current human-readable state for REST API / WebSocket responses.
   * 
   * @returns Object with named properties and their decoded values
   */
  getState(echoStatus: EchoStatus): Record<string, any>;

  /**
   * Optional: Initialize background timers/animation loops.
   * Called when the device is enabled and emulator starts.
   * Use this for shutter position animations, bath water level simulations, etc.
   */
  startTimer?(echoStatus: EchoStatus): void;

  /**
   * Optional: Clean up resources (timers, intervals, etc.).
   * Called when the device is disabled or emulator shuts down.
   */
  dispose?(echoStatus: EchoStatus): void;
}

// ---------------------------------------------------------------------------
// Device Configuration Types
// ---------------------------------------------------------------------------

/**
 * Configuration for a single device instance.
 * Loaded from JSON configuration files (config/default.json, etc.)
 */
export interface DeviceConfig {
  /** Human-readable device name */
  name: string;

  /** Plugin class name (e.g., "homeAirConditioner", "ceilingLight") */
  plugin: string;

  /** EOJ Group Code in hex (e.g., "0x01" for HVAC) */
  eojgc: string;

  /** EOJ Class Code in hex (e.g., "0x30" for home air conditioner) */
  eojcc: string;

  /** EOJ Instance ID (1, 2, 3...) */
  instance: number;

  /** Enable/disable this device */
  enabled?: boolean;

  /** Custom Node Profile ID (fe-prefixed hex string, optional override) */
  nodeId?: string;

  /** Initial property values for the device state */
  properties?: Record<string, any>;

  /** Optional: additional EPC definitions beyond plugin defaults */
  customEpcs?: { [epc: string]: number[] };
}

// ---------------------------------------------------------------------------
// Callback Types (injected by server/index.ts into plugins)
// ---------------------------------------------------------------------------

/**
 * Callback function type for sending property change notifications (INF).
 * Used by plugins to announce state changes via ECHONET INF commands.
 */
export type SendPropertyChangedMethod = (
  echoStatus: EchoStatus,
  seoj: string,
  propertyNo: string,
  newValue: number[]
) => void;

/**
 * Callback function type for sending commands to the controller.
 * Used for instance list notifications and device change events.
 */
export type SendCommandCallback = (command: string, option?: any) => void;

// ---------------------------------------------------------------------------
// Logger Interface
// ---------------------------------------------------------------------------

export interface ILogger {
  log(message: string): void;
  dir(obj: any, options?: InspectOptions): void;
}

// ---------------------------------------------------------------------------
// Plugin Registry Types
// ---------------------------------------------------------------------------

/**
 * Map of registered plugin names to their implementations.
 */
export type PluginRegistry = Map<string, DevicePlugin>;

/**
 * Map of active device instances keyed by EOJ address.
 */
export type DeviceInstanceMap = Map<string, {
  plugin: DevicePlugin;
  status: EchoStatus;
}>;