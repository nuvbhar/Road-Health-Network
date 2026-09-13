import Database from 'better-sqlite3';
import path from 'path';
import { mockSectors, mockReports, mockVehicles } from '../src/services/mockData';

const dbPath = path.resolve(process.cwd(), 'server', 'road-health.db');
export const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sectors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    displayName TEXT NOT NULL,
    status TEXT DEFAULT 'normal',
    reportCount INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0,
    startLat REAL, startLng REAL,
    endLat REAL, endLng REAL,
    lastReportAt TEXT
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reportDate TEXT NOT NULL,
    sectorId TEXT REFERENCES sectors(id),
    sectorName TEXT,
    roadReference TEXT,
    type TEXT NOT NULL,
    confidence REAL,
    weight REAL,
    source TEXT DEFAULT 'VEHICLE_SENSOR',
    vehicleRef TEXT,
    rawDataShared INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    latitude REAL,
    longitude REAL,
    independentReports INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS report_vehicles (
    reportId TEXT REFERENCES reports(id),
    vehicleRef TEXT NOT NULL,
    PRIMARY KEY (reportId, vehicleRef)
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    sectorId TEXT REFERENCES sectors(id),
    status TEXT DEFAULT 'active',
    reportsToday INTEGER DEFAULT 0,
    lastSeenAt TEXT
  );
`);

// Seed data if empty
const count = db.prepare('SELECT COUNT(*) as c FROM sectors').get() as { c: number };
if (count.c === 0) {
  console.log('Seeding initial data...');
  
  const insertSector = db.prepare(`
    INSERT INTO sectors (id, name, displayName, status, reportCount, confidence, startLat, startLng, endLat, endLng, lastReportAt)
    VALUES (@id, @name, @displayName, @status, @reportCount, @confidence, @startLat, @startLng, @endLat, @endLng, @lastReportAt)
  `);
  mockSectors.forEach(s => insertSector.run({
    ...s,
    startLat: s.bounds.startLat,
    startLng: s.bounds.startLng,
    endLat: s.bounds.endLat,
    endLng: s.bounds.endLng,
  }));

  const insertReport = db.prepare(`
    INSERT INTO reports (id, reportDate, sectorId, sectorName, roadReference, type, confidence, weight, source, vehicleRef, rawDataShared, status, latitude, longitude, independentReports)
    VALUES (@id, @reportDate, @sectorId, @sectorName, @roadReference, @type, @confidence, @weight, @source, @vehicleRef, @rawDataShared, @status, @latitude, @longitude, @independentReports)
  `);
  
  const insertReportVehicle = db.prepare(`
    INSERT INTO report_vehicles (reportId, vehicleRef) VALUES (?, ?)
  `);

  mockReports.forEach(r => {
    insertReport.run({
      ...r,
      rawDataShared: r.rawDataShared ? 1 : 0
    });
    r.reportingVehicles.forEach(v => {
      insertReportVehicle.run(r.id, v);
    });
  });

  const insertVehicle = db.prepare(`
    INSERT INTO vehicles (id, sectorId, status, reportsToday, lastSeenAt)
    VALUES (@id, @sectorId, @status, @reportsToday, @lastSeenAt)
  `);
  mockVehicles.forEach(v => insertVehicle.run(v));
  console.log('Seeding complete.');
}
