import { useState, useRef, useEffect, useCallback } from "react";
import { requestMotionAccess, requestGpsAccess, startSensorStream } from "../services/sensorBridge";
import { useAppStore } from "../store/useAppStore";
import { processSensorReading } from "../services/detectionEngine";

export type SensorCheckState = "idle" | "detecting" | "granted" | "failed";

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

    const motionGranted = await requestMotionAccess();
    setPermissions(prev => ({
      ...prev!,
      accelerometer: motionGranted ? "granted" : "failed",
      gyroscope: motionGranted ? "granted" : "failed",
      gps: motionGranted ? "detecting" : "idle",
    }));

    if (!motionGranted) {
      setLocalState("unsupported");
      return;
    }

    const gpsGranted = await requestGpsAccess();
    setPermissions(prev => ({
      ...prev!,
      gps: gpsGranted ? "granted" : "failed",
    }));

    if (!gpsGranted) {
      setLocalState("unsupported");
      return;
    }

    if (typeof window.DeviceMotionEvent === "undefined") {
      setLocalState("unsupported");
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;
    
    const testListener = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (acc && (acc.x !== null || acc.y !== null || acc.z !== null)) {
        window.removeEventListener("devicemotion", testListener);
        clearTimeout(timeoutId);
        
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
      }
    };

    window.addEventListener("devicemotion", testListener);

    timeoutId = setTimeout(() => {
      window.removeEventListener("devicemotion", testListener);
      setLocalState("unsupported");
    }, 1500);

  }, [localState, setActiveDevice, setLocalActive]);

  return { localState, handleLocalToggle, permissions };
}
