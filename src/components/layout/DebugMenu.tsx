import React, { useState } from "react";
import { supabase } from "../../services/supabaseClient";
import { Button } from "../shared/Button";
import { useAppStore } from "../../store/useAppStore";
import { AlertTriangleIcon, CheckCircleIcon, XIcon, ActivityIcon } from "../shared/Icons";
import styles from "./DebugMenu.module.css";

type ConfirmAction = "populate" | "clear" | null;

export const DebugMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [mockCount, setMockCount] = useState(5);
  
  const loadInitialData = useAppStore((state) => state.loadInitialData);
  const existingReports = useAppStore((state) => state.reports);

  const handlePopulate = async () => {
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

      // Upsert sectors first to ensure foreign keys are valid
      const { error: sectorErr } = await supabase.from("sectors").upsert(mockSectors);
      if (sectorErr) throw sectorErr;

      const allReports = [...existingReports];
      const reportsToUpsert = new Map();
      const generatedReportVehicles = [];

      for (let i = 0; i < mockCount; i++) {
        // 60% chance to corroborate if reports exist, otherwise 100% chance to create new
        const shouldCorroborate = allReports.length > 0 && Math.random() > 0.4;

        if (shouldCorroborate) {
          // Corroborate an existing report
          const target = allReports[Math.floor(Math.random() * allReports.length)];
          const vRef = `V-MOCK-${Math.floor(Math.random() * 99999)}`;
          
          generatedReportVehicles.push({ reportId: target.id, vehicleRef: vRef });
          
          const updatedTarget = {
            ...target,
            independentReports: (target.independentReports || 1) + 1,
          };
          
          // Auto-escalation local sim
          if (updatedTarget.independentReports >= 3 && updatedTarget.status === "pending") {
            updatedTarget.status = "under_review";
          }

          // Replace in local array so it can be corroborated again
          const idx = allReports.findIndex(r => r.id === target.id);
          if (idx !== -1) allReports[idx] = updatedTarget;

          reportsToUpsert.set(target.id, updatedTarget);
        } else {
          // Create new report
          const sector = Math.random() > 0.5 ? mockSectors[0] : mockSectors[1];
          const rptId = `RPT-${Math.floor(Math.random() * 90000) + 10000}`;
          const types = ["ROAD_ANOMALY", "TRAFFIC_HAZARD", "POTENTIAL_POTHOLE", "SEVERE_POTHOLE"];
          const type = types[Math.floor(Math.random() * types.length)];
          
          const bases = [
            { lat: 30.7414, lng: 76.6433 }, // Kharar
            { lat: 30.7333, lng: 76.7794 }, // Chandigarh
            { lat: 30.6908, lng: 76.7126 }, // Mohali
          ];
          const base = bases[Math.floor(Math.random() * bases.length)];
          
          const lat = base.lat + (Math.random() - 0.5) * 0.08;
          const lng = base.lng + (Math.random() - 0.5) * 0.08;
          const vehicleRef = `V-MOCK-${Math.floor(Math.random() * 99999)}`;

          const newReport = {
            id: rptId,
            sectorId: sector.id,
            sectorName: sector.displayName,
            roadReference: `Mocked Road ${i}`,
            type,
            confidence: Math.floor(Math.random() * 40) + 60,
            weight: Number((Math.random() * 5).toFixed(1)),
            source: "VEHICLE_SENSOR",
            vehicleRef,
            status: "pending",
            latitude: Number(lat.toFixed(5)),
            longitude: Number(lng.toFixed(5)),
            independentReports: 1,
            reportDate: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString(),
          };

          allReports.push(newReport as any);
          reportsToUpsert.set(newReport.id, newReport);
          generatedReportVehicles.push({ reportId: rptId, vehicleRef });
        }
      }

      // Prepare final array to upsert (omitting local-only fields that Supabase doesn't know)
      const reportsArray = Array.from(reportsToUpsert.values()).map(r => {
        const { reportingVehicles, ...dbFields } = r as any;
        return dbFields;
      });

      if (reportsArray.length > 0) {
        const { error: reportErr } = await supabase.from("reports").upsert(reportsArray);
        if (reportErr) throw reportErr;
      }

      if (generatedReportVehicles.length > 0) {
        const { error: rvErr } = await supabase.from("report_vehicles").upsert(generatedReportVehicles);
        if (rvErr) throw rvErr;
      }
      
      await loadInitialData();
      setConfirmAction(null);
      setIsOpen(false);
    } catch (err: any) {
      alert(`Error populating database: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      const { error: err1 } = await supabase.from("report_vehicles").delete().neq("reportId", "0");
      if (err1) throw err1;
      
      const { error: err2 } = await supabase.from("reports").delete().neq("id", "0");
      if (err2) throw err2;
      
      const { error: err3 } = await supabase.from("vehicles").delete().neq("id", "0");
      if (err3) throw err3;

      await loadInitialData();
      setConfirmAction(null);
      setIsOpen(false);
    } catch (err: any) {
      alert(`Error clearing database: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderConfirmation = () => {
    if (confirmAction === "populate") {
      return (
        <div className={styles.confirmBox}>
          <p className={styles.confirmText}>
            Are you sure you want to trigger <strong>{mockCount}</strong> mock events? 
            Each event will either create a new report or corroborate an existing one.
          </p>
          <div className={styles.sliderContainer}>
            <div className={styles.sliderHeader}>
              <span className={styles.sliderLabel}>Events to trigger</span>
              <span className={styles.sliderValue}>{mockCount}</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={mockCount} 
              onChange={(e) => setMockCount(parseInt(e.target.value))}
              className={styles.slider}
              disabled={loading}
            />
          </div>
          <div className={styles.confirmActions}>
            <Button variant="secondary" onClick={() => setConfirmAction(null)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handlePopulate} disabled={loading}>
              {loading ? "Working..." : "Confirm"}
            </Button>
          </div>
        </div>
      );
    }

    if (confirmAction === "clear") {
      return (
        <div className={styles.confirmBox}>
          <p className={styles.confirmText}>
            <AlertTriangleIcon style={{ color: "var(--colour-warning)", verticalAlign: "bottom", marginRight: "4px" }} />
            Are you sure you want to <strong>clear all data</strong>? This cannot be undone.
          </p>
          <div className={styles.confirmActions}>
            <Button variant="secondary" onClick={() => setConfirmAction(null)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleClear} disabled={loading}>
              {loading ? "Working..." : "Clear Data"}
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={styles.debugWrapper}>
      <div className={`${styles.debugMenu} ${isOpen ? styles.open : ""}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <ActivityIcon /> Debug Options
          </h3>
          <button 
            className={styles.closeButton}
            onClick={() => {
              setIsOpen(false);
              setConfirmAction(null);
            }}
            title="Close Menu"
          >
            <XIcon />
          </button>
        </div>
        
        {!confirmAction ? (
          <div className={styles.actionList}>
            <Button 
              variant="secondary" 
              onClick={() => setConfirmAction("populate")}
            >
              <CheckCircleIcon style={{ marginRight: "8px", width: "16px", height: "16px" }} />
              Populate Mock Data
            </Button>
            <Button 
              variant="danger" 
              onClick={() => setConfirmAction("clear")}
            >
              <AlertTriangleIcon style={{ marginRight: "8px", width: "16px", height: "16px" }} />
              Clear Database
            </Button>
          </div>
        ) : (
          renderConfirmation()
        )}
      </div>

      <Button 
        variant="secondary" 
        onClick={() => setIsOpen(!isOpen)}
        className={`${styles.triggerButton} ${isOpen ? styles.hidden : ""}`}
        style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
      >
        <ActivityIcon style={{ marginRight: "8px", width: "18px", height: "18px" }} />
        Debug
      </Button>
    </div>
  );
};
