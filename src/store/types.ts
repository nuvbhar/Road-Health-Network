export interface Sector {
  id: string;
  name: string;
  displayName: string;
  status: 'normal' | 'caution' | 'defect';
  reportCount: number;
  lastReportAt: string;
  confidence: number;
  bounds: { startLat: number; startLng: number; endLat: number; endLng: number };
}

export type ReportType =
  | 'POTENTIAL_POTHOLE'
  | 'ROAD_ANOMALY'
  | 'SURFACE_DEGRADATION'
  | 'SEVERE_CRACK'
  | 'SPEED_BUMP_UNMARKED'
  | 'WATERLOGGING'
  | 'DEBRIS_ON_ROAD'
  | 'UNEVEN_JOINT'
  | 'MANHOLE_DEPRESSION';

export interface Report {
  id: string;
  reportDate: string;
  sectorId: string;
  sectorName: string;
  roadReference: string;
  type: ReportType;
  confidence: number;
  source: 'VEHICLE_SENSOR';
  vehicleRef: string;
  rawDataShared: boolean;
  status: 'pending' | 'under_review' | 'resolved';
  independentReports: number;
  latitude: number;
  longitude: number;
  reportingVehicles: string[];
}

export interface Vehicle {
  id: string;
  sectorId: string;
  status: 'active' | 'idle' | 'offline';
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
  accelerometer: { x: number; y: number; z: number };
  gyroscope: { x: number; y: number; z: number };
}

export interface RoadEvent {
  detected: boolean;
  type: string | null;
  confidence: number;
  timestamp: number | null;
}
