import { EchoObject, EchoStatus } from "../types";
import { createEchoStatus, setCommonProperties } from "./baseDevice";

export interface BathWaterHeaterStatus {
  state: "empty" | "supply" | "drainage" | "full";
  auto: "off" | "on";
  temp: number;
  waterLevel: number; // 0:空、100:Full
}

export class BathWaterHeaterDevice {
  readonly eoj = "026b01";
  enabled: boolean = true;
  
  private _status: BathWaterHeaterStatus = {
    state: "empty",
    auto: "off",
    temp: 41,
    waterLevel: 0,
  };
  private _echoObject: EchoObject = {
    "026b01": {
      80: [0x30], //   動作状態	0x80	0x30
      b0: [0x41], //   沸き上げ自動設定	0xB0	自動沸き上げ＝0x41
      b2: [0x40], //   沸き上げ中状態	0xB2	沸き上げ中＝0x41
      c0: [0x42], //   昼間沸き増し許可設定	0xC0	昼間沸き増し禁止＝0x42
      c3: [0x42], //   給湯中状態	0xC3	非給湯中=0x42	(湯はりは除く)
      e3: [0x42], //   風呂自動モード設定	0xE3	自動入＝0x41，自動解除＝0x42
      c7: [0x00], //   エネルギーシフト参加状態	0xC7	不参加	0x00
      c8: [0x14], //   沸き上げ開始基準時刻	0xC8	20 時 0x14
      c9: [0x01], //   エネルギーシフト回数	0xC9	1 回 0x01
      ca: [0x00], //   昼間沸き上げシフト時刻１	0xCA	0x00：クリア状態
      cb: Array.from(new Array(32)).map(() => 0x00), //   昼間沸き上げシフト時刻１での沸き上げ予測電力量
      cc: Array.from(new Array(32)).map(() => 0x00), //   時間当たり消費電力量 1
      cd: [0x00], //   昼間沸き上げシフト時刻 2	0xCD	0x00
      ce: Array.from(new Array(24)).map(() => 0x00), //   昼間沸き上げシフト時刻２での沸き上げ予測電力量
      cf: Array.from(new Array(12)).map(() => 0x00), //   時間当たり消費電力量 2	0xCF	0x0000
      d3: [41], // 風呂温度設定値	0xD3	0x00～0x64 (0～100℃)
      ea: [0x42], // 風呂動作状態監視	0xEA	湯張り中=0x41、保温中=0x43、停止中=0x42
      "9d": [0x07, 0x80, 0xb0, 0xb2, 0xc3, 0xd3, 0xea], // 状変アナウンスプロパティマップ
      "9e": [0x04, 0x80, 0xb0, 0xd3, 0xe3], // Setプロパティマップ
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

  get status(): BathWaterHeaterStatus {
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

  setStatus(newStatus: Partial<BathWaterHeaterStatus>): void {
    if (newStatus.auto !== undefined) {
      this.handleAutoChange(newStatus.auto!);
    }
    if (newStatus.temp !== undefined) {
      this.handleTempChange(newStatus.temp!);
    }
  }

  setStatusFromEchoNet(propertyCodeText: string, newValue: number[]): boolean {
    const newStatus: BathWaterHeaterStatus = {
      auto: this._status.auto,
      state: this._status.state,
      temp: this._status.temp,
      waterLevel: this._status.waterLevel,
    };

    if (propertyCodeText === "d3") {
      let newTemp = newValue[0];
      if (newTemp < 30) newTemp = 30;
      if (newTemp > 60) newTemp = 60;
      newStatus.temp = newTemp;
      this.setStatus(newStatus);
      return true;
    } else if (propertyCodeText === "e3") {
      //   風呂自動モード設定	0xE3	自動入＝0x41，自動解除＝0x42
      newStatus.auto = newValue[0] === 0x41 ? "on" : "off";
      this.setStatus(newStatus);
      return true;
    }
    return false;
  }

  /**
   * Tick function for timer-based water level changes.
   * Called periodically when auto mode is active.
   */
  tick(): void {
    if (this._status.auto === "on" && this._status.waterLevel < 100) {
      this._status.waterLevel += 20;
      if (this._status.waterLevel >= 100) {
        this._status.waterLevel = 100;
        this._status.state = "full";
        this._echoObject["026b01"]["ea"] = [0x43]; // 保温中=0x43
        this.notifyPropertyChanged("ea");
      } else {
        this._status.state = "supply";
        this._echoObject["026b01"]["ea"] = [0x41]; // 湯張り中=0x41
        this.notifyPropertyChanged("ea");
      }
    } else if (this._status.auto === "off" && this._status.waterLevel > 0) {
      this._status.waterLevel -= 20;
      if (this._status.waterLevel <= 0) {
        this._status.waterLevel = 0;
        this._status.state = "empty";
        this._echoObject["026b01"]["ea"] = [0x42]; // 停止中=0x42
        this.notifyPropertyChanged("ea");
      } else {
        this._status.state = "drainage";
        this._echoObject["026b01"]["ea"] = [0x42]; // 停止中=0x42
        this.notifyPropertyChanged("ea");
      }
    }
  }

  private handleAutoChange(auto: "on" | "off"): void {
    if (this._status.auto !== auto) {
      this._status.auto = auto;
      if (auto === "on") {
        this._echoObject["026b01"]["e3"] = [0x41]; // 自動入＝0x41
        this.notifyPropertyChanged("e3");

        if (this._status.waterLevel < 100) {
          this._status.state = "supply";
          this._echoObject["026b01"]["ea"] = [0x41]; // 湯張り中=0x41
          this.notifyPropertyChanged("ea");
        } else if (this._status.waterLevel === 100) {
          this._status.state = "full";
          this._echoObject["026b01"]["ea"] = [0x43]; // 保温中=0x43
          this.notifyPropertyChanged("ea");
        }
      } else {
        this._echoObject["026b01"]["e3"] = [0x42]; // 自動解除＝0x42
        this.notifyPropertyChanged("e3");

        if (this._status.waterLevel > 0) {
          this._status.state = "drainage";
          this._echoObject["026b01"]["ea"] = [0x42]; // 停止中=0x42
          this.notifyPropertyChanged("ea");
        } else if (this._status.waterLevel === 0) {
          this._status.state = "empty";
          this._echoObject["026b01"]["ea"] = [0x42]; // 停止中=0x42
          this.notifyPropertyChanged("ea");
        }
      }
    }
  }

  private handleTempChange(temp: number): void {
    if (30 <= temp && temp <= 60) {
      if (this._status.temp !== temp) {
        this._status.temp = temp;
        this._echoObject["026b01"]["d3"] = [temp];
        this.notifyPropertyChanged("d3");
      }
    }
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