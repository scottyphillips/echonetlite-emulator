/**
 * Ceiling Light Plugin (単機能照明)
 * 
 * ECHONET Lite EOJ Class: 0x029101 (Single-function lighting)
 * Group Code: 0x02 | Class Code: 0x91 | Instance: 0x01
 * 
 * Properties:
 * - 0x80: Operation status (ON=0x30, OFF=0x31)
 * - 0x9D: STATMAP (status announcement property map)
 * - 0x9E: SETMAP (settable property map)
 */

import {
  DevicePlugin,
  DeviceConfig,
  EchoObject,
  EchoStatus,
} from "../server/types";

export interface CeilingLightState {
  state: "on" | "off";
}

export class CeilingLightPlugin implements DevicePlugin {
  readonly eojClasses = ["029101"];
  readonly name = "ceilingLight";

  createEchoObject(config: DeviceConfig): EchoObject {
    const initialStatus: CeilingLightState = {
      state: (config.properties?.state as "on" | "off") ?? "on",
    };

    return {
      "029101": {
        // Operation status: 0x30=ON, 0x31=OFF
        "80": initialStatus.state === "on" ? [0x30] : [0x31],
        // Status announcement EPC map: 1 property (0x80)
        "9d": [0x01, 0x80],
        // Settable properties EPC map: 1 property (0x80)
        "9e": [0x01, 0x80],
      },
    };
  }

  handleSet(
    echoStatus: EchoStatus,
    propertyCode: string,
    newValue: number[]
  ): boolean {
    if (propertyCode !== "80") {
      return false;
    }

    const state = newValue[0] === 0x30 ? "on" : "off";
    echoStatus.echoObject["029101"]["80"] = newValue;

    // Trigger property change announcement if callback is set
    // (The callback is invoked by the registry/index layer)
    return true;
  }

  getState(echoStatus: EchoStatus): CeilingLightState {
    const statusBytes = echoStatus.echoObject["029101"]["80"];
    return {
      state: statusBytes && statusBytes[0] === 0x30 ? "on" : "off",
    };
  }

  startTimer?(echoStatus: EchoStatus): void {
    // No background timers needed for ceiling light
  }

  dispose?(echoStatus: EchoStatus): void {
    // No cleanup needed
  }
}