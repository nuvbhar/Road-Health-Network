import React, { useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { CheckCircleIcon, AlertTriangleIcon } from "../shared/Icons";
import styles from "./TransmissionPipeline.module.css";
import { getOrCreateDeviceId, registerDevice } from "../../services/deviceIdentity";

export const TransmissionPipeline: React.FC = () => {
  const event = useAppStore((state) => state.liveSensor.event);
  const stage = useAppStore((state) => state.transmission.stage);
  const setTransmissionStage = useAppStore(
    (state) => state.setTransmissionStage,
  );

  // Rapid Pipeline Automation
  useEffect(() => {
    if (event && event.detected && stage === "idle") {
      setTransmissionStage("processing");

      // Register device on first transmission
      registerDevice();

      // Fast Encryption stage (200ms)
      const t1 = setTimeout(() => {
        setTransmissionStage("transmitted");

        // Fast Network Transmission (250ms)
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

          // Quick recovery for next event (1500ms)
          const t3 = setTimeout(() => {
            setTransmissionStage("idle");
            useAppStore.getState().setSensorEvent(null);
          }, 1500);

          return () => clearTimeout(t3);
        }, 250);

        return () => clearTimeout(t2);
      }, 200);

      return () => clearTimeout(t1);
    }
  }, [event, stage, setTransmissionStage]);

  if (stage === "idle") {
    return (
      <div className={styles.containerEmpty}>
        <div className={styles.emptyText}>Awaiting anomaly detection...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <AlertTriangleIcon color="var(--colour-danger)" />
        <span className={styles.headerTitle}>
          Anomaly Detected: {event?.type?.replace(/_/g, " ")}
        </span>
        <span className={styles.headerConf}>
          {event?.confidence}% Confidence
        </span>
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
    </div>
  );
};
