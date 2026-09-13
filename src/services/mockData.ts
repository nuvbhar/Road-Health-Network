import { Sector, Report, Vehicle, AppStats, TrendDataPoint } from '../store/types';

export const mockStats: AppStats = {
  totalReports: 847,
  activeVehicles: 124,
  sectorsMonitored: 12,
  highConfidence: 18,
  pendingReview: 31,
  resolved: 203
};

export const mockSectors: Sector[] = Array.from({ length: 12 }, (_, i) => {
  // Start: Kharar [30.7488, 76.6429]
  // End: Chandigarh University [30.7686, 76.5750]
  const startLat = 30.7488 + (0.0198 / 12) * i;
  const startLng = 76.6429 + (-0.0679 / 12) * i;
  const endLat = 30.7488 + (0.0198 / 12) * (i + 1);
  const endLng = 76.6429 + (-0.0679 / 12) * (i + 1);
  
  const ids = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const statuses = ['normal', 'caution', 'defect', 'normal', 'caution', 'normal', 'defect', 'normal', 'caution', 'normal', 'normal', 'normal'] as const;
  
  return {
    id: `SEC-${ids[i]}`,
    name: `Kharar-CU Sector ${ids[i]}`,
    displayName: `Sector ${ids[i]} — Highway Segment ${i + 1}`,
    status: statuses[i],
    reportCount: Math.floor(Math.random() * 30),
    lastReportAt: new Date().toISOString(),
    confidence: statuses[i] !== 'normal' ? 50 + Math.floor(Math.random() * 40) : 0,
    bounds: { startLat, startLng, endLat, endLng }
  };
});

const reportTypes: Report['type'][] = [
  'POTENTIAL_POTHOLE', 'SEVERE_POTHOLE'
];

function generateMockUUID() {
  const hex = () => Math.random().toString(16).slice(2, 10);
  return `User-${hex()}-${hex().slice(0, 4)}`;
}

export const mockReports: Report[] = Array.from({ length: 30 }, (_, i) => {
  const sector = mockSectors[i % 12];
  const independentReportsCount = 1 + Math.floor(Math.random() * 3);
  return {
    id: `RPT-08${47 - i}`,
    reportDate: new Date(Date.now() - i * 15 * 60000).toISOString(),
    sectorId: sector.id,
    sectorName: sector.name,
    roadReference: `Toll-03 / ${sector.name}`,
    type: reportTypes[i % reportTypes.length],
    confidence: 60 + Math.floor(Math.random() * 38),
    weight: parseFloat((2 + Math.random() * 3).toFixed(2)),
    source: 'VEHICLE_SENSOR',
    vehicleRef: generateMockUUID(),
    rawDataShared: false,
    status: i % 5 === 0 ? 'under_review' : i % 8 === 0 ? 'resolved' : 'pending',
    independentReports: independentReportsCount,
    latitude: sector.bounds.startLat + (sector.bounds.endLat - sector.bounds.startLat) * Math.random(),
    longitude: sector.bounds.startLng + (sector.bounds.endLng - sector.bounds.startLng) * Math.random(),
    reportingVehicles: Array.from({ length: independentReportsCount }, () => generateMockUUID())
  };
});

export const mockVehicles: Vehicle[] = Array.from({ length: 174 }, (_, i) => ({
  id: generateMockUUID(),
  sectorId: mockSectors[i % 12].id,
  status: i < 124 ? 'active' : i < 162 ? 'idle' : 'offline',
  reportsToday: Math.floor(Math.random() * 5),
  lastSeenAt: new Date(Date.now() - (i < 124 ? Math.random() * 300000 : Math.random() * 3600000)).toISOString()
}));

export const mockTrend: TrendDataPoint[] = Array.from({ length: 24 }, (_, i) => {
  const d = new Date();
  d.setHours(d.getHours() - (23 - i));
  return {
    hour: `${d.getHours().toString().padStart(2, '0')}:00`,
    count: Math.floor(10 + Math.random() * 40)
  };
});
