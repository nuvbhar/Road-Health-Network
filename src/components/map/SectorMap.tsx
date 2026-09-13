import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Tooltip as LeafletTooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useAppStore } from "../../store/useAppStore";
import { ReportMarkerLayer } from "./ReportMarkerLayer";
import styles from "./SectorMap.module.css";

// Component to handle auto-zooming/panning to active sector
const MapController: React.FC<{ activeSectorId: string | null }> = ({
  activeSectorId,
}) => {
  const map = useMap();
  const sectors = useAppStore((state) => state.sectors);

  useEffect(() => {
    if (activeSectorId) {
      const activeSector = sectors.find((s) => s.id === activeSectorId);
      if (activeSector && activeSector.bounds) {
        const bounds = L.latLngBounds(
          [activeSector.bounds.startLat, activeSector.bounds.startLng],
          [activeSector.bounds.endLat, activeSector.bounds.endLng],
        );
        map.flyToBounds(bounds, { padding: [50, 50], duration: 1 });
      }
    } else {
      // Default view over Kharar-CU roughly
      map.flyTo([30.7587, 76.6089], 14, { duration: 1 });
    }
  }, [activeSectorId, map, sectors]);

  return null;
};

export const SectorMap: React.FC = () => {
  const sectors = useAppStore((state) => state.sectors);
  const reports = useAppStore((state) => state.reports);
  const activeSectorFilter = useAppStore((state) => state.activeSectorFilter);
  const setSectorFilter = useAppStore((state) => state.setSectorFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "defect":
        return "#dc2626"; // --colour-danger
      case "caution":
        return "#d97706"; // --colour-warning
      case "normal":
      default:
        return "#16a34a"; // --colour-ok
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Network Status Map</h3>
        {activeSectorFilter && (
          <button
            style={{
              fontSize: "var(--type-caption)",
              padding: "var(--space-1) var(--space-2)",
              cursor: "pointer",
            }}
            onClick={() => setSectorFilter(null)}
          >
            Reset View
          </button>
        )}
      </div>

      <div className={styles.mapWrapper}>
        <MapContainer
          center={[30.7587, 76.6089]}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController activeSectorId={activeSectorFilter} />

          {sectors.map((sector) => {
            if (!sector.bounds) return null;
            const positions: [number, number][] = [
              [sector.bounds.startLat, sector.bounds.startLng],
              [sector.bounds.endLat, sector.bounds.endLng],
            ];
            const isActive = activeSectorFilter === sector.id;

            return (
              <Polyline
                key={sector.id}
                positions={positions}
                pathOptions={{
                  color: isActive ? "#0f172a" : getStatusColor(sector.status),
                  weight: isActive ? 10 : 6,
                  opacity: isActive ? 0.8 : 0.4,
                }}
                eventHandlers={{
                  click: () => {
                    setSectorFilter(isActive ? null : sector.id);
                  },
                }}
              >
                <LeafletTooltip sticky className={styles.tooltipContainer}>
                  <div className={styles.tooltipTitle}>
                    {sector.displayName}
                  </div>
                  <div className={styles.tooltipRow}>
                    <span>Status:</span>
                    <span
                      className={styles.tooltipValue}
                      style={{ color: getStatusColor(sector.status) }}
                    >
                      {sector.status.toUpperCase()}
                    </span>
                  </div>
                  <div className={styles.tooltipRow}>
                    <span>Reports:</span>
                    <span className={styles.tooltipValue}>
                      {sector.reportCount}
                    </span>
                  </div>
                </LeafletTooltip>
              </Polyline>
            );
          })}

          <ReportMarkerLayer reports={reports} />
        </MapContainer>
      </div>

      <div className={styles.legend}>
        <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
          Segment Health:
        </span>
        <div className={styles.legendItem}>
          <div
            className={styles.legendColor}
            style={{ backgroundColor: "#16a34a" }}
          ></div>
          <span>Normal</span>
        </div>
        <div className={styles.legendItem}>
          <div
            className={styles.legendColor}
            style={{ backgroundColor: "#d97706" }}
          ></div>
          <span>Caution</span>
        </div>
        <div className={styles.legendItem}>
          <div
            className={styles.legendColor}
            style={{ backgroundColor: "#dc2626" }}
          ></div>
          <span>Defect</span>
        </div>
      </div>
    </div>
  );
};
