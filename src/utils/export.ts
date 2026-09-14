import { Report } from "../store/types";

export function exportReportsToCSV(reports: Report[]) {
  // Define columns for a road engineer/repair crew
  const headers = [
    "Report ID",
    "Anomaly Type",
    "Priority Level",
    "Status",
    "First Detected",
    "Last Corroborated",
    "Corroborating Vehicles",
    "Confidence (%)",
    "Sector",
    "Road Reference",
    "Latitude",
    "Longitude",
    "Google Maps Link",
    "Degradation Alert"
  ];

  const rows = reports.map(r => {
    // Determine priority
    let priority = "LOW";
    if (r.confidence > 85 && r.independentReports >= 3) {
      priority = "CRITICAL";
    } else if (r.confidence > 70 && r.independentReports >= 2) {
      priority = "HIGH";
    } else if (r.confidence > 50) {
      priority = "MEDIUM";
    }

    return [
      r.id,
      r.type.replace(/_/g, " "),
      priority,
      r.status,
      r.firstReportedAt ? new Date(r.firstReportedAt).toLocaleDateString() : new Date(r.reportDate).toLocaleDateString(),
      new Date(r.reportDate).toLocaleString(),
      r.independentReports.toString(),
      `${Math.round(r.confidence)}%`,
      r.sectorName,
      r.roadReference,
      r.latitude.toFixed(6),
      r.longitude.toFixed(6),
      `https://www.google.com/maps?q=${r.latitude},${r.longitude}`,
      r.degradationStatus === "degrading_rapidly" ? "YES - RAPID DEGRADATION" : "Stable"
    ];
  });

  // Convert to CSV
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  // Trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `RHN_Dispatch_Report_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
