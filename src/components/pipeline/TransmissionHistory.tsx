import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { RoadEvent } from "../../store/types";
import { ActivityIcon, MapIcon } from "../shared/Icons";

type HistoryEntry = RoadEvent & {
  status: "queued" | "pushing" | "pushed";
};

export const TransmissionHistory: React.FC = () => {
  const queue = useAppStore((state) => state.liveSensor.queue);
  const sessionHistory = useAppStore((state) => state.liveSensor.sessionHistory);
  const stage = useAppStore((state) => state.transmission.stage);
  const currentEvent = useAppStore((state) => state.liveSensor.event);

  // Build unified list: currently pushing first, then queued, then session history
  const entries: HistoryEntry[] = [];

  // The currently processing event
  if (currentEvent && stage !== "idle" && stage !== "confirmed") {
    entries.push({ ...currentEvent, status: "pushing" });
  }

  // Add queued items (sorted by confidence desc)
  [...queue].sort((a, b) => b.confidence - a.confidence).forEach((q) => {
    entries.push({ ...q, status: "queued" });
  });

  // Add session history (already newest-first from store)
  sessionHistory.forEach((h) => {
    entries.push({ ...h, status: "pushed" });
  });

  const totalCount = entries.length;

  return (
    <div style={{
      backgroundColor: "var(--bg-surface)",
      border: "1px solid var(--border-light)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
      overflow: "hidden",
      marginTop: "var(--space-2)"
    }}>
      {/* Header */}
      <div style={{
        padding: "var(--space-4) var(--space-6)",
        borderBottom: "1px solid var(--border-light)",
        backgroundColor: "var(--bg-elevated)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
          <ActivityIcon width={18} height={18} color="var(--accent)" />
          Session History
        </h3>
        <span style={{
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "var(--text-muted)",
          backgroundColor: "var(--bg-inset)",
          padding: "2px 10px",
          borderRadius: "12px"
        }}>
          {totalCount} event{totalCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "6px", maxHeight: "400px", overflowY: "auto" }}>
        {totalCount === 0 ? (
          <div style={{
            padding: "var(--space-6)",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: "0.9rem"
          }}>
            No detections in this session yet
          </div>
        ) : (
          entries.map((entry, i) => {
            const isHigh = entry.confidence >= 85;
            const isMed = entry.confidence >= 60 && !isHigh;
            const severityColor = isHigh ? "#dc2626" : isMed ? "#f97316" : "#f59e0b";

            const isPushing = entry.status === "pushing";
            const isPushed = entry.status === "pushed";

            return (
              <div key={i} style={{
                backgroundColor: isPushing ? "rgba(59, 130, 246, 0.04)" : "#f7f8fa",
                borderRadius: "6px",
                padding: "10px 14px",
                border: `1px solid ${isPushing ? "rgba(59, 130, 246, 0.2)" : "#e2e5ea"}`,
                borderLeft: `3px solid ${severityColor}`,
                display: "grid",
                gridTemplateColumns: "1fr 50px 70px 70px",
                alignItems: "center",
                gap: "12px",
                opacity: isPushed ? 0.7 : 1,
                transition: "all 0.2s ease"
              }}>
                {/* Type + Coords */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: "13px", color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {entry.type?.replace(/POTENTIAL_/g, "")?.replace(/_/g, " ") || "ANOMALY"}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "monospace", fontSize: "11px", color: "#94a3b8" }}>
                    <MapIcon width={9} height={9} />
                    <span>{entry.latitude?.toFixed(5) || "---"}, {entry.longitude?.toFixed(5) || "---"}</span>
                    {entry.speed != null && (
                      <span style={{ marginLeft: "8px" }}>{(entry.speed * 3.6).toFixed(0)} km/h</span>
                    )}
                  </div>
                </div>

                {/* Confidence */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span style={{
                    color: severityColor,
                    backgroundColor: `${severityColor}1A`,
                    width: "44px",
                    textAlign: "center",
                    padding: "2px 0",
                    borderRadius: "4px",
                    fontFamily: "monospace",
                    fontWeight: 600,
                    fontSize: "11px"
                  }}>
                    {entry.confidence}%
                  </span>
                </div>

                {/* Time */}
                <div style={{
                  textAlign: "right",
                  fontSize: "11px",
                  color: "#94a3b8",
                  fontVariantNumeric: "tabular-nums",
                  fontFamily: "monospace"
                }}>
                  {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ""}
                </div>

                {/* Status indicator */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  {isPushing ? (
                    <span style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#3b82f6",
                      letterSpacing: "0.3px"
                    }}>
                      PUSHING
                    </span>
                  ) : isPushed ? (
                    <span style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#16a34a",
                      letterSpacing: "0.3px"
                    }}>
                      PUSHED
                    </span>
                  ) : (
                    <span style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#f59e0b",
                      letterSpacing: "0.3px"
                    }}>
                      QUEUED
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
