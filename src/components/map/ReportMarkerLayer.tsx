import React from "react";
import { CircleMarker, Popup } from "react-leaflet";
import { Report } from "../../store/types";
import { REPORT_TYPES } from "../../services/reportTypes";
import styles from "./SectorMap.module.css";

interface ReportMarkerLayerProps {
  reports: Report[];
}

export const ReportMarkerLayer: React.FC<ReportMarkerLayerProps> = ({
  reports,
}) => {
  return (
    <>
      {reports.map((report) => {
        if (!report.latitude || !report.longitude) return null;

        const typeInfo = REPORT_TYPES[report.type];
        if (!typeInfo) return null;

        // Base color parsing - react-leaflet needs actual hex/rgb, but we use css vars.
        // For simplicity, we can map common vars to hex, or just use strings that leaflet accepts if valid.
        // Leaflet's CircleMarker path accepts standard CSS colors, but CSS variables might need runtime evaluation.
        // Let's parse standard known colours or use a fallback.
        let color = "#3b82f6"; // fallback info
        if (typeInfo.color.includes("danger")) color = "#dc2626";
        if (typeInfo.color.includes("warning")) color = "#d97706";
        if (typeInfo.color.includes("info")) color = "#2563eb";

        const vehicleCount = report.independentReports || 1;
        const isCorroborated = vehicleCount > 1;
        const radius = isCorroborated ? 12 : 6; // Noticeably larger if corroborated

        return (
          <CircleMarker
            key={report.id}
            center={[report.latitude, report.longitude]}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.6,
              weight: 2,
            }}
          >
            <Popup>
              <div
                className={styles.tooltipContainer}
                style={{ minWidth: "200px" }}
              >
                <div className={styles.popupHeader}>
                  {typeInfo.icon}
                  <span>{typeInfo.label}</span>
                </div>
                <div className={styles.popupContent}>
                  <div className={styles.tooltipRow}>
                    <span>Date:</span>
                    <span className={styles.tooltipValue}>
                      {report.reportDate}
                    </span>
                  </div>
                  <div className={styles.tooltipRow}>
                    <span>Confidence:</span>
                    <span className={styles.tooltipValue}>
                      {report.confidence}%
                    </span>
                  </div>
                  <div className={styles.tooltipRow}>
                    <span>Status:</span>
                    <span className={styles.tooltipValue}>
                      {report.status.replace("_", " ")}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: "8px",
                      paddingTop: "8px",
                      borderTop: "1px solid #e2e8f0",
                    }}
                  >
                    {report.speed !== null && report.speed !== undefined && (
                        <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px" }}>
                          Speed: {(report.speed * 3.6).toFixed(0)} km/h
                        </div>
                      )}


                      <div
                        style={{
                          fontSize: "10px",
                          color: report.isConfirmed ? "#16a34a" : "#64748b",
                          fontWeight: report.isConfirmed ? 600 : "normal",
                          marginBottom: "4px",
                        }}
                      >
                        {report.isConfirmed
                          ? `✓ Confirmed Pothole (${vehicleCount} cars${report.correlationScore !== null && report.correlationScore !== undefined ? `, r=${report.correlationScore.toFixed(2)}` : ""})`
                          : vehicleCount === 1
                          ? "⚠ Awaiting Corroboration"
                          : `Corroborated by ${vehicleCount} vehicles`}
                      </div>
                      {report.waveformData && report.waveformData.length > 0 && (
                        <div style={{ marginTop: "6px", marginBottom: "6px" }}>
                          <div style={{ fontSize: "9px", color: "#94a3b8", marginBottom: "2px" }}>Waveform Signature (20pt):</div>
                          <svg width="100%" height="24" viewBox="0 0 100 24" style={{ background: "#f8fafc", borderRadius: "3px", border: "1px solid #e2e8f0" }}>
                            {(() => {
                              const pts = report.waveformData;
                              const min = Math.min(...pts);
                              const max = Math.max(...pts);
                              const range = max - min || 1;
                              const polyPoints = pts
                                .map((v, i) => {
                                  const x = (i / (pts.length - 1)) * 96 + 2;
                                  const y = 22 - ((v - min) / range) * 20;
                                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                                })
                                .join(" ");
                              return (
                                <polyline
                                  fill="none"
                                  stroke={color}
                                  strokeWidth="1.5"
                                  points={polyPoints}
                                />
                              );
                            })()}
                          </svg>
                        </div>
                      )}
                      {vehicleCount > 1 && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "2px",
                          }}
                        >
                          {report.reportingVehicles?.map((v) => (
                            <span
                              key={v.id}
                              style={{
                                fontSize: "9px",
                                padding: "1px 4px",
                                background: "#f1f5f9",
                                border: "1px solid #cbd5e1",
                                borderRadius: "4px",
                                fontFamily: "monospace",
                              }}
                            >
                              {v.id ? v.id.substring(0, 5) : typeof v === 'string' ? v.substring(0, 5) : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      {report.isConfirmed && (
                        <div
                          style={{
                            marginTop: "4px",
                            fontSize: "10px",
                            color: "#16a34a",
                            fontWeight: "bold",
                          }}
                        >
                          ✓ Multi-Car Shape Confirmed
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
};
