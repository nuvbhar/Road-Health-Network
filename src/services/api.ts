import {
  AppStats,
  Sector,
  Report,
  Vehicle,
  TrendDataPoint,
} from "../store/types";
import { supabase } from "./supabaseClient";

export async function fetchStats(): Promise<AppStats> {
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

  return {
    totalReports: totalReports || 0,
    activeVehicles: activeVehicles || 0,
    sectorsMonitored: sectorsMonitored || 0,
    highConfidence: highConfidence || 0,
    pendingReview: pendingReview || 0,
    resolved: resolved || 0,
  };
}

export async function fetchSectors(): Promise<Sector[]> {
  const { data: sectorsData, error } = await supabase.from("sectors").select("*");
  if (error) throw error;
  
  return (sectorsData || []).map((row: any) => ({
    ...row,
    bounds: {
      startLat: row.startLat,
      startLng: row.startLng,
      endLat: row.endLat,
      endLng: row.endLng,
    },
  }));
}

export async function fetchReports(
  filters?: Record<string, string>,
): Promise<Report[]> {
  let query = supabase.from("reports").select("*, report_vehicles(vehicleRef)").order("id", { ascending: false });

  if (filters?.sectorId && filters.sectorId !== "all") {
    query = query.eq("sectorId", filters.sectorId);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data: reportsData, error } = await query;
  if (error) throw error;

  return (reportsData || []).map((r: any) => {
    const vehicles = (r.report_vehicles || []).map((v: any) => v.vehicleRef);
    const result: any = {
      ...r,
      rawDataShared: !!r.rawDataShared,
      reportingVehicles: vehicles,
    };
    
    if (r.gyroPitch !== null && r.gyroPitch !== undefined) {
      result.gyroscope = {
        pitch: r.gyroPitch,
        roll: r.gyroRoll,
        yaw: r.gyroYaw,
      };
    }
    
    delete result.report_vehicles;
    delete result.gyroPitch;
    delete result.gyroRoll;
    delete result.gyroYaw;
    
    return result as Report;
  });
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data: vehicles, error } = await supabase.from("vehicles").select("*");
  if (error) throw error;
  return vehicles as Vehicle[];
}

export async function fetchTrend(): Promise<TrendDataPoint[]> {
  const trend = Array.from({ length: 24 }, (_, i) => {
    const d = new Date();
    d.setHours(d.getHours() - (23 - i));
    return {
      hour: `${d.getHours().toString().padStart(2, "0")}:00`,
      count: 0,
    };
  });

  const { data: recentReports, error } = await supabase.from("reports").select("reportDate");
  if (error) throw error;
  
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

  return trend;
}

export async function updateReportStatus(
  id: string,
  status: Report["status"],
): Promise<void> {
  const { error } = await supabase.from("reports").update({ status }).eq("id", id);
  if (error) throw error;
}

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

async function recalculateSectorHealth(sectorId: string) {
  // Fetch active reports in this sector
  const { data: reports } = await supabase
    .from("reports")
    .select("type, independentReports")
    .eq("sectorId", sectorId)
    .neq("status", "resolved");

  let penalty = 0;
  for (const r of (reports || [])) {
    // Escalate penalty based on independent corroborations
    const multiplier = Math.min(3, r.independentReports || 1);
    if (r.type === "SEVERE_POTHOLE") {
      penalty += 10 * multiplier;
    } else if (r.type === "POTENTIAL_POTHOLE" || r.type === "ROAD_ANOMALY") {
      penalty += 3 * multiplier;
    } else if (r.type === "SPEED_BUMP") {
      penalty += 1;
    }
  }

  const healthIndex = Math.max(0, 100 - penalty);

  // Update sector status based on RHI
  let status = "normal";
  if (healthIndex < 60) status = "defect";
  else if (healthIndex < 85) status = "caution";

  await supabase
    .from("sectors")
    .update({ healthIndex, status })
    .eq("id", sectorId);
}

export async function createReport(
  data: Partial<Report>,
): Promise<{ id: string; corroborated: boolean }> {
  const lat = data.latitude || 0;
  const lon = data.longitude || 0;
  const reportType = data.type || "ROAD_ANOMALY";
  const vehicleRef = data.vehicleRef || "User-UNKNOWN";

  // --- HACKATHON: False-Positive Filtering ---
  const { data: vehicleData } = await supabase.from("vehicles").select("trustScore, unverifiedReports").eq("id", vehicleRef);
  const vehicle = vehicleData?.[0] || { trustScore: 100.0, unverifiedReports: 0 };
  
  if (vehicle.trustScore < 30) {
    console.warn(`[Trust System] Dropping report from low-trust vehicle: ${vehicleRef}`);
    return { id: "rejected-low-trust", corroborated: false };
  }

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
      const newWeight = data.weight || 0;
      
      const currentAvg = matchedReport.averageWeight || matchedReport.weight || 0;
      const updatedAvg = ((currentAvg * matchedReport.independentReports) + newWeight) / newCount;
      
      let degradationStatus = matchedReport.degradationStatus || "stable";
      if (newCount >= 3 && updatedAvg > currentAvg * 1.15) {
        degradationStatus = "degrading_rapidly";
      }

      await supabase.from("reports").update({ 
        independentReports: newCount,
        lastReportedAt: new Date().toISOString(),
        averageWeight: updatedAvg,
        degradationStatus
      }).eq("id", matchedReport.id);

      const { data: updatedData } = await supabase
        .from("reports")
        .select("*")
        .eq("id", matchedReport.id);
      
      const updated = updatedData?.[0] || matchedReport;

      // Auto-escalation Logic
      if (updated.independentReports >= 3 && updated.status === "pending") {
        await supabase.from("reports").update({ status: "under_review" }).eq("id", matchedReport.id);
      }

      // --- HACKATHON: Trust Scoring (Corroborated) ---
      const newTrust = Math.min(100, vehicle.trustScore + 2);
      const newUnverified = Math.max(0, vehicle.unverifiedReports - 1);
      await supabase.from("vehicles").update({ trustScore: newTrust, unverifiedReports: newUnverified }).eq("id", vehicleRef);
    }

    recalculateSectorHealth(matchedReport.sectorId).catch(console.error);

    return { id: matchedReport.id, corroborated: true };
  }

  // 2. No nearby report found, create a new one
  const id = data.id || `RPT-${Math.floor(1000 + Math.random() * 9000)}`;
  
  const reportDate = data.reportDate || new Date().toISOString();
  const { error } = await supabase.from("reports").insert({
    id,
    reportDate,
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
    speed: data.speed || null,
    gyroPitch: data.gyroscope?.pitch || null,
    gyroRoll: data.gyroscope?.roll || null,
    gyroYaw: data.gyroscope?.yaw || null,
    firstReportedAt: reportDate,
    lastReportedAt: reportDate,
    averageWeight: data.weight || 0,
    degradationStatus: "stable",
  });

  if (error) throw error;

  if (data.reportingVehicles && Array.isArray(data.reportingVehicles)) {
    const records = data.reportingVehicles.map((v: string) => ({ reportId: id, vehicleRef: v }));
    await supabase.from("report_vehicles").insert(records);
  } else {
    await supabase.from("report_vehicles").insert({ reportId: id, vehicleRef });
  }

  // --- HACKATHON: Trust Scoring (Unverified) ---
  const newTrust = Math.max(0, vehicle.trustScore - 0.5); // Slight penalty for unverified
  const newUnverified = vehicle.unverifiedReports + 1;
  await supabase.from("vehicles").update({ trustScore: newTrust, unverifiedReports: newUnverified }).eq("id", vehicleRef);

  const sectorId = data.sectorId || "SEC-A";
  recalculateSectorHealth(sectorId).catch(console.error);

  return { id, corroborated: false };
}
