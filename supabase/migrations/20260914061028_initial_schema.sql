CREATE TABLE IF NOT EXISTS sectors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  status TEXT DEFAULT 'normal',
  "reportCount" INTEGER DEFAULT 0,
  confidence REAL DEFAULT 0,
  "startLat" REAL, 
  "startLng" REAL,
  "endLat" REAL, 
  "endLng" REAL,
  "lastReportAt" TEXT
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  "reportDate" TEXT NOT NULL,
  "sectorId" TEXT REFERENCES sectors(id),
  "sectorName" TEXT,
  "roadReference" TEXT,
  type TEXT NOT NULL,
  confidence REAL,
  weight REAL,
  source TEXT DEFAULT 'VEHICLE_SENSOR',
  "vehicleRef" TEXT,
  "rawDataShared" INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  latitude REAL,
  longitude REAL,
  "independentReports" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS report_vehicles (
  "reportId" TEXT REFERENCES reports(id) ON DELETE CASCADE,
  "vehicleRef" TEXT NOT NULL,
  PRIMARY KEY ("reportId", "vehicleRef")
);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  "sectorId" TEXT REFERENCES sectors(id),
  status TEXT DEFAULT 'active',
  "reportsToday" INTEGER DEFAULT 0,
  "lastSeenAt" TEXT
);
