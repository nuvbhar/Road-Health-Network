import React, { useEffect, useState, useRef } from "react";
import {
  requestSensorAccess,
  startSensorStream,
} from "../services/sensorBridge";
import { processSensorReading } from "../services/detectionEngine";
import { SensorReading } from "../store/types";
import { Button } from "../components/shared/Button";
import { useSearchParams } from "react-router-dom";
import Peer, { DataConnection } from "peerjs";
import { getOrCreateDeviceId, registerDevice } from "../services/deviceIdentity";

export const MobileSensorPage: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [searchParams] = useSearchParams();
  const deviceId = getOrCreateDeviceId();

  const peerConnRef = useRef<DataConnection | null>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const targetPeerId = searchParams.get("peer");

    if (targetPeerId) {
      setStatus("Connecting to Dashboard (WebRTC)...");
      const peer = new Peer();

      peer.on("open", () => {
        const conn = peer.connect(targetPeerId);

        conn.on("open", () => {
          setStatus("Connected (P2P)");
          peerConnRef.current = conn;
        });

        conn.on("close", () => setStatus("Disconnected (P2P)"));
        conn.on("error", (err) => setStatus(`P2P Error: ${err.message}`));
      });

      return () => {
        peer.destroy();
        if (stopStreamRef.current) stopStreamRef.current();
      };
    } else {
      setStatus("No P2P target provided");
    }
  }, [searchParams]);

  const handleStart = async () => {
    const granted = await requestSensorAccess();
    if (!granted) {
      alert(
        "Accelerometer access denied. Ensure you are on HTTPS and explicitly grant permissions if prompted.",
      );
      return;
    }

    setIsActive(true);
    setStatus("Streaming Data (P2P)...");

    // Register the device as active in Supabase
    const { calibrationFactor } = await registerDevice();
    const { useAppStore } = await import("../store/useAppStore");
    useAppStore.getState().setCalibrationFactor(calibrationFactor);

    // Callback that runs 30 times a second
    stopStreamRef.current = startSensorStream((reading: SensorReading) => {
      // 1. Send reading over P2P
      if (peerConnRef.current?.open) {
        peerConnRef.current.send({ type: "sensor:reading", data: reading });
      }

      // 2. Process locally for events
      processSensorReading(reading, async (event) => {
        if (peerConnRef.current?.open) {
          peerConnRef.current.send({ type: "sensor:event", data: event });
        }

        // Post to backend
        try {
          let lat = event.latitude;
          let lng = event.longitude;

          // Fallback if sensor stream didn't have a GPS lock yet
          if (lat === undefined || lng === undefined) {
            const { getCurrentPosition } =
              await import("../services/geolocation");
            const coords = await getCurrentPosition();
            lat = coords.latitude;
            lng = coords.longitude;
          }

          const { createReport } = await import("../services/api");
          let vRef = sessionStorage.getItem("rhn_vehicle_ref");
          if (!vRef) {
            vRef = "V-NODE-" + Math.random().toString(36).substring(2, 7).toUpperCase();
            sessionStorage.setItem("rhn_vehicle_ref", vRef);
          }

          await createReport({
            type: event.type as any,
            confidence: event.confidence,
            latitude: lat,
            longitude: lng,
            vehicleRef: deviceId,
            speed: event.speed,
            gyroscope: event.gyroscope,
            weight: event.weight,
            waveformData: event.waveformData,
            reportDate: new Date(event.timestamp || Date.now()).toISOString(),
          });
        } catch (err) {
          console.error("Failed to post report:", err);
        }
      });
    });
  };

  const handleStop = () => {
    if (stopStreamRef.current) stopStreamRef.current();
    stopStreamRef.current = null;
    setIsActive(false);
    setStatus("Connected to Server (Paused)");
  };

  return (
    <div
      style={{
        padding: "var(--space-6)",
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-default)",
      }}
    >
      <p
        style={{
          color: "var(--text-secondary)",
          marginBottom: "var(--space-8)",
          textAlign: "center",
        }}
      >
        Status:{" "}
        <strong
          style={{
            color: isActive ? "var(--colour-ok)" : "var(--text-primary)",
          }}
        >
          {status}
        </strong>
      </p>

      {!isActive ? (
        <Button
          onClick={handleStart}
          variant="primary"
          style={{
            padding: "var(--space-4) var(--space-8)",
            fontSize: "var(--type-large)",
          }}
        >
          Start Sensor Stream
        </Button>
      ) : (
        <Button
          onClick={handleStop}
          variant="danger"
          style={{
            padding: "var(--space-4) var(--space-8)",
            fontSize: "var(--type-large)",
          }}
        >
          Stop Sensor Stream
        </Button>
      )}
    </div>
  );
};
