import { EchoObject, EchoStatus } from "../types";
import { createEchoStatus, setCommonProperties } from "./baseDevice";

export interface DoorStatus {
  state: "closed" | "opened";
  lockState: "unlocked" | "locked";
}

export class DoorDevice {
  readonly eoj = "026f01";
  enabled: boolean = true;
  
  private _status: DoorStatus = { state: "closed", lockState: "unlocked" };
  private _echoObject: EchoObject = {
    "026f01": {
      80: [0x30], // 動作状態
      e0: [0x42], // 施錠設定１  施錠＝0x41，解錠＝0x42
      e3: [0x42], // 扉開閉状態	開＝0x41，閉＝0x42
      "9d": [0x03, 0x80, 0xe0, 0xe3], // 状変アナウンスプロパティマップ
      "9e": [0x02, 0x80, 0xe0], // Setプロパティマップ
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

  get status(): DoorStatus {
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

  setStatus(newStatus: DoorStatus): void {
    const state = newStatus.state;
    if (this._status.state !== state) {
      this._status.state = state;
      this._echoObject["026f01"]["e3"] =
        state === "closed" ? [0x42] : [0x41];
      this.notifyPropertyChanged("e3");
    }

    const lockState = newStatus.lockState;
    if (this._status.lockState !== lockState) {
      this._status.lockState = lockState;
      this._echoObject["026f01"]["e0"] =
        lockState === "unlocked" ? [0x42] : [0x41];
      this.notifyPropertyChanged("e0");
    }
  }

  setStatusFromEchoNet(eoj: string, propertyCodeText: string, newValue: number[]): boolean {
    if (eoj === "026f01") {
      if (propertyCodeText === "e0") {
        const lockState = newValue[0] === 0x42 ? "unlocked" : "locked";
        this.setStatus({ ...this._status, lockState });
        return true;
      }
    }
    return false;
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

/**
 * Switch device that mirrors the door's lock state.
 * EOJ: 05fd01 (スイッチクラス JEM-A / HA 端子対応)
 */
export class SwitchDevice {
  readonly eoj = "05fd01";
  enabled: boolean = true;
  
  private _echoObject: EchoObject = {
    "05fd01": {
      80: [0x30], // 動作状態
      "9d": [0x02, 0x80], // 状変アナウンスプロパティマップ
      "9e": [0x01, 0x80], // Setプロパティマップ
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

  get echoObject(): EchoObject {
    return this._echoObject;
  }

  get echoStatus(): EchoStatus {
    return this._echoStatus;
  }

  setCommonProperties(id?: string): void {
    setCommonProperties(this._echoObject, id);
  }

  /**
   * Sync the switch state with a door's lock state.
   * unlocked = on (0x30), locked = off (0x31)
   */
  syncWithDoorLock(lockState: "unlocked" | "locked"): void {
    this._echoObject["05fd01"]["80"] =
      lockState === "unlocked" ? [0x30] : [0x31];
    this.notifyPropertyChanged("80");
  }

  setStatusFromEchoNet(propertyCodeText: string, newValue: number[]): boolean {
    if (propertyCodeText === "80") {
      const isUnlocked = newValue[0] === 0x30;
      // This triggers a door unlock command via the controller
      return true;
    }
    return false;
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