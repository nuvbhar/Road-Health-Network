export interface Sector {
  id: string;
  name: string;
  displayName: string;
  status: "normal" | "caution" | "defect";
  reportCount: number;
  lastReportAt: string;
  confidence: number;
  bounds: {
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
  };
}

export type ReportType = "POTENTIAL_POTHOLE" | "SEVERE_POTHOLE";

export interface Report {
  id: string;
  reportDate: string;
  sectorId: string;
  sectorName: string;
  roadReference: string;
  type: ReportType;
  confidence: number;
  weight?: number;
  source: "VEHICLE_SENSOR";
  vehicleRef: string;
  rawDataShared: boolean;
  status: "pending" | "under_review" | "resolved";
  independentReports: number;
  latitude: number;
  longitude: number;
  reportingVehicles: string[];
  // Extended telemetry
  speed?: number | null;
  gyroscope?: { pitch: number; roll: number; yaw: number } | null;
  waveformData?: number[] | null;
  correlationScore?: number | null;
  isConfirmed?: boolean;
}

export interface Vehicle {
  id: string;
  sectorId: string;
  status: "active" | "idle" | "offline";
  reportsToday: number;
  lastSeenAt: string;
}

export interface AppStats {
  totalReports: number;
  activeVehicles: number;
  sectorsMonitored: number;
  highConfidence: number;
  pendingReview: number;
  resolved: number;
}

export interface TrendDataPoint {
  hour: string;
  count: number;
}

export interface SensorReading {
  accelerometer: {
    x: number;
    y: number;
    z: number;
  };
  gyroscope: {
    x: number;
    y: number;
    z: number;
  };
  gps?: {
    speed: number | null; // meters per second
    latitude?: number;
    longitude?: number;
  };
}

export interface EngineMetrics {
  rawZ: number;
  meanZ: number;
  stdDev: number;
  zForce: number;
  snr: number;
  threshold: number;
}

export interface RoadEvent {
  detected: boolean;
  type: string | null;
  confidence: number;
  weight?: number;
  timestamp: number | null;
  // Extended telemetry for actual data storage when anomaly arrives
  latitude?: number;
  longitude?: number;
  speed?: number | null;
  gyroscope?: {
    pitch: number;
    roll: number;
    yaw: number;
  };
  waveformData?: number[];
}
