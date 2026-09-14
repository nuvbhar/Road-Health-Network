import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Badge } from "../shared/Badge";

export const VehicleList: React.FC = () => {
  const vehicles = useAppStore((state) => state.vehicles);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.sectorId.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-light)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-4)",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        marginTop: "var(--space-6)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ fontSize: "var(--type-heading)", fontWeight: 600 }}>
          Active Fleet
        </h3>
        <input
          type="text"
          placeholder="Search by ID or Sector..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            fontSize: "var(--type-caption)",
          }}
        />
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border-light)",
                color: "var(--text-muted)",
                fontSize: "var(--type-caption)",
                textTransform: "uppercase",
              }}
            >
              <th style={{ padding: "var(--space-2)" }}>Vehicle ID</th>
              <th style={{ padding: "var(--space-2)" }}>Sector</th>
              <th style={{ padding: "var(--space-2)" }}>Status</th>
              <th style={{ padding: "var(--space-2)" }}>Reports Today</th>
              <th style={{ padding: "var(--space-2)" }}>Trust Score</th>
              <th style={{ padding: "var(--space-2)" }}>Calibration</th>
              <th style={{ padding: "var(--space-2)" }}>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.map((vehicle) => (
              <tr
                key={vehicle.id}
                style={{
                  borderBottom: "1px solid var(--border-light)",
                  fontSize: "var(--type-body)",
                }}
              >
                <td
                  style={{
                    padding: "var(--space-3) var(--space-2)",
                    fontFamily: "monospace",
                    fontWeight: 600,
                  }}
                >
                  {vehicle.id}
                </td>
                <td style={{ padding: "var(--space-3) var(--space-2)" }}>
                  {vehicle.sectorId}
                </td>
                <td style={{ padding: "var(--space-3) var(--space-2)" }}>
                  <Badge
                    variant={
                      vehicle.status === "active"
                        ? "ok"
                        : vehicle.status === "idle"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {vehicle.status}
                  </Badge>
                </td>
                <td
                  style={{
                    padding: "var(--space-3) var(--space-2)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {vehicle.reportsToday}
                </td>
                <td style={{ padding: "var(--space-3) var(--space-2)" }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: (vehicle.trustScore ?? 100) >= 80 ? "var(--colour-ok)" : (vehicle.trustScore ?? 100) >= 40 ? "var(--colour-warning)" : "var(--colour-danger)"
                    }}></div>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {vehicle.trustScore !== undefined ? vehicle.trustScore.toFixed(0) : 100}
                    </span>
                  </div>
                </td>
                <td
                  style={{
                    padding: "var(--space-3) var(--space-2)",
                    fontVariantNumeric: "tabular-nums",
                    color: "var(--text-secondary)",
                  }}
                >
                  {vehicle.calibrationFactor !== undefined ? vehicle.calibrationFactor.toFixed(2) : "1.00"}x
                </td>
                <td
                  style={{
                    padding: "var(--space-3) var(--space-2)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {new Date(vehicle.lastSeenAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredVehicles.length === 0 && (
          <div
            style={{
              padding: "var(--space-6)",
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            No vehicles found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
};
