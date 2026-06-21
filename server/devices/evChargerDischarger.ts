import { EchoObject, EchoStatus } from "../types";
import { createEchoStatus, setCommonProperties } from "./baseDevice";

export interface EvChargerDischargerStatus {
  state: "on" | "off";
  fault: boolean;
  instantaneousPower: number; // Watts
  cumulativeEnergy: number; // kWh (0.001 increments)
}

export class EvChargerDischargerDevice {
  readonly eoj = "027b01";
  enabled: boolean = true;

  private _status: EvChargerDischargerStatus = {
    state: "off",
    fault: false,
    instantaneousPower: 0,
    cumulativeEnergy: 0,
  };

  private _echoObject: EchoObject = {
    "027b01": {
      80: [0x31], // Operation status (0x80): 0x31=Off, 0x30=On
      84: [0x0B, 0xB8], // Measured instantaneous power (0x84): uint16, watts (3000W = 0x0BB8)
      85: [0x00, 0x00, 0x0E, 0x10], // Measured cumulative energy (0x85): uint32, 0.001kWh increments (3600 Wh = 3.6 kWh = 0xE10)
      88: [0x42], // Fault status (0x88): 0x42=No fault, 0x41=Fault occurred
      "9d": [0x03, 0x80, 0x88, 0x84], // Status change announcement property map
      "9e": [0x01, 0x80], // Set property map (only 0x80 is settable)
      "9f": [0x04, 0x80, 0x84, 0x85, 0x88], // Get property map
    },
  };

  private _echoStatus: EchoStatus;
  private onPropertyChanged?: (echoStatus: EchoStatus, eoj: string, propertyNo: string, newValue: number[]) => void;

  constructor(options?: { onPropertyChanged?: (echoStatus: EchoStatus, eoj: string, propertyNo: string, newValue: number[]) => void }) {
    this.onPropertyChanged = options?.onPropertyChanged;

    this._echoStatus = createEchoStatus(
      this.eoj,
      this._echoObject,
      this.enabled
    );
  }

  get status(): EvChargerDischargerStatus {
    return { ...this._status };
  }

  get echoObject(): EchoObject {
    return this._echoObject;
  }

  get echoStatus(): EchoStatus {
    return this._echoStatus;
  }

  setCommonProperties(id?: string): void {
    setCommonProperties(this._echoObject, id);
  }

  setStatus(newStatus: Partial<EvChargerDischargerStatus>): void {
    if (newStatus.state !== undefined) {
      this.handleStateChange(newStatus.state!);
    }
    if (newStatus.instantaneousPower !== undefined) {
      this._status.instantaneousPower = newStatus.instantaneousPower!;
      const powerBytes = this.toUint16Array(this._status.instantaneousPower);
      this._echoObject["027b01"]["84"] = powerBytes;
      this.notifyPropertyChanged("84");
    }
    if (newStatus.cumulativeEnergy !== undefined) {
      this._status.cumulativeEnergy = newStatus.cumulativeEnergy!;
      const energyBytes = this.toUint32Array(this._status.cumulativeEnergy);
      this._echoObject["027b01"]["85"] = energyBytes;
      this.notifyPropertyChanged("85");
    }
  }

  setStatusFromEchoNet(propertyCodeText: string, newValue: number[]): boolean {
    if (propertyCodeText === "80") {
      // Operation status: 0x30=On, 0x31=Off
      const newState = newValue[0] === 0x30 ? "on" : "off";
      this.handleStateChange(newState);
      return true;
    }
    return false;
  }

  private handleStateChange(state: "on" | "off"): void {
    if (this._status.state !== state) {
      this._status.state = state;
      const statusValue = state === "on" ? 0x30 : 0x31;
      this._echoObject["027b01"]["80"] = [statusValue];

      if (state === "on") {
        // Simulate charging power when ON
        this._status.instantaneousPower = 3000; // 3kW default charging
        const powerBytes = this.toUint16Array(this._status.instantaneousPower);
        this._echoObject["027b01"]["84"] = powerBytes;
        this.notifyPropertyChanged("84");
      } else {
        // Stop charging power when OFF
        this._status.instantaneousPower = 0;
        const powerBytes = this.toUint16Array(this._status.instantaneousPower);
        this._echoObject["027b01"]["84"] = powerBytes;
        this.notifyPropertyChanged("84");
      }

      this.notifyPropertyChanged("80");
    }
  }

  private toUint16Array(value: number): number[] {
    return [
      (value >> 8) & 0xff,
      value & 0xff,
    ];
  }

  private toUint32Array(value: number): number[] {
    return [
      (value >> 24) & 0xff,
      (value >> 16) & 0xff,
      (value >> 8) & 0xff,
      value & 0xff,
    ];
  }

  private notifyPropertyChanged(propertyNo: string): void {
    if (this.onPropertyChanged && this.enabled) {
      this.onPropertyChanged(
        this._echoStatus,
        this.eoj,
        propertyNo,
        this._echoObject[this.eoj][propertyNo]
      );
    }
  }
}