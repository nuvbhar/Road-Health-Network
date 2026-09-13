import {
  AppStats,
  Sector,
  Report,
  Vehicle,
  TrendDataPoint,
} from "../store/types";

const API_BASE = "/api"; // Proxied by Vite to localhost:3001

export async function fetchStats(): Promise<AppStats> {
  const res = await fetch(`${API_BASE}/stats`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message || "Failed to fetch stats");
  return json.data;
}

export async function fetchSectors(): Promise<Sector[]> {
  const res = await fetch(`${API_BASE}/sectors`);
  const json = await res.json();
  if (!json.ok)
    throw new Error(json.error?.message || "Failed to fetch sectors");
  return json.data;
}

export async function fetchReports(
  filters?: Record<string, string>,
): Promise<Report[]> {
  const qs = new URLSearchParams(filters);
  const res = await fetch(`${API_BASE}/reports?${qs}`);
  const json = await res.json();
  if (!json.ok)
    throw new Error(json.error?.message || "Failed to fetch reports");
  return json.data;
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const res = await fetch(`${API_BASE}/vehicles`);
  const json = await res.json();
  if (!json.ok)
    throw new Error(json.error?.message || "Failed to fetch vehicles");
  return json.data;
}

export async function fetchTrend(): Promise<TrendDataPoint[]> {
  const res = await fetch(`${API_BASE}/trend`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message || "Failed to fetch trend");
  return json.data;
}

export async function updateReportStatus(
  id: string,
  status: Report["status"],
): Promise<void> {
  const res = await fetch(`${API_BASE}/reports/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Failed to update status");
}

export async function createReport(
  report: Partial<Report>,
): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Failed to create report");
  return json.data;
}
