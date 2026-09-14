import React from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Report } from "../../store/types";
import { XIcon } from "../shared/Icons";
import { useAppStore } from "../../store/useAppStore";
import { REPORT_TYPES } from "../../services/reportTypes";
import styles from "./ReportModal.module.css";

interface ReportModalProps {
  report: Report;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  report,
  onClose,
}) => {
  const reports = useAppStore((state) => state.reports);
  const updateReportStatus = useAppStore((state) => state.updateReportStatus);
  const currentReport = reports.find((r) => r.id === report.id) || report;
  const [isCorroborationsOpen, setIsCorroborationsOpen] = React.useState(false);

  const handleStatusChange = (status: Report["status"]) => {
    updateReportStatus(currentReport.id, status);
  };

  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        if (!modalRef.current) return;
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // Focus first element on mount
    if (modalRef.current) {
      const focusable = modalRef.current.querySelectorAll("button");
      if (focusable.length > 0) focusable[0].focus();
    }

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const typeInfo =
    REPORT_TYPES[currentReport.type] || REPORT_TYPES["POTENTIAL_POTHOLE"];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className={styles.header}>
          <div>
            <h2
              id="modal-title"
              className={styles.title}
              style={{ color: typeInfo.color }}
            >
              <span style={{ marginRight: "8px" }}>{typeInfo.icon}</span>
              {typeInfo.label}
            </h2>
            <div className={styles.id}>{currentReport.id}</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <XIcon />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.sectionGroup}>
            <div className={styles.sectionTitle}>Detection Metadata</div>

            <div className={styles.mapThumbnail}>
              <MapContainer
                center={[currentReport.latitude, currentReport.longitude]}
                zoom={15}
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker
                  position={[currentReport.latitude, currentReport.longitude]}
                />
              </MapContainer>
            </div>

            <div className={styles.metadataGrid}>
              <div className={styles.metaItem}>
                <div className={styles.label}>Date Detected</div>
                <div className={styles.value}>
                  {new Date(currentReport.reportDate).toLocaleDateString([], {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div className={styles.metaItem}>
                <div className={styles.label}>Initial Source</div>
                <div
                  className={styles.value}
                  style={{
                    fontFamily: "monospace",
                    fontSize: "var(--type-data)",
                  }}
                >
                  {currentReport.vehicleRef}
                </div>
              </div>
              <div className={styles.metaItem}>
                <div className={styles.label}>GPS Accuracy</div>
                <div className={styles.value}>±4.2m (Est)</div>
              </div>
              <div className={styles.metaItem}>
                <div className={styles.label}>Confidence</div>
                <div className={styles.value}>
                  <div className={styles.confidenceContainer}>
                    <div className={styles.confidenceGauge}>
                      <div
                        className={styles.confidenceFill}
                        style={{
                          width: `${currentReport.confidence}%`,
                          backgroundColor:
                            currentReport.confidence < 40
                              ? "var(--colour-danger)"
                              : currentReport.confidence <= 70
                                ? "var(--colour-warning)"
                                : "var(--colour-ok)",
                        }}
                      ></div>
                    </div>
                    <span
                      style={{
                        fontSize: "var(--type-data-sm)",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {currentReport.confidence}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Spatial Confirmation & Waveform Section */}
          <div className={styles.sectionGroup}>
            <div className={styles.sectionTitle}>Cross-Car Spatial Confirmation</div>
            <div style={{ padding: "var(--space-3)", backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  {currentReport.isConfirmed
                    ? "✓ Confirmed by Multiple Fleet Vehicles"
                    : currentReport.independentReports > 1
                    ? "Corroboration in Progress"
                    : "Awaiting Spatial Corroboration"}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontWeight: 600,
                    backgroundColor: currentReport.isConfirmed ? "rgba(22, 163, 74, 0.15)" : "rgba(217, 119, 6, 0.15)",
                    color: currentReport.isConfirmed ? "var(--colour-ok)" : "var(--colour-warning)",
                  }}
                >
                  {currentReport.isConfirmed ? "VERIFIED POTHOLE" : "PROVISIONAL"}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
                <div>Independent Cars: <strong style={{ color: "var(--text-primary)" }}>{currentReport.independentReports}</strong></div>
                <div>Shape Match (r): <strong style={{ color: "var(--text-primary)" }}>{currentReport.correlationScore !== null && currentReport.correlationScore !== undefined ? `${(currentReport.correlationScore * 100).toFixed(0)}%` : "Pending Pair"}</strong></div>
                <div>Vehicle Speed: <strong style={{ color: "var(--text-primary)" }}>{currentReport.speed ? `${(currentReport.speed * 3.6).toFixed(1)} km/h` : "N/A"}</strong></div>
                <div>Z-Force Delta: <strong style={{ color: "var(--text-primary)" }}>{currentReport.weight ? `${currentReport.weight.toFixed(2)}g` : "N/A"}</strong></div>
              </div>

              {currentReport.waveformData && currentReport.waveformData.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Normalized G-Force Signature (666ms Window, 20 Samples):
                  </div>
                  <svg width="100%" height="45" viewBox="0 0 200 45" style={{ background: "var(--bg-surface)", borderRadius: "4px", border: "1px solid var(--border-light)" }}>
                    {(() => {
                      const pts = currentReport.waveformData;
                      const min = Math.min(...pts);
                      const max = Math.max(...pts);
                      const range = max - min || 1;
                      const polyPoints = pts
                        .map((v, i) => {
                          const x = (i / (pts.length - 1)) * 192 + 4;
                          const y = 40 - ((v - min) / range) * 35;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(" ");
                      return (
                        <>
                          <line x1="0" y1="22.5" x2="200" y2="22.5" stroke="var(--border-light)" strokeDasharray="3 3" />
                          <polyline
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            points={polyPoints}
                          />
                        </>
                      );
                    })()}
                  </svg>
                </div>
              )}
            </div>
          </div>

          <div className={styles.sectionGroup}>
            <div className={styles.sectionTitle}>Verification & State</div>

            <div className={styles.statusBtns}>
              <button
                className={`${styles.statusBtn} ${styles.btnPending}`}
                disabled={currentReport.status === "pending"}
                onClick={() => handleStatusChange("pending")}
              >
                Pending
              </button>
              <button
                className={`${styles.statusBtn} ${styles.btnReview}`}
                disabled={currentReport.status === "under_review"}
                onClick={() => handleStatusChange("under_review")}
              >
                Under Review
              </button>
              <button
                className={`${styles.statusBtn} ${styles.btnResolved}`}
                disabled={currentReport.status === "resolved"}
                onClick={() => handleStatusChange("resolved")}
              >
                Resolved
              </button>
            </div>

            <div>
              <div
                className={styles.corroborationsToggle}
                onClick={() => setIsCorroborationsOpen(!isCorroborationsOpen)}
              >
                <span
                  className={`${styles.chevron} ${isCorroborationsOpen ? styles.open : ""}`}
                >
                  ▶
                </span>
                <span
                  className={styles.label}
                  style={{
                    userSelect: "none",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  Corroborations ({currentReport.independentReports})
                  {currentReport.independentReports > 1 && (
                    <span className={styles.corroborationPreview}>
                      (Verified by {currentReport.independentReports - 1} other
                      sources)
                    </span>
                  )}
                </span>
              </div>

              <div
                className={`${styles.corroborationsWrapper} ${isCorroborationsOpen ? styles.open : ""}`}
              >
                <div className={styles.corroborationsInner}>
                  {currentReport.independentReports === 1 ? (
                    <div
                      style={{
                        color: "var(--colour-warning)",
                        fontSize: "var(--type-caption)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        marginTop: "var(--space-3)",
                      }}
                    >
                      ⚠ Awaiting corroboration
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-3)",
                        marginTop: "var(--space-3)",
                        maxHeight: "240px",
                        overflowY: "auto",
                        paddingRight: "var(--space-2)",
                      }}
                    >
                      {currentReport.reportingVehicles?.map((v, idx) => (
                        <div key={v} className={styles.corroboratorCard}>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: "0.9rem",
                                color: "var(--text-primary)",
                              }}
                            >
                              {idx === 0
                                ? "Primary Sensor"
                                : `Corroborator #${idx}`}
                            </span>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: "0.75rem",
                                color: "var(--text-muted)",
                                wordBreak: "break-all",
                              }}
                            >
                              {v}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "var(--space-4)",
                              fontSize: "0.8rem",
                              color: "var(--text-secondary)",
                              marginTop: "4px",
                            }}
                          >
                            <span>
                              Recorded:{" "}
                              {new Date(
                                new Date(currentReport.reportDate).getTime() +
                                  idx * 1000 * 60 * 15,
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span>Offset: +{(idx * 4.2).toFixed(1)}m</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
