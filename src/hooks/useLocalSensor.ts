import { useState, useRef, useEffect, useCallback } from "react";
import { requestMotionAccess, requestGpsAccess, startSensorStream } from "../services/sensorBridge";
import { useAppStore } from "../store/useAppStore";
import { processSensorReading } from "../services/detectionEngine";

export type SensorCheckState = "idle" | "detecting" | "granted" | "not_supported" | "denied";

export interface SensorCheckStatus {
  accelerometer: SensorCheckState;
  gyroscope: SensorCheckState;
  gps: SensorCheckState;
}

export function useLocalSensor(setActiveDevice: (device: string | null) => void, setLocalActive: (active: boolean) => void) {
  const [localState, setLocalState] = useState<"idle" | "scanning" | "streaming" | "unsupported">("idle");
  const [permissions, setPermissions] = useState<SensorCheckStatus | null>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (stopStreamRef.current) stopStreamRef.current();
    };
  }, []);

  const handleLocalToggle = useCallback(async () => {
    if (localState === "streaming") {
      if (stopStreamRef.current) stopStreamRef.current();
      stopStreamRef.current = null;
      setLocalState("idle");
      setActiveDevice(null);
      setLocalActive(false);
      setPermissions(null);
      useAppStore.getState().setSensorReading(null);
      return;
    }

    setLocalState("scanning");
    setPermissions({
      accelerometer: "detecting",
      gyroscope: "detecting",
      gps: "idle",
    });

    const motionResult = await requestMotionAccess();
    setPermissions(prev => ({
      ...prev!,
      accelerometer: motionResult,
      gyroscope: motionResult,
      gps: motionResult === "granted" ? "detecting" : "idle",
    }));

    if (motionResult !== "granted") {
      setLocalState("unsupported");
      return;
    }

    const gpsResult = await requestGpsAccess();
    setPermissions(prev => ({
      ...prev!,
      gps: gpsResult,
    }));

    if (gpsResult !== "granted") {
      setLocalState("unsupported");
      return;
    }

    setLocalState("streaming");
    setLocalActive(true);
    setActiveDevice("This Device (Local)");
    
    stopStreamRef.current = startSensorStream((r) => {
      useAppStore.getState().setSensorReading(r);
      processSensorReading(
        r,
        useAppStore.getState().enqueueSensorEvent,
        useAppStore.getState().setEngineMetrics,
      );
    });

  }, [localState, setActiveDevice, setLocalActive]);

  return { localState, handleLocalToggle, permissions };
}
