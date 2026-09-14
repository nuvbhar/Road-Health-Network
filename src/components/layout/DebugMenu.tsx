import React, { useState } from "react";
import { supabase } from "../../services/supabaseClient";
import { Button } from "../shared/Button";
import { useAppStore } from "../../store/useAppStore";

export const DebugMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const loadInitialData = useAppStore((state) => state.loadInitialData);

  const handlePopulate = async () => {
    if (!window.confirm("Are you sure you want to populate the database with mock data?")) return;
    setLoading(true);
    try {
      // Basic mock sectors
      const mockSectors = [
        {
          id: "SEC-A",
          name: "Sector A",
          displayName: "Kharar-CU Sector A",
          status: "monitoring",
          reportCount: 0,
          confidence: 90,
          startLat: 30.741,
          startLng: 76.603,
          endLat: 30.769,
          endLng: 76.643,
        },
        {
          id: "SEC-B",
          name: "Sector B",
          displayName: "Kharar-CU Sector B",
          status: "monitoring",
          reportCount: 0,
          confidence: 85,
          startLat: 30.725,
          startLng: 76.595,
          endLat: 30.741,
          endLng: 76.603,
        },
      ];

      // Basic mock reports
      const mockReports = [
        {
          id: "RPT-1001",
          sectorId: "SEC-A",
          sectorName: "Kharar-CU Sector A",
          roadReference: "NH-5 (Kharar Rd)",
          type: "ROAD_ANOMALY",
          confidence: 92,
          weight: 4.5,
          source: "VEHICLE_SENSOR",
          vehicleRef: "V-TRK-9902",
          status: "pending",
          latitude: 30.755,
          longitude: 76.621,
          independentReports: 4,
          reportDate: new Date().toISOString(),
        },
        {
          id: "RPT-1002",
          sectorId: "SEC-B",
          sectorName: "Kharar-CU Sector B",
          roadReference: "CU Campus Road",
          type: "TRAFFIC_HAZARD",
          confidence: 78,
          weight: 3.2,
          source: "VEHICLE_SENSOR",
          vehicleRef: "V-CAR-4122",
          status: "under_review",
          latitude: 30.732,
          longitude: 76.598,
          independentReports: 2,
          reportDate: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        }
      ];

      // Insert sectors and check for errors
      const { error: sectorErr } = await supabase.from("sectors").upsert(mockSectors);
      if (sectorErr) throw sectorErr;

      const { error: reportErr } = await supabase.from("reports").upsert(mockReports);
      if (reportErr) throw reportErr;
      
      alert("Database populated successfully!");
      loadInitialData(); // Refresh UI
    } catch (err: any) {
      alert(`Error populating database: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm("WARNING: This will delete ALL data from the database. Are you sure?")) return;
    setLoading(true);
    try {
      // Attempt to delete everything (Requires RLS policies to allow DELETE)
      const { error: err1 } = await supabase.from("report_vehicles").delete().neq("reportId", "0");
      if (err1) throw err1;
      
      const { error: err2 } = await supabase.from("reports").delete().neq("id", "0");
      if (err2) throw err2;
      
      const { error: err3 } = await supabase.from("vehicles").delete().neq("id", "0");
      if (err3) throw err3;

      alert("Database cleared successfully!");
      loadInitialData(); // Refresh UI
    } catch (err: any) {
      alert(`Error clearing database. Note: You must allow DELETE in your Supabase RLS policies first!\n\nDetails: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 9999 }}>
      {isOpen ? (
        <div style={{ 
          backgroundColor: "var(--bg-elevated)", 
          padding: "var(--space-4)", 
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          border: "1px solid var(--border-subtle)",
          width: "250px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "var(--type-base)", margin: 0 }}>🛠 Debug Menu</h3>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
          <hr style={{ borderColor: "var(--border-subtle)", margin: 0 }} />
          <Button variant="primary" onClick={handlePopulate} disabled={loading} style={{ width: "100%" }}>
            {loading ? "Working..." : "Populate Mock Data"}
          </Button>
          <Button variant="danger" onClick={handleClear} disabled={loading} style={{ width: "100%" }}>
            {loading ? "Working..." : "Clear Database"}
          </Button>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setIsOpen(true)}>
          🛠 Debug
        </Button>
      )}
    </div>
  );
};
