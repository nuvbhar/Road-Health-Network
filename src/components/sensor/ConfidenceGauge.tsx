import React from "react";
import { useAppStore } from "../../store/useAppStore";
import styles from "./ConfidenceGauge.module.css";

export const ConfidenceGauge: React.FC = () => {
  const event = useAppStore((state) => state.liveSensor.event);
  const metrics = useAppStore((state) => state.liveSensor.metrics);
  const stage = useAppStore((state) => state.transmission.stage);

  const hasEvent = Boolean(event && event.detected);
  const isConfirmed = stage === "confirmed";

  // Dynamic live responsiveness:
  // When no event is locked, calculate live anomaly probability directly from instantaneous zForce and SNR
  const liveIntensity = metrics
    ? Math.min(
        99,
        Math.max(
          0,
          Math.round((metrics.zForce / 0.8) * 45 + Math.max(0, metrics.snr - 1.2) * 10),
        ),
      )
    : 0;

  // Reset to 0 when confirmed, otherwise show event confidence or live intensity
  const displayConfidence = isConfirmed ? 0 : (hasEvent ? (event?.confidence || 50) : liveIntensity);

  let colour = "var(--text-muted)";
  if (isConfirmed) colour = "var(--colour-ok)"; // Show green when confirmed
  else if (displayConfidence > 75) colour = "var(--colour-danger)";
  else if (displayConfidence > 45) colour = "var(--colour-warning)";
  else if (displayConfidence > 12) colour = "var(--colour-ok)";

  const label = isConfirmed
    ? "Saved to Database ✓"
    : hasEvent
    ? (event?.type ? event.type.replace(/_/g, " ") : "Anomaly Detected")
    : displayConfidence > 50
    ? "High Impact Shock"
    : displayConfidence > 25
    ? "Road Vibration"
    : "Live Sensitivity";

  return (
    <div className={styles.container} aria-live="assertive">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-2)",
        }}
      >
        <h3 className={styles.title} style={{ margin: 0 }}>
          {isConfirmed ? "Transmission Complete" : (hasEvent ? "Detected Anomaly" : "Live Shock Gauge")}
        </h3>
        {hasEvent && !isConfirmed && (
          <span
            style={{
              fontSize: "0.7rem",
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor: "rgba(220, 38, 38, 0.15)",
              color: "var(--colour-danger)",
              fontWeight: 700,
            }}
          >
            LOCKED
          </span>
        )}
      </div>

      <div className={styles.gaugeWrapper}>
        <svg
          width="200"
          height="110"
          viewBox="0 0 200 110"
          className={styles.svg}
        >
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--bg-inset)"
            strokeWidth="16"
            strokeLinecap={hasEvent || displayConfidence > 10 ? "round" : "butt"}
            pathLength="100"
            strokeDasharray={hasEvent || displayConfidence > 10 ? "none" : "2 6"}
          />
          {/* Foreground arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={colour}
            strokeWidth="16"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={100 - displayConfidence}
            className={styles.arc}
            style={{
              transition: "stroke-dashoffset 0.12s ease-out, stroke 0.15s ease",
            }}
          />
        </svg>
        <div className={styles.valueDisplay}>
          <span
            className={styles.value}
            style={{
              color: displayConfidence > 10 ? colour : "var(--text-muted)",
            }}
          >
            {metrics || hasEvent ? `${displayConfidence}%` : "---"}
          </span>
          <span className={styles.label}>
            {metrics || hasEvent ? label : "Waiting..."}
          </span>
        </div>
      </div>
    </div>
  );
};
