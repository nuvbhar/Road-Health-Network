import React, { useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { CheckCircleIcon, AlertTriangleIcon } from "../shared/Icons";
import styles from "./TransmissionPipeline.module.css";

export const TransmissionPipeline: React.FC = () => {
  const queue = useAppStore((state) => state.liveSensor.queue);
  const event = useAppStore((state) => state.liveSensor.event);
  const stage = useAppStore((state) => state.transmission.stage);
  const dequeueSensorEvent = useAppStore((state) => state.dequeueSensorEvent);

  // 1. Dequeue logic: runs whenever stage, event, or queue length changes
  useEffect(() => {
    if (stage === "idle" && !event && queue.length > 0) {
      dequeueSensorEvent();
    }
  }, [stage, event, queue.length, dequeueSensorEvent]);

  // 2. Pipeline sequence: runs ONLY when a new event is loaded
  useEffect(() => {
    if (event && event.detected && stage === "idle") {
      useAppStore.getState().processTransmissionEvent(event);
    }
  }, [event, stage]);

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
