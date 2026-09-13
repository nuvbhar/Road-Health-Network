import React from "react";
import { Report } from "../../store/types";
import { Badge } from "../shared/Badge";
import { REPORT_TYPES } from "../../services/reportTypes";
import styles from "./ReportFeed.module.css";

interface ReportRowProps {
  report: Report;
  onClick?: (report: Report) => void;
}

export const ReportRow: React.FC<ReportRowProps> = React.memo(
  ({ report, onClick }) => {
    const getStatusBadgeVariant = (status: string) => {
      switch (status) {
        case "resolved":
          return "ok";
        case "under_review":
          return "warning";
        case "pending":
        default:
          return "danger";
      }
    };

    const formatDate = (dateString: string) => {
      const d = new Date(dateString);
      return d.toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    };

    const typeInfo =
      REPORT_TYPES[report.type] || REPORT_TYPES["POTENTIAL_POTHOLE"];

    return (
      <div
        className={`${styles.row} ${onClick ? styles.clickable : ""}`}
        onClick={() => onClick?.(report)}
      >
        <div className={styles.cellMain}>
          <div className={styles.typeRow} style={{ color: typeInfo.color }}>
            <span style={{ fontSize: "1.2em", marginRight: "var(--space-2)" }}>
              {typeInfo.icon}
            </span>
            <span
              className={styles.type}
              style={{ color: "var(--text-primary)" }}
            >
              {typeInfo.label}
            </span>
          </div>
          <div className={styles.reference}>
            {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
          </div>
        </div>

        <div className={styles.cell}>
          <div className={styles.cellValue}>
            {formatDate(report.reportDate)}
          </div>
        </div>

        <div className={styles.cell}>
          <div
            className={styles.confidenceValue}
            style={{ color: "var(--text-primary)" }}
          >
            {report.confidence}%
          </div>
        </div>

        <div className={styles.cell}>
          <div className={styles.cellValue} style={{ fontWeight: 600 }}>
            {report.weight !== undefined
              ? report.weight.toFixed(2) + "g"
              : "N/A"}
          </div>
        </div>

        <div className={styles.cell}>
          <div className={styles.corroborationStack}>
            {report.reportingVehicles?.slice(0, 2).map((vId, i) => (
              <span key={i} className={styles.vehiclePill} title={vId}>
                {vId.substring(0, 8)}
              </span>
            ))}
            {report.independentReports > 2 && (
              <span
                className={styles.vehiclePillMore}
                style={{ padding: "0 6px" }}
              >
                +{report.independentReports - 2} more
              </span>
            )}
          </div>
        </div>

        <div
          className={styles.cell}
          style={{ alignItems: "flex-end", paddingRight: "var(--space-4)" }}
        >
          <Badge variant={getStatusBadgeVariant(report.status)}>
            {report.status
              .split("_")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ")}
          </Badge>
        </div>
      </div>
    );
  },
);
