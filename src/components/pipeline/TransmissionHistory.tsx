import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { AlertTriangleIcon, ActivityIcon, XIcon, MapIcon, CheckCircleIcon } from "../shared/Icons";
import styles from "./TransmissionPipeline.module.css";

export const TransmissionHistory: React.FC = () => {
  const queue = useAppStore((state) => state.liveSensor.queue);
  const reports = useAppStore((state) => state.reports);

  // Take the 15 most recent reports globally
  const recentPushed = [...reports]
    .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
    .slice(0, 15);

  return (
    <div style={{
      backgroundColor: "var(--bg-surface)",
      border: "1px solid var(--border-light)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
      overflow: "hidden",
      marginTop: "var(--space-2)"
    }}>
      <div style={{
        padding: "var(--space-4) var(--space-6)",
        borderBottom: "1px solid var(--border-light)",
        backgroundColor: "var(--bg-elevated)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)"
      }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
          <ActivityIcon width={20} height={20} color="var(--accent)" />
          Live Transmission History
        </h3>
      </div>
      
      <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        
        {/* QUEUED SECTION */}
        <div>
          <h4 style={{
            fontSize: "0.85rem",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
            marginBottom: "var(--space-3)",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}>
            <span style={{ 
              backgroundColor: "rgba(217, 119, 6, 0.15)", 
              color: "var(--colour-warning)", 
              padding: "2px 8px", 
              borderRadius: "12px", 
              fontWeight: 700 
            }}>
              {queue.length}
            </span>
            Queued for Transmission
          </h4>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {queue.length === 0 ? (
              <div style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--text-muted)", backgroundColor: "var(--bg-inset)", borderRadius: "6px", border: "1px dashed var(--border-light)" }}>
                No events in queue
              </div>
            ) : (
              [...queue].sort((a, b) => b.confidence - a.confidence).map((q, i) => {
                const isHigh = q.confidence >= 85;
                const isMed = q.confidence >= 60 && !isHigh;
                const severityColor = isHigh ? "#dc2626" : isMed ? "#f97316" : "#f59e0b";

                return (
                  <div key={i} style={{
                    backgroundColor: "#f7f8fa",
                    borderRadius: "6px",
                    padding: "10px 14px",
                    border: "1px solid #e2e5ea",
                    borderLeft: `3px solid ${severityColor}`,
                    display: "grid",
                    gridTemplateColumns: "20px 1fr 90px 70px 20px",
                    alignItems: "center",
                    gap: "12px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <AlertTriangleIcon width={16} height={16} color={severityColor} />
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontWeight: 600, fontSize: "14px", color: "#1e293b" }}>
                        {q.type?.replace(/POTENTIAL_/g, "")?.replace(/_/g, " ") || "ANOMALY"}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "monospace", fontSize: "12px", color: "#64748b" }}>
                        <MapIcon width={10} height={10} />
                        {q.latitude?.toFixed(5) || "---"}, {q.longitude?.toFixed(5) || "---"}
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <span style={{ 
                        color: severityColor, 
                        backgroundColor: `${severityColor}1A`,
                        width: "48px",
                        textAlign: "center",
                        padding: "2px 0",
                        borderRadius: "4px",
                        fontFamily: "monospace", 
                        fontWeight: 600,
                        fontSize: "12px"
                      }}>
                        {q.confidence}%
                      </span>
                    </div>
                    
                    <div style={{ 
                      textAlign: "right",
                      fontSize: "12px",
                      color: "#64748b",
                      fontVariantNumeric: "tabular-nums"
                    }}>
                      {q.timestamp ? new Date(q.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ""}
                    </div>
                    
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button 
                        onClick={() => useAppStore.getState().removeSensorEventFromQueue(queue.indexOf(q))}
                        className={styles.dismissBtn}
                        title="Dismiss from queue"
                      >
                        <XIcon width={16} height={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PUSHED SECTION */}
        <div>
          <h4 style={{
            fontSize: "0.85rem",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
            marginBottom: "var(--space-3)",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}>
            <span style={{ 
              backgroundColor: "rgba(22, 163, 74, 0.15)", 
              color: "var(--colour-ok)", 
              padding: "2px 8px", 
              borderRadius: "12px", 
              fontWeight: 700 
            }}>
              ✓
            </span>
            Recently Pushed
          </h4>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {recentPushed.length === 0 ? (
              <div style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--text-muted)", backgroundColor: "var(--bg-inset)", borderRadius: "6px", border: "1px dashed var(--border-light)" }}>
                No recently pushed events
              </div>
            ) : (
              recentPushed.map((r, i) => {
                const isHigh = r.confidence >= 85;
                const isMed = r.confidence >= 60 && !isHigh;
                const severityColor = isHigh ? "#dc2626" : isMed ? "#f97316" : "#f59e0b";

                return (
                  <div key={r.id || i} style={{
                    backgroundColor: "#f7f8fa",
                    borderRadius: "6px",
                    padding: "10px 14px",
                    border: "1px solid #e2e5ea",
                    borderLeft: `3px solid ${severityColor}`,
                    display: "grid",
                    gridTemplateColumns: "20px 1fr 90px 70px 20px",
                    alignItems: "center",
                    gap: "12px",
                    opacity: 0.85
                  }}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <CheckCircleIcon width={16} height={16} color="var(--colour-ok)" />
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontWeight: 600, fontSize: "14px", color: "#1e293b" }}>
                        {r.type?.replace(/POTENTIAL_/g, "")?.replace(/_/g, " ") || "ANOMALY"}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "monospace", fontSize: "12px", color: "#64748b" }}>
                        <MapIcon width={10} height={10} />
                        {r.latitude?.toFixed(5) || "---"}, {r.longitude?.toFixed(5) || "---"}
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <span style={{ 
                        color: severityColor, 
                        backgroundColor: `${severityColor}1A`,
                        width: "48px",
                        textAlign: "center",
                        padding: "2px 0",
                        borderRadius: "4px",
                        fontFamily: "monospace", 
                        fontWeight: 600,
                        fontSize: "12px"
                      }}>
                        {r.confidence}%
                      </span>
                    </div>
                    
                    <div style={{ 
                      textAlign: "right",
                      fontSize: "12px",
                      color: "#64748b",
                      fontVariantNumeric: "tabular-nums"
                    }}>
                      {r.reportDate ? new Date(r.reportDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ""}
                    </div>
                    
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, letterSpacing: "0.5px" }}>
                        SAVED
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
