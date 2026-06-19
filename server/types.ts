export type EchoObject = { [key: string]: { [key: string]: number[] } };

export interface EchoStatus {
  eoj: string;
  echoObject: EchoObject;
  enabled: boolean;
}

export interface ILogger {
  log: (log: string) => void;
  dir: (obj: any, options?: import("util").InspectOptions) => void;
}

export type SendPropertyChangedMethod = (
  echoStatus: EchoStatus,
  soej: string,
  propertyNo: string,
  newValue: number[]
) => void;

// Device Status Interfaces

export interface CellingLightStatus {
  state: "on" | "off";
}

export interface SensorMeterStatus {
  temp: number;
  hum: number;
}

export interface MotionSensorStatus {
  state: "detected" | "notDetected";
}

export interface FloorLightStatus {
  state: "on" | "off";
  color: "lamp" | "white" | "neutralWhite";
}

export interface ShutterStatus {
  state: "opened" | "opening" | "halfOpen" | "closing" | "closed";
  position: number; // 0:全閉、100:全開
  move: "opening" | "stopped" | "closing";
}

export interface DoorStatus {
  state: "closed" | "opened";
  lockState: "unlocked" | "locked";
}

export interface BathWaterHeaterStatus {
  state: "empty" | "supply" | "drainage" | "full";
  auto: "off" | "on";
  temp: number;
  waterLevel: number; // 0:空、100:Full
}

export interface AirConditionerStatus {
  state: "off" | "cool" | "heat" | "dry" | "wind";
  temp: number;
  internalMode: "cool" | "heat" | "dry" | "wind";
}