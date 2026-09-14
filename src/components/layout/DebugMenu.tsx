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

  const [testScenario, setTestScenario] = useState<"random" | "degradation" | "rhi" | "trust">("random");

  const handlePopulate = async () => {
    setLoading(true);
    try {
      const { createReport } = await import("../../services/api");

      // Basic mock sectors (ensure they exist)
      const mockSectors = [
        {
          id: "SEC-A",
          name: "Sector A",
          displayName: "Kharar-CU Sector A",
          status: "monitoring",
          healthIndex: 100.0,
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
          healthIndex: 100.0,
          reportCount: 0,
          confidence: 85,
          startLat: 30.725,
          startLng: 76.595,
          endLat: 30.741,
          endLng: 76.603,
        },
      ];
      await supabase.from("sectors").upsert(mockSectors);

      if (testScenario === "random") {
        const { data: dbSectors } = await supabase.from("sectors").select("*");
        const availableSectors = (dbSectors && dbSectors.length > 0) ? dbSectors : mockSectors;

        const { data: existingReportsDB } = await supabase.from("reports").select("id, type, sectorId, sectorName, latitude, longitude").neq("status", "resolved");
        const allTypes: any[] = ["POTENTIAL_POTHOLE", "SEVERE_POTHOLE"];
        const promises = [];

        for (let i = 0; i < mockCount; i++) {
          const shouldCorroborate = existingReportsDB && existingReportsDB.length > 0 && Math.random() < 0.5;
          
          let lat = 0;
          let lng = 0;
          let type: any = "";
          let sectorId = "";
          let sectorName = "";

          if (shouldCorroborate) {
            const target = existingReportsDB[Math.floor(Math.random() * existingReportsDB.length)];
            type = target.type;
            sectorId = target.sectorId;
            sectorName = target.sectorName;
            lat = target.latitude + (Math.random() - 0.5) * 0.00008; 
            lng = target.longitude + (Math.random() - 0.5) * 0.00008;
          } else {
            const sector = availableSectors[Math.floor(Math.random() * availableSectors.length)];
            type = allTypes[Math.floor(Math.random() * allTypes.length)];
            sectorId = sector.id;
            sectorName = sector.displayName || sector.name || "Unknown Sector";
            
            lat = 30.7414 + (Math.random() - 0.5) * 0.05;
            lng = 76.6433 + (Math.random() - 0.5) * 0.05;

            if (sector.startLat && sector.endLat) {
              const minLat = Math.min(sector.startLat, sector.endLat);
              const maxLat = Math.max(sector.startLat, sector.endLat);
              lat = minLat + Math.random() * (maxLat - minLat);
              
              const minLng = Math.min(sector.startLng, sector.endLng);
              const maxLng = Math.max(sector.startLng, sector.endLng);
              lng = minLng + Math.random() * (maxLng - minLng);
            }
          }
          
          const hex = () => Math.random().toString(16).slice(2, 10);
          const mockUUID = `MOCK-${hex()}-${hex().slice(0, 4)}`;
          
          // Spread time across the last 24 hours randomly
          const randomPastMs = Math.floor(Math.random() * 24 * 60 * 60 * 1000);
          const reportDate = new Date(Date.now() - randomPastMs).toISOString();

          promises.push(
            createReport({
              type,
              sectorId,
              sectorName,
              latitude: Number(lat.toFixed(6)),
              longitude: Number(lng.toFixed(6)),
              weight: Number((Math.random() * 8 + 1).toFixed(1)),
              confidence: Math.floor(Math.random() * 90) + 10,
              vehicleRef: mockUUID,
              reportDate
            })
          );
        }
        
        await Promise.all(promises);
      }
      else if (testScenario === "degradation") {
        // Create an initial pothole, then have 3 vehicles report it with increasing weight
        const baseLat = 30.742;
        const baseLng = 76.612;
        
        // Initial report
        await createReport({
          type: "POTENTIAL_POTHOLE",
          sectorId: "SEC-A",
          latitude: baseLat,
          longitude: baseLng,
          weight: 1.5,
          vehicleRef: "V-DEG-1",
        });

        // Corroborations with higher weight
        for (let i = 2; i <= 4; i++) {
          await new Promise(r => setTimeout(r, 500)); // slight delay to avoid race conditions
          await createReport({
            type: "POTENTIAL_POTHOLE",
            sectorId: "SEC-A",
            latitude: baseLat + 0.0001, // Close enough to corroborate
            longitude: baseLng + 0.0001,
            weight: 1.5 + (i * 1.0), // Weight increasing rapidly!
            vehicleRef: `V-DEG-${i}`,
          });
        }
      }
      else if (testScenario === "rhi") {
        // Bombard Sector A with severe potholes
        for (let p = 0; p < 5; p++) {
          const pLat = 30.75 + (Math.random() * 0.01);
          const pLng = 76.62 + (Math.random() * 0.01);
          
          for (let v = 1; v <= 3; v++) {
            await createReport({
              type: "SEVERE_POTHOLE",
              sectorId: "SEC-A",
              latitude: pLat,
              longitude: pLng,
              weight: 5.0,
              vehicleRef: `V-RHI-${v}`,
            });
          }
        }
      }
      else if (testScenario === "trust") {
        // Create a known spammer vehicle
        await supabase.from("vehicles").upsert({
          id: "V-SPAMMER",
          sectorId: "SEC-B",
          status: "active",
          trustScore: 10,
          unverifiedReports: 50,
          lastSeenAt: new Date().toISOString()
        });

        // Try to report from spammer
        await createReport({
          type: "SEVERE_POTHOLE",
          sectorId: "SEC-B",
          latitude: 30.730,
          longitude: 76.600,
          weight: 4.0,
          vehicleRef: "V-SPAMMER",
        });
      }
      else if (testScenario === "calibration") {
        // Vehicle A: Heavy Truck (Calibration Factor = 0.5)
        await supabase.from("vehicles").upsert({
          id: "V-TRUCK",
          sectorId: "SEC-A",
          status: "active",
          calibrationFactor: 0.5,
          lastSeenAt: new Date().toISOString()
        });
        
        await createReport({
          type: "ROAD_ANOMALY",
          sectorId: "SEC-A",
          latitude: 30.741,
          longitude: 76.603,
          weight: 2.0, // The physical bump is 2.0 (but sensor read 4.0, calibrated down)
          vehicleRef: "V-TRUCK",
        });

        // Vehicle B: Sports Car (Calibration Factor = 1.5)
        await supabase.from("vehicles").upsert({
          id: "V-SPORTSCAR",
          sectorId: "SEC-A",
          status: "active",
          calibrationFactor: 1.5,
          lastSeenAt: new Date().toISOString()
        });

        await createReport({
          type: "ROAD_ANOMALY",
          sectorId: "SEC-A",
          latitude: 30.742,
          longitude: 76.604,
          weight: 2.0, // Same physical bump (sensor read 1.33, calibrated up)
          vehicleRef: "V-SPORTSCAR",
        });
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
            Select a specific test scenario to generate mock data.
          </p>

          <div className={styles.scenarioSelect}>
            <label>Test Scenario:</label>
            <select 
              value={testScenario} 
              onChange={(e) => setTestScenario(e.target.value as any)}
              disabled={loading}
              style={{ width: '100%', padding: '8px', margin: '8px 0', background: 'var(--colour-surface)', color: 'var(--colour-text)', border: '1px solid var(--colour-border)' }}
            >
              <option value="random">Random Distribution</option>
              <option value="degradation">Test Pothole Degradation</option>
              <option value="rhi">Test RHI Tanking (Sector A)</option>
              <option value="trust">Test Trust Scoring (Spammer)</option>
              <option value="calibration">Test Auto-Calibration</option>
            </select>
          </div>

          {testScenario === "random" && (
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
          )}

          <div className={styles.confirmActions}>
            <Button variant="secondary" onClick={() => setConfirmAction(null)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handlePopulate} disabled={loading}>
              {loading ? "Working..." : "Run Test"}
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
