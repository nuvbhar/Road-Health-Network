import React from "react";
import { useAppStore } from "../../store/useAppStore";
import styles from "./ConfidenceGauge.module.css";

export const ConfidenceGauge: React.FC = () => {
  const event = useAppStore((state) => state.liveSensor.event);

  const confidence = event?.confidence || 0;

  let colour = "var(--text-muted)";
  if (confidence > 80) colour = "var(--colour-danger)";
  else if (confidence > 50) colour = "var(--colour-warning)";
  else if (confidence > 0) colour = "var(--colour-ok)";
  else if (event) colour = "var(--colour-ok)"; // 0% but active

  return (
    <div className={styles.container} aria-live="assertive">
      <h3 className={styles.title}>Event Confidence</h3>
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
            strokeLinecap={event ? "round" : "butt"}
            pathLength="100"
            strokeDasharray={event ? "none" : "2 6"}
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
            strokeDashoffset={100 - confidence}
            className={styles.arc}
            style={{ transition: "stroke-dashoffset 1s ease-out, stroke 0.3s" }}
          />
        </svg>
        <div className={styles.valueDisplay}>
          <span
            className={styles.value}
            style={{ color: event ? colour : "var(--text-muted)" }}
          >
            {event ? `${confidence}%` : "---"}
          </span>
          <span className={styles.label}>
            {event ? "Probability" : "Waiting..."}
          </span>
        </div>
      </div>
    </div>
  );
};
