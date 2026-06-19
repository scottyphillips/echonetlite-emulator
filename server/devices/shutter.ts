import { EchoObject, EchoStatus } from "../types";
import { createEchoStatus, setCommonProperties } from "./baseDevice";

export interface ShutterStatus {
  state: "opened" | "opening" | "halfOpen" | "closing" | "closed";
  position: number; // 0:全閉、100:全開
  move: "opening" | "stopped" | "closing";
}

export class ShutterDevice {
  readonly eoj = "026301";
  enabled: boolean = true;
  
  private _status: ShutterStatus = { state: "opened", position: 100, move: "stopped" };
  private _echoObject: EchoObject = {
    "026301": {
      80: [0x30], // 動作状態
      e0: [0x43], // 開閉動作設定 開＝0x41，閉＝0x42、停止＝0x43
      ea: [0x41], // 開閉状態 全開=0x41，全閉＝0x42，開動作中＝0x43，閉動作中＝0x44，途中停止＝0x45
      "9d": [0x04, 0x80, 0xe0, 0xea], // 状変アナウンスプロパティマップ
      "9e": [0x02, 0xe0], // Setプロパティマップ
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

  get status(): ShutterStatus {
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

  setStatus(newStatus: Partial<ShutterStatus>): void {
    if (newStatus.move !== undefined) {
      this.handleMoveCommand(newStatus.move);
    }
    this.notifyPropertyChanged("e0");
    this.notifyPropertyChanged("ea");
  }

  setStatusFromEchoNet(propertyCodeText: string, newValue: number[]): boolean {
    if (propertyCodeText === "e0") {
      const move =
        newValue[0] === 0x41
          ? "opening"
          : newValue[0] === 0x42
          ? "closing"
          : "stopped";
      this.handleMoveCommand(move);
      return true;
    }
    return false;
  }

  /**
   * Tick function for timer-based state updates.
   * Called periodically to animate opening/closing.
   */
  tick(): void {
    if (this._status.move === "opening") {
      this._status.position += 20;
      if (this._status.position >= 100) {
        this._status.position = 100;
        this._status.state = "opened";
        this._status.move = "stopped";
        this._echoObject["026301"]["e0"] = [0x43]; // 停止
        this._echoObject["026301"]["ea"] = [0x41]; // 全開
        this.notifyPropertyChanged("e0");
        this.notifyPropertyChanged("ea");
      }
    }
    if (this._status.move === "closing") {
      this._status.position -= 20;
      if (this._status.position <= 0) {
        this._status.position = 0;
        this._status.state = "closed";
        this._status.move = "stopped";
        this._echoObject["026301"]["e0"] = [0x43]; // 停止
        this._echoObject["026301"]["ea"] = [0x42]; // 全閉
        this.notifyPropertyChanged("e0");
        this.notifyPropertyChanged("ea");
      }
    }
  }

  private handleMoveCommand(move: "opening" | "stopped" | "closing"): void {
    if (move === "opening") {
      if (this._status.position < 100 && this._status.move !== "opening") {
        this._status.state = "opening";
        this._status.move = "opening";
        this._echoObject["026301"]["e0"] = [0x41]; // 開
        this._echoObject["026301"]["ea"] = [0x43]; // 開動作中
      }
    } else if (move === "closing") {
      if (this._status.position > 0 && this._status.move !== "closing") {
        this._status.state = "closing";
        this._status.move = "closing";
        this._echoObject["026301"]["e0"] = [0x42]; // 閉
        this._echoObject["026301"]["ea"] = [0x44]; // 閉動作中
      }
    } else if (move === "stopped") {
      if (this._status.move !== "stopped") {
        this._status.move = "stopped";
        this._echoObject["026301"]["e0"] = [0x43]; // 停止

        if (this._status.position === 100) {
          this._status.state = "opened";
          this._echoObject["026301"]["ea"] = [0x41]; // 全開
        } else if (this._status.position === 0) {
          this._status.state = "closed";
          this._echoObject["026301"]["ea"] = [0x42]; // 全閉
        } else {
          this._status.state = "halfOpen";
          this._echoObject["026301"]["ea"] = [0x45]; // 途中停止
        }
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