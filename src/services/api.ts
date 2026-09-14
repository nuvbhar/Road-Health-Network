import {
  AppStats,
  Sector,
  Report,
  Vehicle,
  TrendDataPoint,
} from "../store/types";
import { supabase } from "./supabaseClient";
import { processSpatialConfirmation } from "./spatialConfirmation";

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
  let query = supabase
    .from("reports")
    .select("*, report_vehicles(vehicleRef, timestamp, offsetMeters)")
    .order("reportDate", { ascending: false });

  if (filters?.sectorId && filters.sectorId !== "all") {
    query = query.eq("sectorId", filters.sectorId);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return (data || []).map((row: any) => ({
    ...row,
    reportingVehicles: (row.report_vehicles || []).map((v: any) => ({
      id: v.vehicleRef,
      timestamp: v.timestamp,
      offsetMeters: v.offsetMeters
    })),
    waveformData: Array.isArray(row.waveformData)
      ? row.waveformData
      : typeof row.waveformData === "string"
      ? JSON.parse(row.waveformData)
      : null,
    correlationScore: row.correlationScore ?? null,
    isConfirmed: Boolean(row.isConfirmed)
  }));
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

// Distance in km using Haversine
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

async function recalculateSectorHealth(sectorId: string) {
  const { data: reports } = await supabase
    .from("reports")
    .select("type, independentReports")
    .eq("sectorId", sectorId)
    .neq("status", "resolved");

  let penalty = 0;
  for (const r of (reports || [])) {
    const multiplier = Math.min(3, r.independentReports || 1);
    if (r.type === "SEVERE_POTHOLE") {
      penalty += 10 * multiplier;
    } else if (r.type === "POTENTIAL_POTHOLE") {
      penalty += 3 * multiplier;
    } else if (r.type === "ROAD_ANOMALY") {
      penalty += 1 * multiplier;
    }
  }

  const healthIndex = Math.max(0, 100 - penalty);
  
  let status = "normal";
  if (healthIndex < 60) status = "defect";
  else if (healthIndex < 85) status = "caution";

  await supabase
    .from("sectors")
    .update({ healthIndex, status })
    .eq("id", sectorId);
}

export async function updateReportStatus(
  id: string,
  status: Report["status"],
): Promise<void> {
  const { error } = await supabase.from("reports").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function createReport(
  data: Partial<Report>,
): Promise<{ id: string; corroborated: boolean; isConfirmed: boolean }> {
  const lat = data.latitude || 0;
  const lon = data.longitude || 0;
  const reportType = data.type || "POTENTIAL_POTHOLE";
  const vehicleRef = data.vehicleRef || "User-UNKNOWN";

  // --- HACKATHON: False-Positive Filtering ---
  const { data: vehicleData } = await supabase.from("vehicles").select("trustScore, unverifiedReports").eq("id", vehicleRef);
  const vehicle = vehicleData?.[0] || { trustScore: 100.0, unverifiedReports: 0 };
  
  if (vehicle.trustScore < 30) {
    console.warn(`[Trust System] Dropping report from low-trust vehicle: ${vehicleRef}`);
    return { id: "rejected-low-trust", corroborated: false, isConfirmed: false };
  }

  // 1. Fetch active reports to evaluate spatial confirmation across fleet vehicles
  const { data: activeRows } = await supabase
    .from("reports")
    .select("*, report_vehicles(vehicleRef, timestamp, offsetMeters)")
    .neq("status", "resolved")
    .eq("type", reportType);

  const activeReports: Report[] = (activeRows || []).map((r: any) => ({
    ...r,
    reportingVehicles: (r.report_vehicles || []).map((v: any) => ({
      id: v.vehicleRef,
      timestamp: v.timestamp,
      offsetMeters: v.offsetMeters
    })),
    waveformData: Array.isArray(r.waveformData)
      ? r.waveformData
      : typeof r.waveformData === "string"
      ? JSON.parse(r.waveformData)
      : null,
    correlationScore: r.correlationScore ?? null,
    isConfirmed: Boolean(r.isConfirmed),
  }));

  const confirmation = processSpatialConfirmation(data, activeReports);
  const reportDate = data.reportDate || new Date().toISOString();

  if (confirmation.matchedReport) {
    const matched = confirmation.matchedReport;
    const dist = getDistance(lat, lon, matched.latitude, matched.longitude) * 1000; // convert to meters

    if (confirmation.isNewVehicle) {
      await supabase.from("report_vehicles").insert({ 
        reportId: matched.id, 
        vehicleRef,
        offsetMeters: dist,
        timestamp: reportDate
      });

      const newIndependentCount = (matched.independentReports || 1) + 1;
      const newWeight = data.weight || 0;
      
      const currentAvg = matched.averageWeight || matched.weight || 0;
      const updatedAvg = ((currentAvg * (matched.independentReports || 1)) + newWeight) / newIndependentCount;
      
      let degradationStatus = matched.degradationStatus || "stable";
      if (newIndependentCount >= 3 && updatedAvg > currentAvg * 1.15) {
        degradationStatus = "degrading_rapidly";
      }

      const updatePayload: Record<string, any> = {
        independentReports: newIndependentCount,
        confidence: confirmation.updatedConfidence,
        lastReportedAt: new Date().toISOString(),
        averageWeight: updatedAvg,
        degradationStatus
      };

      if (confirmation.correlationScore !== null) {
        updatePayload.correlationScore = confirmation.correlationScore;
      }

      if (confirmation.isConfirmed) {
        updatePayload.isConfirmed = true;
        if (matched.status === "pending") {
          updatePayload.status = "under_review";
        }
      }

      const { error: updateErr } = await supabase
        .from("reports")
        .update(updatePayload)
        .eq("id", matched.id);

      if (updateErr) {
        // Fallback if correlationScore/isConfirmed columns don't exist yet on remote
        delete updatePayload.correlationScore;
        delete updatePayload.isConfirmed;
        await supabase
          .from("reports")
          .update(updatePayload)
          .eq("id", matched.id);
      }

      // --- HACKATHON: Trust Scoring (Corroborated) ---
      const newTrust = Math.min(100, vehicle.trustScore + 2);
      const newUnverified = Math.max(0, vehicle.unverifiedReports - 1);
      await supabase.from("vehicles").update({ trustScore: newTrust, unverifiedReports: newUnverified }).eq("id", vehicleRef);
    }

    recalculateSectorHealth(matched.sectorId).catch(console.error);

    return {
      id: matched.id,
      corroborated: true,
      isConfirmed: confirmation.isConfirmed,
    };
  }

  // 2. No nearby report found in spatial cluster, create a new candidate report
  const id = data.id || `RPT-${Math.floor(1000 + Math.random() * 9000)}`;

  const insertPayload: Record<string, any> = {
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
    waveformData: data.waveformData ? data.waveformData : null,
    correlationScore: null,
    isConfirmed: false,
  };

  const { error: insertErr } = await supabase.from("reports").insert(insertPayload);
  if (insertErr) {
    delete insertPayload.waveformData;
    delete insertPayload.correlationScore;
    delete insertPayload.isConfirmed;
    const { error: retryErr } = await supabase.from("reports").insert(insertPayload);
    if (retryErr) throw retryErr;
  }

  if (data.reportingVehicles && Array.isArray(data.reportingVehicles)) {
    const records = data.reportingVehicles.map((v: any) => ({ 
      reportId: id, 
      vehicleRef: v.id || v,
      timestamp: v.timestamp || reportDate
    }));
    await supabase.from("report_vehicles").insert(records);
  } else {
    await supabase.from("report_vehicles").insert({ reportId: id, vehicleRef, timestamp: reportDate });
  }

  // --- HACKATHON: Trust Scoring (Unverified) ---
  const newTrust = Math.max(0, vehicle.trustScore - 0.5); // Slight penalty for unverified
  const newUnverified = vehicle.unverifiedReports + 1;
  await supabase.from("vehicles").update({ trustScore: newTrust, unverifiedReports: newUnverified }).eq("id", vehicleRef);

  const sectorId = data.sectorId || "SEC-A";
  recalculateSectorHealth(sectorId).catch(console.error);

  return { id, corroborated: false, isConfirmed: false };
}
