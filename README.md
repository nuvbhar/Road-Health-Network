# Road Health Network (RHN)

**Road Health Network (RHN)** is a next-generation platform for government municipalities and highway authorities to monitor road conditions and pavement discrepancies in real-time. 

Built using React, TypeScript, Leaflet, and a lightweight Node/SQLite backend, the application utilizes live smartphone accelerometer data from fleet vehicles to automatically detect, classify, and map road defects without requiring manual data entry.

## 🌟 Key Features

- **Live Sensor Streaming**: Stream 30Hz accelerometer/gyroscope data from a mobile phone directly into the dashboard via WebSocket.
- **Auto-Corroboration Engine**: Discrepancies reported by multiple fleet vehicles in the same geographic radius are automatically merged.
- **Privacy-First By Design**: Avoids exact timestamping and coarsens GPS coordinates (to ~100m) ensuring vehicles cannot be tracked individually.
- **Interactive Network Map**: Fully interactive OpenStreetMap integration displaying color-coded highway sectors and corroborated defect markers.
- **Expanded Discrepancy Types**: Automatic classification of Pot Holes, Severe Cracks, Unmarked Speed Bumps, and Waterlogging based on Z-axis/Y-axis shock profiles.
- **Fleet Management**: Monitor connected sensor nodes and historical report volumes in real-time.

## 🚀 Quick Start

### 1. Install Dependencies
Ensure you have Node.js (v18+) installed.
```bash
npm install
```

### 2. Start the Application
The project uses `concurrently` to run both the Vite frontend and Express backend.
```bash
npm run dev
```
- **Dashboard**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **WebSocket Server**: ws://localhost:3001/ws

### 3. Connect a Mobile Sensor
1. Open the dashboard (http://localhost:5173).
2. Navigate to the **Live Sensor** tab.
3. Scan the generated QR code using a mobile phone connected to the same local network.
4. Tap **Start Sensor Stream** on your mobile device to begin transmitting live telemetry!

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Zustand (State Management), React-Leaflet
- **Backend**: Node.js, Express, `ws` (WebSockets), `better-sqlite3`
- **Map Tiles**: OpenStreetMap

## 📋 Project Status
This project was developed iteratively through specialized phases (Privacy Model Overhaul, Backend/Datastore, Interactive Mapping, Auto-Corroboration, Live Streaming, and Fleet Analytics) and is ready for broader pilot deployments.

## 📄 License
MIT License
