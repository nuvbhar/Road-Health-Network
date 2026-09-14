import React, { useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { CheckCircleIcon, AlertTriangleIcon } from "../shared/Icons";
import styles from "./TransmissionPipeline.module.css";
import { getOrCreateDeviceId, registerDevice } from "../../services/deviceIdentity";

export const TransmissionPipeline: React.FC = () => {
  const queue = useAppStore((state) => state.liveSensor.queue);
  const event = useAppStore((state) => state.liveSensor.event);
  const stage = useAppStore((state) => state.transmission.stage);
  const setTransmissionStage = useAppStore(
    (state) => state.setTransmissionStage,
  );
  const dequeueSensorEvent = useAppStore((state) => state.dequeueSensorEvent);

  // Rapid Pipeline Automation
  useEffect(() => {
    // If idle and there are items in the queue, dequeue one to start processing
    if (stage === "idle" && !event && queue.length > 0) {
      dequeueSensorEvent();
      return;
    }

    if (event && event.detected && stage === "idle") {
      setTransmissionStage("processing");

      // Register device on first transmission
      registerDevice();

      // Fast Encryption stage (50ms)
      const t1 = setTimeout(() => {
        setTransmissionStage("transmitted");

        // Fast Network Transmission (50ms)
        const t2 = setTimeout(() => {
          setTransmissionStage("confirmed");

          if (event && event.type) {
            const uuid = getOrCreateDeviceId();

            useAppStore
              .getState()
              .addReport({
                id: `RPT-LIVE-${Math.floor(Math.random() * 9000)}`,
                reportDate: new Date().toISOString(),
                type: event.type as any,
                confidence: event.confidence,
                weight: event.weight || 0,
                source: "VEHICLE_SENSOR",
                vehicleRef: uuid,
                sectorId: "SEC-B",
                sectorName: "Kharar-CU Sector B",
                roadReference: "Live Demo Route",
                latitude: event.latitude || 30.748 + Math.random() * 0.005,
                longitude: event.longitude || 76.645 + Math.random() * 0.005,
                status: "pending",
                independentReports: 1,
                reportingVehicles: [uuid],
                speed: event.speed,
                gyroscope: event.gyroscope,
                waveformData: event.waveformData,
              } as any)
              .catch((e) => console.warn("Failed to push to DB:", e));
          }

          // Quick recovery for next event (400ms)
          const t3 = setTimeout(() => {
            setTransmissionStage("idle");
            useAppStore.getState().setSensorEvent(null);
          }, 400);

          return () => clearTimeout(t3);
        }, 50);

        return () => clearTimeout(t2);
      }, 50);

      return () => clearTimeout(t1);
    }
  }, [event, stage, setTransmissionStage, queue.length, dequeueSensorEvent]);

  if (stage === "idle" && (!queue || queue.length === 0)) {
    return (
      <div className={styles.containerEmpty}>
        <div className={styles.emptyText}>Awaiting anomaly detection...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {event ? (
          <>
            <AlertTriangleIcon color="var(--colour-danger)" />
            <span className={styles.headerTitle}>
              {stage === "confirmed" ? "Pushed:" : "Processing:"} {event?.type?.replace(/_/g, " ")}
            </span>
          </>
        ) : (
          <span className={styles.headerTitle}>Idle...</span>
        )}
        
        {queue.length > 0 && (
          <span style={{
            marginLeft: "auto",
            backgroundColor: "rgba(217, 119, 6, 0.15)",
            color: "var(--colour-warning)",
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "0.75rem",
            fontWeight: 700
          }}>
            {queue.length} in Queue
          </span>
        )}
      </div>

      <div className={styles.pipeline}>
        <div className={styles.node}>
          <div className={styles.iconActive}>1</div>
          <div className={styles.nodeLabel}>Capture</div>
        </div>

        <div className={styles.lineActive} />

        <div className={styles.node}>
          <div
            className={
              stage === "processing" ? styles.iconPulse : styles.iconActive
            }
          >
            2
          </div>
          <div className={styles.nodeLabel}>
            {stage === "processing" ? "Encrypting..." : "Encrypted"}
          </div>
        </div>

        <div
          className={
            stage === "processing" ? styles.linePending : styles.lineActive
          }
        />

        <div className={styles.node}>
          <div
            className={
              stage === "processing" || stage === "transmitted"
                ? stage === "processing"
                  ? styles.iconPending
                  : styles.iconPulse
                : styles.iconActive
            }
          >
            3
          </div>
          <div className={styles.nodeLabel}>
            {stage === "transmitted"
              ? "Transmitting..."
              : stage === "confirmed"
                ? "Transmitted"
                : "Pending"}
          </div>
        </div>

        <div
          className={
            stage === "confirmed" ? styles.lineActive : styles.linePending
          }
        />

        <div className={styles.node}>
          <div
            className={
              stage === "confirmed" ? styles.iconOk : styles.iconPending
            }
          >
            {stage === "confirmed" ? (
              <CheckCircleIcon width={16} height={16} />
            ) : (
              "4"
            )}
          </div>
          <div className={styles.nodeLabel}>
            {stage === "confirmed" ? "Dashboard Confirmed" : "Pending Auth"}
          </div>
        </div>
      </div>

      {queue.length > 0 && (
        <div style={{
          marginTop: "var(--space-6)",
          paddingTop: "var(--space-4)",
          borderTop: "1px dashed var(--border-light)",
        }}>
          <h4 style={{
            fontSize: "0.85rem",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
            marginBottom: "var(--space-3)"
          }}>
            Queued for Transmission ({queue.length})
          </h4>
          <ul style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            maxHeight: "120px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)"
          }}>
            {queue.map((q, i) => (
              <li key={i} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "var(--bg-inset)",
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.85rem"
              }}>
                <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                  {q.type?.replace(/_/g, " ") || "Unknown Event"}
                </span>
                <span style={{ color: "var(--colour-warning)", fontFamily: "monospace", fontWeight: 700 }}>
                  {q.confidence}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
