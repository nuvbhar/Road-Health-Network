import { Router } from "express";
import { db } from "./db";
import { broadcast } from "./ws";

export const router = Router();

// /api/stats
router.get("/stats", (req, res) => {
  const totalReports = (
    db.prepare("SELECT COUNT(*) as c FROM reports").get() as any
  ).c;
  const activeVehicles = (
    db
      .prepare("SELECT COUNT(*) as c FROM vehicles WHERE status = ?")
      .get("active") as any
  ).c;
  const sectorsMonitored = (
    db.prepare("SELECT COUNT(*) as c FROM sectors").get() as any
  ).c;
  const highConfidence = (
    db
      .prepare("SELECT COUNT(*) as c FROM reports WHERE confidence > 80")
      .get() as any
  ).c;
  const pendingReview = (
    db
      .prepare("SELECT COUNT(*) as c FROM reports WHERE status = ?")
      .get("pending") as any
  ).c;
  const resolved = (
    db
      .prepare("SELECT COUNT(*) as c FROM reports WHERE status = ?")
      .get("resolved") as any
  ).c;

  res.json({
    ok: true,
    data: {
      totalReports,
      activeVehicles,
      sectorsMonitored,
      highConfidence,
      pendingReview,
      resolved,
    },
  });
});

// /api/sectors
router.get("/sectors", (req, res) => {
  const sectors = db
    .prepare("SELECT * FROM sectors")
    .all()
    .map((row: any) => ({
      ...row,
      bounds: {
        startLat: row.startLat,
        startLng: row.startLng,
        endLat: row.endLat,
        endLng: row.endLng,
      },
    }));
  res.json({ ok: true, data: sectors });
});

// /api/reports
router.get("/reports", (req, res) => {
  const { sectorId, status } = req.query;
  let query = "SELECT * FROM reports";
  const params: any[] = [];
  const conditions = [];

  if (sectorId && typeof sectorId === "string") {
    conditions.push("sectorId = ?");
    params.push(sectorId);
  }
  if (status && status !== "all" && typeof status === "string") {
    conditions.push("status = ?");
    params.push(status);
  }
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " ORDER BY id DESC";

  const reports = db
    .prepare(query)
    .all(...params)
    .map((r: any) => {
      const vehicles = db
        .prepare("SELECT vehicleRef FROM report_vehicles WHERE reportId = ?")
        .all(r.id)
        .map((v: any) => v.vehicleRef);
      return {
        ...r,
        rawDataShared: !!r.rawDataShared,
        reportingVehicles: vehicles,
      };
    });

  res.json({ ok: true, data: reports });
});

// /api/vehicles
router.get("/vehicles", (req, res) => {
  const vehicles = db.prepare("SELECT * FROM vehicles").all();
  res.json({ ok: true, data: vehicles });
});

// /api/trend
router.get("/trend", (req, res) => {
  const trend = Array.from({ length: 24 }, (_, i) => {
    const d = new Date();
    d.setHours(d.getHours() - (23 - i));
    return {
      hour: `${d.getHours().toString().padStart(2, "0")}:00`,
      count: 0,
    };
  });

  const recentReports = db.prepare("SELECT reportDate FROM reports").all();
  const now = Date.now();

  recentReports.forEach((r: any) => {
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
});

// /api/reports/:id/status
router.patch("/reports/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["pending", "under_review", "resolved"].includes(status)) {
    return res.status(400).json({ ok: false, error: "Invalid status" });
  }
  db.prepare("UPDATE reports SET status = ? WHERE id = ?").run(status, id);
  res.json({ ok: true });
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
router.post("/reports", (req, res) => {
  const data = req.body;
  const wss = req.app.locals.wss;
  const lat = data.latitude || 0;
  const lon = data.longitude || 0;
  const reportType = data.type || "ROAD_ANOMALY";
  const vehicleRef = data.vehicleRef || "User-UNKNOWN";

  // 1. Check for nearby active reports of same type
  const activeReports = db
    .prepare("SELECT * FROM reports WHERE status != ? AND type = ?")
    .all("resolved", reportType);

  let matchedReport: any = null;
  for (const r of activeReports as any[]) {
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
    const existingVehicle = db
      .prepare(
        "SELECT * FROM report_vehicles WHERE reportId = ? AND vehicleRef = ?",
      )
      .get(matchedReport.id, vehicleRef);

    if (!existingVehicle) {
      db.prepare(
        "INSERT INTO report_vehicles (reportId, vehicleRef) VALUES (?, ?)",
      ).run(matchedReport.id, vehicleRef);
      db.prepare(
        "UPDATE reports SET independentReports = independentReports + 1 WHERE id = ?",
      ).run(matchedReport.id);

      const updated = db
        .prepare("SELECT * FROM reports WHERE id = ?")
        .get(matchedReport.id) as any;

      // Auto-escalation Logic
      if (updated.independentReports >= 3 && updated.status === "pending") {
        db.prepare("UPDATE reports SET status = ? WHERE id = ?").run(
          "under_review",
          matchedReport.id,
        );
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
  const insert = db.prepare(`
    INSERT INTO reports (id, reportDate, sectorId, sectorName, roadReference, type, confidence, weight, source, vehicleRef, rawDataShared, status, latitude, longitude, independentReports)
    VALUES (@id, @reportDate, @sectorId, @sectorName, @roadReference, @type, @confidence, @weight, @source, @vehicleRef, @rawDataShared, @status, @latitude, @longitude, @independentReports)
  `);

  insert.run({
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

  const insertReportVehicle = db.prepare(
    `INSERT INTO report_vehicles (reportId, vehicleRef) VALUES (?, ?)`,
  );
  if (data.reportingVehicles && Array.isArray(data.reportingVehicles)) {
    data.reportingVehicles.forEach((v: string) =>
      insertReportVehicle.run(id, v),
    );
  } else {
    insertReportVehicle.run(id, vehicleRef);
  }

  if (wss) {
    broadcast(wss, "report:new", { id });
  }

  res.json({ ok: true, data: { id, corroborated: false } });
});
