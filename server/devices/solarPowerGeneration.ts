import { EchoObject, EchoStatus } from "../types";
import { createEchoStatus, setCommonProperties } from "./baseDevice";

export interface SolarPowerGenerationStatus {
  operationStatus: "on" | "off";
  installationLocation: string;
  faultStatus: "noFault" | "faultOccurred";
  faultDescription: number;
  instantaneousElectricPowerGeneration: number; // Watts (0xe0)
  cumulativeElectricEnergyOfGeneration: number; // 0.001kWh increments (0xe1)
  cumulativeElectricEnergySold: number; // 0.001kWh increments (0xe3)
  ratedElectricPowerOfgeneration: number; // Watts (0xe8)
  systemInterconnectionType: "gridConnectionReverseFlowAcceptable" | "independentOperation" | "gridConnectionReverseFlowNotAcceptable";
  outputPowerRestraintStatus: "ongoingRestraintControl" | "ongoingRestraintExceptControl" | "ongoingRestraintUnknown" | "notRestraining" | "unknown";
}

export class SolarPowerGenerationDevice {
  readonly eoj = "027901";
  enabled: boolean = true;

  private _status: SolarPowerGenerationStatus = {
    operationStatus: "on",                           // 0x30=On, 0x31=Off
    installationLocation: "Outdoor",                  // 0x81: Installation location
    faultStatus: "noFault",                           // 0x42=No fault
    faultDescription: 0x0000,                         // 0x89: noFault (2-byte value per MRA)
    instantaneousElectricPowerGeneration: 3250,       // 0xe0: Current power generation in Watts (3250W)
    cumulativeElectricEnergyOfGeneration: 15420,      // 0xe1: Cumulative energy in 0.001kWh units (15.42 kWh)
    cumulativeElectricEnergySold: 8750,               // 0xe3: Cumulative sold energy in 0.001kWh units (8.75 kWh)
    ratedElectricPowerOfgeneration: 5000,             // 0xe8: Rated power output 5000W
    systemInterconnectionType: "gridConnectionReverseFlowAcceptable", // 0x0=Grid connection (reverse flow acceptable)
    outputPowerRestraintStatus: "notRestraining",     // 0x44=Not restraining
  };

  private _echoObject: EchoObject = {
    "027901": {
      // Mandatory EPCs (inf: required) - based on user-specified getmap
      "80": [0x30],                              // Operation status (0x80): 0x30=On, 0x31=Off (required, GET/SET)
      "88": [0x42],                              // Fault status (0x88): 0x41=Fault occurred, 0x42=No fault (required, GET)
      
      // Optional EPCs from user-specified getmap
      "81": [0x4f, 0x75, 0x74, 0x64, 0x6f, 0x6f, 0x72], // Installation location (0x81): "Outdoor" ASCII
      "84": [0x00, 0x0a],                        // Measured instantaneous power consumption (0x84): uint16, watts (10W)
      "85": [0x00, 0x00, 0x03, 0xe8],            // Measured cumulative electric energy consumption (0x85): uint32, 0.001kWh increments (1000 Wh = 1 kWh)
      "87": [0x64],                              // Current limit setting (0x87): 0-100% (100%)
      "93": [0x41],                              // Remote control setting (0x93): 0x41=Valid, 0x42=Invalid
      "99": [0x13, 0x88],                        // Power limit setting (0x99): uint16, watts (5000W)
      "a0": [0x50],                              // Output power control setting 1 (0xa0): uint8, % (80%)
      "a1": [0x13, 0x88],                        // Output power control setting 2 (0xa1): uint16, watts (5000W)
      "b7": [0x42],                              // Power-saving operation setting (0xb7): 0x41=Power saving, 0x42=Normal
      "c1": [0x43],                              // FIT contract type (0xc1): 0x41=FIT, 0x42=Non-FIT, 0x43=No setting
      "d0": [0x00],                              // System-interconnected type (0xd0): 0x0=Grid(reverse flow OK), 0x1=Independent, 0x2=Grid(no reverse flow)
      
      // NTF/SET EPCs from user-specified setmap and ntfmap
      "89": [0x00, 0x00],                          // Fault description (0x89): noFault (2-byte per MRA)
      
      // User-specified notification map EPCs
      "e0": [0x0c, 0xb8],                        // Measured instantaneous amount of electricity generated (0xe0): uint16, watts (3250W)
      "e1": [0x00, 0x00, 0x03, 0xfa],            // Measured cumulative amount of electric energy generated (0xe1): uint32, 0.001kWh (15420 * 0.001 = 15.42 kWh)
      "e3": [0x00, 0x00, 0x02, 0x62],            // Measured cumulative amount of electric energy sold (0xe3): uint32, 0.001kWh (8750 * 0.001 = 8.75 kWh)
      "e8": [0x13, 0x88],                        // Rated power generation output - System-interconnected (0xe8): uint16, watts (5000W)
      
      // Property maps (user-specified)
      // getmap: [128, 208, 224, 129, 225, 130, 131, 134, 136, 232, 137, 138, 140, 157, 158, 159]
      // ntfmap: [128, 129, 134, 136, 137]
      // setmap: [129]
      "9d": [0x05, 0x80, 0x81, 0x86, 0x88, 0x89],       // STATMAP (user-specified ntfmap: 0x80, 0x81, 0x86, 0x88, 0x89)
      "9e": [0x01, 0x81],                                // SETMAP: Only 0x81 settable per user spec (129 decimal = 0x81)
      "9f": [0x10, 0x80, 0xd0, 0xe0, 0x81, 0xe1, 0x82, 0x83, 0x86, 0x88, 0xe8, 0x89, 0x8a, 0x8c, 0x9d, 0x9e, 0x9f], // GETMAP (user-specified getmap)
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

  get status(): SolarPowerGenerationStatus {
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

  setStatus(newStatus: Partial<SolarPowerGenerationStatus>): void {
    if (newStatus.operationStatus !== undefined) {
      this._status.operationStatus = newStatus.operationStatus!;
      const statusValue = newStatus.operationStatus === "on" ? 0x30 : 0x31;
      this._echoObject["027901"]["80"] = [statusValue];
      this.notifyPropertyChanged("80");
    }

    if (newStatus.installationLocation !== undefined) {
      this._status.installationLocation = newStatus.installationLocation!;
      const locBytes: number[] = [];
      const locStr = newStatus.installationLocation;
      for (let i = 0; i < locStr.length && i < 32; i++) {
        locBytes.push(locStr.charCodeAt(i));
      }
      this._echoObject["027901"]["81"] = locBytes.length > 0 ? locBytes : [0x00];
      this.notifyPropertyChanged("81");
    }

    if (newStatus.faultStatus !== undefined) {
      this._status.faultStatus = newStatus.faultStatus!;
      const faultValue = newStatus.faultStatus === "faultOccurred" ? 0x41 : 0x42;
      this._echoObject["027901"]["88"] = [faultValue];
      this.notifyPropertyChanged("88");
    }

    if (newStatus.faultDescription !== undefined) {
      this._status.faultDescription = newStatus.faultDescription!;
      this._echoObject["027901"]["89"] = [
        (newStatus.faultDescription >> 8) & 0xFF,
        newStatus.faultDescription & 0xFF
      ];
      this.notifyPropertyChanged("89");
    }

    if (newStatus.instantaneousElectricPowerGeneration !== undefined) {
      this._status.instantaneousElectricPowerGeneration = newStatus.instantaneousElectricPowerGeneration!;
      this._echoObject["027901"]["e0"] = this.toUint16Array(newStatus.instantaneousElectricPowerGeneration);
      this.notifyPropertyChanged("e0");
    }

    if (newStatus.cumulativeElectricEnergyOfGeneration !== undefined) {
      this._status.cumulativeElectricEnergyOfGeneration = newStatus.cumulativeElectricEnergyOfGeneration!;
      this._echoObject["027901"]["e1"] = this.toUint32Array(newStatus.cumulativeElectricEnergyOfGeneration);
      this.notifyPropertyChanged("e1");
    }

    if (newStatus.cumulativeElectricEnergySold !== undefined) {
      this._status.cumulativeElectricEnergySold = newStatus.cumulativeElectricEnergySold!;
      this._echoObject["027901"]["e3"] = this.toUint32Array(newStatus.cumulativeElectricEnergySold);
      this.notifyPropertyChanged("e3");
    }

    if (newStatus.ratedElectricPowerOfgeneration !== undefined) {
      this._status.ratedElectricPowerOfgeneration = newStatus.ratedElectricPowerOfgeneration!;
      this._echoObject["027901"]["e8"] = this.toUint16Array(newStatus.ratedElectricPowerOfgeneration);
      this.notifyPropertyChanged("e8");
    }

    if (newStatus.systemInterconnectionType !== undefined) {
      this._status.systemInterconnectionType = newStatus.systemInterconnectionType!;
      const typeMap: Record<string, number> = {
        "gridConnectionReverseFlowAcceptable": 0x00,
        "independentOperation": 0x01,
        "gridConnectionReverseFlowNotAcceptable": 0x02
      };
      this._echoObject["027901"]["d0"] = [typeMap[newStatus.systemInterconnectionType] || 0x00];
      this.notifyPropertyChanged("d0");
    }

    if (newStatus.outputPowerRestraintStatus !== undefined) {
      this._status.outputPowerRestraintStatus = newStatus.outputPowerRestraintStatus!;
      const statusMap: Record<string, number> = {
        "ongoingRestraintControl": 0x41,
        "ongoingRestraintExceptControl": 0x42,
        "ongoingRestraintUnknown": 0x43,
        "notRestraining": 0x44,
        "unknown": 0x45
      };
      this._echoObject["027901"]["d1"] = [statusMap[newStatus.outputPowerRestraintStatus] || 0x44];
      this.notifyPropertyChanged("d1");
    }
  }

  setStatusFromEchoNet(propertyCodeText: string, newValue: number[]): boolean {
    const prop = propertyCodeText.toUpperCase();
    
    switch (prop) {
      case "80":
        // Operation status: 0x30=On, 0x31=Off
        this.setStatus({ operationStatus: newValue[0] === 0x30 ? "on" : "off" });
        return true;
      
      case "81":
        // Installation location (simple string)
        const locStr = newValue.map(b => String.fromCharCode(b)).join('');
        this.setStatus({ installationLocation: locStr });
        return true;
      
      case "89":
        // Fault description: 2-byte value per MRA definition
        const faultValue = (newValue[0] << 8) | newValue[1];
        this.setStatus({ faultDescription: faultValue });
        return true;
      
      default:
        return false;
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

  /**
   * Helper to get human-readable description for an EPC value
   */
  getPropertyDescription(epc: string): string {
    const epcHex = parseInt(epc, 16).toString(16).toUpperCase();
    
    switch (epcHex) {
      case "80":
        return this._status.operationStatus === "on" ? "On" : "Off";
      case "81":
        return this._status.installationLocation;
      case "88":
        return this._status.faultStatus === "noFault" ? "No fault" : "Fault occurred";
      case "89": {
        // EPC 0x89 Fault description - MRA validated enum values (2-byte)
        const faultMap: Record<number, string> = {
          0x0000: "noFault",                          // 異常なし / No fault
          0x0001: "trunOffOrUnplug",                  // スイッチを切る/コンセントを抜き再操作 / Recover by turn off or unplug
          0x0002: "resetButton",                      // リセットボタンを押し再操作 / Recover by reset button
          0x0003: "setIncorrectly",                   // セット不良 / Device set incorrectly
          0x0004: "supply",                           // 補給 / Supply
          0x0005: "cleaning",                         // 掃除（フィルタ等）/ Cleaning (filters, etc.)
          0x0006: "changingBattery",                  // 電池交換 / Changing the battery
          0x0007: "recoverOperationNoReuired",        // 復帰操作不要 / Recover operation no required
          0x0009: "userDefinable",                    // ユーザ定義領域 / User-definable domain
          0x000A: "abnormalEventOrSafety",            // 異常現象／安全装置作動 / Abnormal event or safety device
          0x0014: "switch",                           // スイッチ異常 / Fault in a switch (0x14-0x1D)
          0x001E: "sensorSystem",                     // センサ異常 / Fault in the sensor system (0x1E-0x3B)
          0x003C: "component",                        // 機能部品異常 / Fault in a component (0x3C-0x59)
          0x005A: "controlCircuitBoard",              // 制御基板異常 / Fault in control circuit board (0x5A-0x6E)
          0x006F: "userDefinable",                    // ユーザ定義領域 / User-definable domain (0x6F-0x3E8)
          0x03E9: "repairLocationUnkown",             // 修理箇所不明 / Repair location unknown
          0x03FF: "fault"                             // 異常あり / Fault
        };
        return faultMap[this._status.faultDescription] || `unknown(0x${this._status.faultDescription.toString(16).toUpperCase()})`;
      }
      case "d0": {
        const typeMap: Record<string, string> = {
          "gridConnectionReverseFlowAcceptable": "Grid (reverse flow OK)",
          "independentOperation": "Independent",
          "gridConnectionReverseFlowNotAcceptable": "Grid (no reverse flow)"
        };
        return typeMap[this._status.systemInterconnectionType] || "Unknown";
      }
      case "d1": {
        const statusMap: Record<string, string> = {
          "ongoingRestraintControl": "Ongoing restraint (control)",
          "ongoingRestraintExceptControl": "Ongoing restraint (except control)",
          "ongoingRestraintUnknown": "Ongoing restraint (unknown reason)",
          "notRestraining": "Not restraining",
          "unknown": "Unknown"
        };
        return statusMap[this._status.outputPowerRestraintStatus] || "Unknown";
      }
      case "e0":
        return `${this._status.instantaneousElectricPowerGeneration} W`;
      case "e1":
        return `${(this._status.cumulativeElectricEnergyOfGeneration / 1000).toFixed(3)} kWh`;
      case "e3":
        return `${(this._status.cumulativeElectricEnergySold / 1000).toFixed(3)} kWh`;
      case "e8":
        return `${this._status.ratedElectricPowerOfgeneration} W`;
      default:
        return "Unknown";
    }
  }
}