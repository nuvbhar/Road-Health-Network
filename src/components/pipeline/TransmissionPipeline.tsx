import React, { useEffect, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { CheckCircleIcon, AlertTriangleIcon, ActivityIcon, XIcon, MapIcon } from "../shared/Icons";
import styles from "./TransmissionPipeline.module.css";
import { getOrCreateDeviceId, registerDevice } from "../../services/deviceIdentity";

export const TransmissionPipeline: React.FC = () => {
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const queue = useAppStore((state) => state.liveSensor.queue);
  const event = useAppStore((state) => state.liveSensor.event);
  const stage = useAppStore((state) => state.transmission.stage);
  const setTransmissionStage = useAppStore(
    (state) => state.setTransmissionStage,
  );
  const dequeueSensorEvent = useAppStore((state) => state.dequeueSensorEvent);

  // 1. Dequeue logic: runs whenever stage, event, or queue length changes
  useEffect(() => {
    if (stage === "idle" && !event && queue.length > 0) {
      dequeueSensorEvent();
    }
  }, [stage, event, queue.length, dequeueSensorEvent]);

  // 2. Pipeline sequence: runs ONLY when a new event is loaded
  useEffect(() => {
    if (event && event.detected) {
      setTransmissionStage("processing");
      registerDevice();

      const t1 = setTimeout(() => {
        setTransmissionStage("transmitted");

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

          const t3 = setTimeout(() => {
            setTransmissionStage("idle");
            useAppStore.getState().setSensorEvent(null);
          }, 150);

          return () => clearTimeout(t3);
        }, 25);

        return () => clearTimeout(t2);
      }, 25);

      return () => clearTimeout(t1);
    }
  }, [event]);

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
          <button 
            onClick={() => setIsQueueModalOpen(true)}
            style={{
              marginLeft: "auto",
              backgroundColor: "rgba(217, 119, 6, 0.15)",
              color: "var(--colour-warning)",
              padding: "4px 10px",
              borderRadius: "16px",
              fontSize: "0.75rem",
              fontWeight: 700,
              border: "1px solid rgba(217, 119, 6, 0.3)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.2s ease"
            }}
          >
            <ActivityIcon width={14} height={14} />
            {queue.length} Queued
          </button>
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

      {/* Queue Modal Overlay */}
      {isQueueModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(4px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-4)"
        }} onClick={() => setIsQueueModalOpen(false)}>
          <div style={{
            backgroundColor: "var(--bg-surface)",
            borderRadius: "var(--radius-lg)",
            width: "100%",
            maxWidth: "500px",
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            border: "1px solid var(--border-light)",
            overflow: "hidden"
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: "var(--space-4) var(--space-6)",
              borderBottom: "1px solid var(--border-light)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "var(--bg-elevated)"
            }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "1.1rem" }}>
                <ActivityIcon color="var(--colour-warning)" />
                Queued Reports ({queue.length})
              </h3>
              <button 
                onClick={() => setIsQueueModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "4px",
                  display: "flex"
                }}
              >
                <XIcon />
              </button>
            </div>
            
            <div style={{
              padding: "var(--space-6)",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)"
            }}>
              {queue.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "var(--space-8) 0" }}>
                  Queue is currently empty
                </div>
              ) : (
                // Sort by confidence highest to lowest for triage priority
                [...queue].sort((a, b) => b.confidence - a.confidence).map((q, i) => {
                  const isHigh = q.confidence > 75;
                  const isMed = q.confidence > 45 && !isHigh;
                  
                  const severityColor = isHigh ? "var(--colour-danger)" : isMed ? "var(--colour-warning)" : "var(--colour-ok)";
                  const severityBg = isHigh ? "rgba(220, 38, 38, 0.1)" : isMed ? "rgba(217, 119, 6, 0.1)" : "rgba(22, 163, 74, 0.1)";

                  return (
                    <div key={i} style={{
                      backgroundColor: "var(--bg-inset)",
                      borderRadius: "var(--radius-md)",
                      padding: "var(--space-3) var(--space-4)",
                      border: "1px solid var(--border-light)",
                      borderLeft: `4px solid ${severityColor}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-2)",
                      position: "relative"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                          <AlertTriangleIcon width={14} height={14} color={severityColor} />
                          <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>
                            {q.type?.replace(/POTENTIAL_/g, "")?.replace(/_/g, " ") || "ANOMALY"}
                          </span>
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                          <span style={{ 
                            color: severityColor, 
                            backgroundColor: severityBg,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontFamily: "monospace", 
                            fontWeight: 700,
                            fontSize: "0.85rem"
                          }}>
                            {q.confidence}%
                          </span>
                          <button 
                            onClick={() => useAppStore.getState().removeSensorEventFromQueue(queue.indexOf(q))}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--text-muted)",
                              cursor: "pointer",
                              padding: "4px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "4px"
                            }}
                            title="Dismiss from queue"
                          >
                            <XIcon width={14} height={14} />
                          </button>
                        </div>
                      </div>
                      
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between",
                        fontSize: "0.8rem", 
                        color: "var(--text-secondary)" 
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                          <MapIcon width={12} height={12} />
                          <span style={{ fontFamily: "monospace" }}>
                            {q.latitude?.toFixed(5) || "---"}, {q.longitude?.toFixed(5) || "---"}
                          </span>
                        </div>
                        
                        <div style={{ display: "flex", gap: "var(--space-4)", fontFamily: "monospace" }}>
                          <span>
                            {q.speed !== undefined && q.speed !== null ? `${(q.speed * 3.6).toFixed(1)} km/h` : "N/A"}
                          </span>
                          <span>
                            {q.timestamp ? new Date(q.timestamp).toLocaleTimeString() : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
