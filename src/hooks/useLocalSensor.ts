import { useState, useRef, useEffect, useCallback } from "react";
import { requestSensorAccess, startSensorStream } from "../services/sensorBridge";
import { useAppStore } from "../store/useAppStore";
import { processSensorReading } from "../services/detectionEngine";
import { PermissionsStatus } from "../services/sensorBridge";

export function useLocalSensor(setActiveDevice: (device: string | null) => void, setLocalActive: (active: boolean) => void) {
  const [localState, setLocalState] = useState<"idle" | "scanning" | "streaming" | "unsupported">("idle");
  const [permissions, setPermissions] = useState<PermissionsStatus | null>(null);
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
    const status = await requestSensorAccess();
    setPermissions(status);

    if (!status.accelerometer || !status.gyroscope || !status.gps) {
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
