import React, { useEffect, useState, useRef } from "react";
import { useAppStore } from "../store/useAppStore";
import { SensorCanvas } from "../components/sensor/SensorCanvas";
import { TransmissionPipeline } from "../components/pipeline/TransmissionPipeline";
import { PrivacyPanel } from "../components/privacy/PrivacyPanel";
import { ConfidenceGauge } from "../components/sensor/ConfidenceGauge";
import { PairingQR } from "../components/sensor/PairingQR";
import { SmartphoneIcon } from "../components/shared/Icons";
import { Button } from "../components/shared/Button";
import {
  requestSensorAccess,
  startSensorStream,
} from "../services/sensorBridge";
import { processSensorReading } from "../services/detectionEngine";
import Peer from "peerjs";

export const LiveSensorPage: React.FC = () => {
  const [activeDevice, setActiveDevice] = useState<string | null>(null);
  const [localActive, setLocalActive] = useState(false);
  const [peerId, setPeerId] = useState<string | undefined>(undefined);
  const stopStreamRef = useRef<(() => void) | null>(null);
  const peerRef = useRef<Peer | null>(null);

  const setSensorReading = useAppStore((state) => state.setSensorReading);
  const setSensorEvent = useAppStore((state) => state.setSensorEvent);

  const reading = useAppStore((state) => state.liveSensor.reading);
  const metrics = useAppStore((state) => state.liveSensor.metrics);

  useEffect(() => {
    if (reading && !activeDevice) {
      setActiveDevice(
        localActive ? "This Device (Local)" : "External Sensor Node (P2P)",
      );
    }
  }, [reading, activeDevice, localActive]);

  useEffect(() => {
    // Initialize PeerJS for static P2P receiving
    const peer = new Peer();
    peer.on("open", (id) => {
      console.log("PeerJS ID:", id);
      setPeerId(id);
    });

    peer.on("connection", (conn) => {
      console.log("Mobile device connected via WebRTC");
      setActiveDevice("External Mobile Device (WebRTC)");

      conn.on("data", (data: any) => {
        if (data && data.type === "sensor:reading") {
          setSensorReading(data.data);
          processSensorReading(
            data.data,
            setSensorEvent,
            useAppStore.getState().setEngineMetrics,
          );
        } else if (data && data.type === "sensor:event") {
          setSensorEvent(data.data);
        }
      });

      conn.on("close", () => {
        setActiveDevice(null);
      });
    });

    peerRef.current = peer;

    return () => {
      peer.destroy();
      if (stopStreamRef.current) stopStreamRef.current();
    };
  }, [setSensorReading, setSensorEvent]);

  const [localState, setLocalState] = useState<
    "idle" | "scanning" | "streaming" | "unsupported"
  >("idle");

  const handleLocalToggle = async () => {
    if (localState === "streaming") {
      if (stopStreamRef.current) stopStreamRef.current();
      stopStreamRef.current = null;
      setLocalState("idle");
      setActiveDevice(null);
      setLocalActive(false);
      return;
    }

    setLocalState("scanning");
    const granted = await requestSensorAccess();
    if (!granted) {
      setLocalState("unsupported");
      return;
    }

    // Scan for actual data
    let hasData = false;
    const testListener = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (acc && (acc.x !== null || acc.y !== null || acc.z !== null)) {
        hasData = true;
      }
    };

    if (typeof window.DeviceMotionEvent !== "undefined") {
      window.addEventListener("devicemotion", testListener);
    }

    setTimeout(() => {
      if (typeof window.DeviceMotionEvent !== "undefined") {
        window.removeEventListener("devicemotion", testListener);
      }

      if (hasData) {
        setLocalState("streaming");
        setLocalActive(true);
        setActiveDevice("This Device (Local)");
        stopStreamRef.current = startSensorStream((r) => {
          setSensorReading(r);
          processSensorReading(
            r,
            setSensorEvent,
            useAppStore.getState().setEngineMetrics,
          );
        });
      } else {
        setLocalState("unsupported");
      }
    }, 1500);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      <h1 className="sr-only">Live Sensor</h1>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "var(--space-4)",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              marginBottom: "var(--space-2)",
              color: "var(--text-primary)",
            }}
          >
            Live Sensor Telemetry
          </h2>
          <p style={{ color: "var(--text-muted)" }}>
            Stream raw accelerometer data and detect anomalies in real time.
          </p>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-full)",
            color: "var(--text-primary)",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: activeDevice
                ? "var(--colour-ok)"
                : "var(--text-muted)",
              boxShadow: activeDevice ? "0 0 8px var(--colour-ok)" : "none",
              transition: "background-color 0.3s ease, box-shadow 0.3s ease",
            }}
          />
          <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>
            {activeDevice
              ? `Connected: ${activeDevice}`
              : "No active sensor devices"}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "var(--space-6)",
        }}
      >
        {/* Local Option */}
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-8)",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              marginBottom: "var(--space-2)",
            }}
          >
            Option 1: Use This Device
          </h3>
          <p
            style={{
              color: "var(--text-muted)",
              marginBottom: "var(--space-4)",
              fontSize: "0.95rem",
            }}
          >
            Use this device's built-in accelerometer to stream telemetry
            directly to the dashboard. Best if you are already viewing this page
            on a mobile device.
          </p>

          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "120px",
            }}
          >
            <SmartphoneIcon
              width={80}
              height={80}
              style={{ color: "var(--border-default)", opacity: 0.5 }}
            />
          </div>

          <Button
            variant={localState === "streaming" ? "danger" : "primary"}
            onClick={handleLocalToggle}
            disabled={localState === "unsupported" || localState === "scanning"}
            title={
              localState === "unsupported"
                ? "No accelerometer detected on this device"
                : ""
            }
            style={{ width: "100%", marginTop: "var(--space-6)" }}
          >
            {localState === "streaming"
              ? "Stop Local Sensor"
              : localState === "scanning"
                ? "Scanning for Accelerometer..."
                : localState === "unsupported"
                  ? "⚠ No Accelerometer Detected"
                  : "Start Local Sensor"}
          </Button>
        </div>

        {/* External Option */}
        <PairingQR peerId={peerId} />
      </div>

      <SensorCanvas />

      {/* Live Device Telemetry Section */}
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-light)",
          borderRadius: "var(--radius-lg)",
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
          marginTop: "var(--space-2)",
        }}
      >
        <div
          style={{
            padding: "var(--space-4) var(--space-6)",
            borderBottom: "1px solid var(--border-light)",
            backgroundColor: "var(--bg-elevated)",
          }}
        >
          <h3
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Live Device Sensors
          </h3>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "var(--space-4)",
            padding: "var(--space-6)",
          }}
        >
          {/* Location & Speed */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <h4
              style={{
                fontSize: "0.85rem",
                textTransform: "uppercase",
                color: "var(--text-secondary)",
              }}
            >
              Location & Speed
            </h4>
            <MetricRow
              label="Latitude"
              value={
                reading?.gps?.latitude ? reading.gps.latitude.toFixed(5) : "---"
              }
            />
            <MetricRow
              label="Longitude"
              value={
                reading?.gps?.longitude
                  ? reading.gps.longitude.toFixed(5)
                  : "---"
              }
            />
            <MetricRow
              label="Speed"
              value={
                reading?.gps?.speed !== undefined &&
                reading?.gps?.speed !== null
                  ? `${(reading.gps.speed * 3.6).toFixed(1)} km/h`
                  : "---"
              }
            />
          </div>

          {/* Gyroscope */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <h4
              style={{
                fontSize: "0.85rem",
                textTransform: "uppercase",
                color: "var(--text-secondary)",
              }}
            >
              Gyroscope (Orientation)
            </h4>
            <MetricRow
              label="Pitch (X)"
              value={
                reading?.gyroscope?.x !== undefined
                  ? `${reading.gyroscope.x.toFixed(2)}°`
                  : "---"
              }
            />
            <MetricRow
              label="Roll (Y)"
              value={
                reading?.gyroscope?.y !== undefined
                  ? `${reading.gyroscope.y.toFixed(2)}°`
                  : "---"
              }
            />
            <MetricRow
              label="Yaw (Z)"
              value={
                reading?.gyroscope?.z !== undefined
                  ? `${reading.gyroscope.z.toFixed(2)}°`
                  : "---"
              }
            />
          </div>
        </div>
      </div>

      {/* Analysis & Transmission Section */}
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-light)",
          borderRadius: "var(--radius-lg)",
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
          marginTop: "var(--space-2)",
        }}
      >
        <div
          style={{
            padding: "var(--space-4) var(--space-6)",
            borderBottom: "1px solid var(--border-light)",
            backgroundColor: "var(--bg-elevated)",
          }}
        >
          <h3
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Event Analysis & Pipeline
          </h3>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          }}
        >
          {/* 1. Contextual Pipeline Metrics */}
          <div
            style={{
              padding: "var(--space-6)",
              borderRight: "1px solid var(--border-light)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h4
              style={{
                fontSize: "0.85rem",
                textTransform: "uppercase",
                color: "var(--text-secondary)",
                marginBottom: "var(--space-4)",
              }}
            >
              Pipeline Telemetry
            </h4>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
                flex: 1,
                justifyContent: "center",
              }}
            >
              {/* Dynamic Live Road Shock Indicator */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor:
                    metrics && metrics.zForce > 0.4
                      ? "rgba(220, 38, 38, 0.15)"
                      : metrics && metrics.zForce > 0.22
                      ? "rgba(217, 119, 6, 0.15)"
                      : "rgba(22, 163, 74, 0.1)",
                  border: `1px solid ${
                    metrics && metrics.zForce > 0.4
                      ? "var(--colour-danger)"
                      : metrics && metrics.zForce > 0.22
                      ? "var(--colour-warning)"
                      : "rgba(22, 163, 74, 0.2)"
                  }`,
                  transition: "all 0.1s ease",
                  marginBottom: "var(--space-1)",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    letterSpacing: "0.02em",
                  }}
                >
                  ROAD STATUS
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    fontFamily: "monospace",
                    color:
                      metrics && metrics.zForce > 0.4
                        ? "var(--colour-danger)"
                        : metrics && metrics.zForce > 0.22
                        ? "var(--colour-warning)"
                        : "var(--colour-ok)",
                  }}
                >
                  {metrics
                    ? metrics.zForce > 0.4
                      ? "🚨 IMPACT SPIKE"
                      : metrics.zForce > 0.22
                      ? "⚡ CHATTER"
                      : "✓ SMOOTH"
                    : "IDLE"}
                </span>
              </div>

              <MetricRow
                label="Baseline (μ)"
                value={metrics ? `${metrics.meanZ.toFixed(2)}g` : "---"}
              />
              <MetricRow
                label="Variance (σ)"
                value={metrics ? `${metrics.stdDev.toFixed(3)}` : "---"}
                highlight={
                  metrics?.stdDev
                    ? metrics.stdDev > 0.35
                      ? "var(--colour-danger)"
                      : "var(--colour-ok)"
                    : undefined
                }
              />

              <div
                style={{
                  borderTop: "1px dashed var(--border-light)",
                  margin: "var(--space-1) 0",
                }}
              />

              <MetricRow
                label="Latest Spike"
                value={metrics ? `${metrics.zForce.toFixed(2)}g` : "---"}
                highlight={
                  metrics && metrics.zForce > 0.35
                    ? "var(--colour-danger)"
                    : metrics && metrics.zForce > 0.2
                    ? "var(--colour-warning)"
                    : undefined
                }
              />
              <MetricRow
                label="Signal-to-Noise"
                value={metrics ? `${metrics.snr.toFixed(1)}x` : "---"}
                highlight={
                  metrics?.snr
                    ? metrics.snr > 2.5
                      ? "var(--colour-danger)"
                      : metrics.snr > 1.6
                      ? "var(--colour-warning)"
                      : "var(--text-muted)"
                    : undefined
                }
              />
            </div>
          </div>

          <div
            style={{
              padding: "var(--space-6)",
              borderRight: "1px solid var(--border-light)",
            }}
          >
            <ConfidenceGauge />
          </div>
          <div
            style={{
              padding: "var(--space-6)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <TransmissionPipeline />
          </div>
        </div>
      </div>

      <PrivacyPanel />
    </div>
  );
};

const MetricRow = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: string;
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: "0.95rem",
    }}
  >
    <span style={{ color: "var(--text-secondary)" }}>{label}</span>
    <span
      style={{
        fontFamily: "monospace",
        fontWeight: 600,
        color: highlight || "var(--text-primary)",
      }}
    >
      {value}
    </span>
  </div>
);
