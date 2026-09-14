import { Router } from "express";
import { supabase } from "./db";
import { broadcast } from "./ws";

export const router = Router();

// /api/stats
router.get("/stats", async (req, res) => {
  try {
    const [
      { count: totalReports },
      { count: activeVehicles },
      { count: sectorsMonitored },
      { count: highConfidence },
      { count: pendingReview },
      { count: resolved },
    ] = await Promise.all([
      supabase.from("reports").select("*", { count: "exact", head: true }),
      supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("sectors").select("*", { count: "exact", head: true }),
      supabase.from("reports").select("*", { count: "exact", head: true }).gt("confidence", 80),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "resolved"),
    ]);

    res.json({
      ok: true,
      data: {
        totalReports: totalReports || 0,
        activeVehicles: activeVehicles || 0,
        sectorsMonitored: sectorsMonitored || 0,
        highConfidence: highConfidence || 0,
        pendingReview: pendingReview || 0,
        resolved: resolved || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to fetch stats" });
  }
});

// /api/sectors
router.get("/sectors", async (req, res) => {
  try {
    const { data: sectorsData } = await supabase.from("sectors").select("*");
    const sectors = (sectorsData || []).map((row: any) => ({
      ...row,
      bounds: {
        startLat: row.startLat,
        startLng: row.startLng,
        endLat: row.endLat,
        endLng: row.endLng,
      },
    }));
    res.json({ ok: true, data: sectors });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to fetch sectors" });
  }
});

// /api/reports
router.get("/reports", async (req, res) => {
  try {
    const { sectorId, status } = req.query;
    
    let query = supabase.from("reports").select("*, report_vehicles(vehicleRef)").order("id", { ascending: false });

    if (sectorId && typeof sectorId === "string") {
      query = query.eq("sectorId", sectorId);
    }
    if (status && status !== "all" && typeof status === "string") {
      query = query.eq("status", status);
    }

    const { data: reportsData } = await query;
    
    const reports = (reportsData || []).map((r: any) => {
      const vehicles = (r.report_vehicles || []).map((v: any) => v.vehicleRef);
      const result = {
        ...r,
        rawDataShared: !!r.rawDataShared,
        reportingVehicles: vehicles,
      };
      delete result.report_vehicles;
      return result;
    });

    res.json({ ok: true, data: reports });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to fetch reports" });
  }
});

// /api/vehicles
router.get("/vehicles", async (req, res) => {
  try {
    const { data: vehicles } = await supabase.from("vehicles").select("*");
    res.json({ ok: true, data: vehicles });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to fetch vehicles" });
  }
});

// /api/trend
router.get("/trend", async (req, res) => {
  try {
    const trend = Array.from({ length: 24 }, (_, i) => {
      const d = new Date();
      d.setHours(d.getHours() - (23 - i));
      return {
        hour: `${d.getHours().toString().padStart(2, "0")}:00`,
        count: 0,
      };
    });

    const { data: recentReports } = await supabase.from("reports").select("reportDate");
    const now = Date.now();

    (recentReports || []).forEach((r: any) => {
      const rDate = new Date(r.reportDate);
      if (!isNaN(rDate.getTime())) {
        const diffHours = Math.floor((now - rDate.getTime()) / (1000 * 60 * 60));
        if (diffHours >= 0 && diffHours < 24) {
          const bucketIndex = 23 - diffHours;
          if (trend[bucketIndex]) {
            trend[bucketIndex].count++;
          }
        }
      }
    });

    res.json({ ok: true, data: trend });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to fetch trend" });
  }
});

// /api/reports/:id/status
router.patch("/reports/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["pending", "under_review", "resolved"].includes(status)) {
      return res.status(400).json({ ok: false, error: "Invalid status" });
    }
    await supabase.from("reports").update({ status }).eq("id", id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Failed to update report status" });
  }
});

// Haversine distance in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

// /api/reports (POST)
router.post("/reports", async (req, res) => {
  try {
    const data = req.body;
    const wss = req.app.locals.wss;
    const lat = data.latitude || 0;
    const lon = data.longitude || 0;
    const reportType = data.type || "ROAD_ANOMALY";
    const vehicleRef = data.vehicleRef || "User-UNKNOWN";

    // 1. Check for nearby active reports of same type
    const { data: activeReports } = await supabase
      .from("reports")
      .select("*")
      .neq("status", "resolved")
      .eq("type", reportType);

    let matchedReport: any = null;
    for (const r of (activeReports || [])) {
      if (r.latitude && r.longitude) {
        const dist = getDistance(lat, lon, r.latitude, r.longitude);
        if (dist <= 50) {
          matchedReport = r;
          break;
        }
      }
    }

    if (matchedReport) {
      // Check if this vehicle already reported this (to avoid spam)
      const { data: existingVehicles } = await supabase
        .from("report_vehicles")
        .select("*")
        .eq("reportId", matchedReport.id)
        .eq("vehicleRef", vehicleRef);
      
      const existingVehicle = existingVehicles?.[0];

      if (!existingVehicle) {
        await supabase.from("report_vehicles").insert({ reportId: matchedReport.id, vehicleRef });
        
        const newCount = matchedReport.independentReports + 1;
        await supabase.from("reports").update({ independentReports: newCount }).eq("id", matchedReport.id);

        const { data: updatedData } = await supabase
          .from("reports")
          .select("*")
          .eq("id", matchedReport.id);
        
        const updated = updatedData?.[0] || matchedReport;

        // Auto-escalation Logic
        if (updated.independentReports >= 3 && updated.status === "pending") {
          await supabase.from("reports").update({ status: "under_review" }).eq("id", matchedReport.id);
          updated.status = "under_review";
        }

        if (wss) {
          broadcast(wss, "report:updated", updated);
        }
      }

      return res.json({
        ok: true,
        data: { id: matchedReport.id, corroborated: true },
      });
    }

    // 2. No nearby report found, create a new one
    const id = data.id || `RPT-${Math.floor(1000 + Math.random() * 9000)}`;
    
    await supabase.from("reports").insert({
      id,
      reportDate: data.reportDate || new Date().toISOString(),
      sectorId: data.sectorId || "SEC-A",
      sectorName: data.sectorName || "Kharar-CU Sector A",
      roadReference: data.roadReference || "Unknown",
      type: reportType,
      confidence: data.confidence || 50,
      weight: data.weight || 0,
      source: data.source || "VEHICLE_SENSOR",
      vehicleRef,
      rawDataShared: 0,
      status: data.status || "pending",
      latitude: lat,
      longitude: lon,
      independentReports: data.independentReports || 1,
    });

    if (data.reportingVehicles && Array.isArray(data.reportingVehicles)) {
      const records = data.reportingVehicles.map((v: string) => ({ reportId: id, vehicleRef: v }));
      await supabase.from("report_vehicles").insert(records);
    } else {
      await supabase.from("report_vehicles").insert({ reportId: id, vehicleRef });
    }

    if (wss) {
      broadcast(wss, "report:new", { id });
    }

    res.json({ ok: true, data: { id, corroborated: false } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: "Failed to create report" });
  }
});
