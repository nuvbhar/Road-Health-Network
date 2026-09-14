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
    let parsedWaveform: number[] | null = null;
    if (r.waveformData) {
      if (Array.isArray(r.waveformData)) {
        parsedWaveform = r.waveformData;
      } else if (typeof r.waveformData === "string") {
        try {
          parsedWaveform = JSON.parse(r.waveformData);
        } catch {
          parsedWaveform = null;
        }
      }
    }

    const result: any = {
      ...r,
      rawDataShared: !!r.rawDataShared,
      reportingVehicles: vehicles,
      waveformData: parsedWaveform,
      correlationScore: r.correlationScore !== undefined ? r.correlationScore : null,
      isConfirmed: Boolean(r.isConfirmed),
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

export async function createReport(
  data: Partial<Report>,
): Promise<{ id: string; corroborated: boolean; isConfirmed: boolean }> {
  const lat = data.latitude || 0;
  const lon = data.longitude || 0;
  const reportType = data.type || "POTENTIAL_POTHOLE";
  const vehicleRef = data.vehicleRef || "User-UNKNOWN";

  // 1. Fetch active reports to evaluate spatial confirmation across fleet vehicles
  const { data: activeRows } = await supabase
    .from("reports")
    .select("*, report_vehicles(vehicleRef)")
    .neq("status", "resolved")
    .eq("type", reportType);

  const activeReports: Report[] = (activeRows || []).map((r: any) => ({
    ...r,
    reportingVehicles: (r.report_vehicles || []).map((v: any) => v.vehicleRef),
    waveformData: Array.isArray(r.waveformData)
      ? r.waveformData
      : typeof r.waveformData === "string"
      ? JSON.parse(r.waveformData)
      : null,
    correlationScore: r.correlationScore ?? null,
    isConfirmed: Boolean(r.isConfirmed),
  }));

  const confirmation = processSpatialConfirmation(data, activeReports);

  if (confirmation.matchedReport) {
    const matched = confirmation.matchedReport;

    if (confirmation.isNewVehicle) {
      await supabase
        .from("report_vehicles")
        .insert({ reportId: matched.id, vehicleRef });

      const newIndependentCount = (matched.independentReports || 1) + 1;
      const updatePayload: Record<string, any> = {
        independentReports: newIndependentCount,
        confidence: confirmation.updatedConfidence,
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
    }

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
    speed: data.speed || null,
    gyroPitch: data.gyroscope?.pitch || null,
    gyroRoll: data.gyroscope?.roll || null,
    gyroYaw: data.gyroscope?.yaw || null,
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
    const records = data.reportingVehicles.map((v: string) => ({
      reportId: id,
      vehicleRef: v,
    }));
    await supabase.from("report_vehicles").insert(records);
  } else {
    await supabase.from("report_vehicles").insert({ reportId: id, vehicleRef });
  }

  return { id, corroborated: false, isConfirmed: false };
}
