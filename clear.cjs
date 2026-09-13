const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, 'server', 'road-health.db');
const db = new Database(dbPath);
db.exec('DROP TABLE IF EXISTS report_vehicles; DROP TABLE IF EXISTS reports; DROP TABLE IF EXISTS vehicles; DROP TABLE IF EXISTS sectors;');
console.log('Tables dropped!');
