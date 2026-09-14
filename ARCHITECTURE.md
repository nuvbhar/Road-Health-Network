# System Architecture & Design

This document provides a deep dive into the functional and non-functional architecture of the Road Health Network. It details system interactions, data flows, logical components, and physical deployment using UML diagrams.

## 1. Functional Architecture

Functional diagrams describe *what* the system does and how actors interact with it.

### System Use Case Diagram
Provides a high-level view of who interacts with the system and what actions they perform.

```mermaid
flowchart LR
    %% Actors
    Driver(["🚗 Fleet Driver (Mobile Node)"])
    Admin(["👨‍💻 Authority Admin"])
    Public(["🌐 Public Viewer"])

    %% System Boundary
    subgraph RHN["Road Health Network System"]
        UC1("Stream Sensor Telemetry")
        UC2("Auto-Detect Anomalies")
        UC3("Corroborate Discrepancies")
        UC4("View Interactive Map")
        UC5("Manage Fleet Nodes")
        UC6("Export Road Health Reports")
    end

    %% Relationships
    Driver --> UC1
    UC1 -.->|"triggers"| UC2
    UC2 -.->|"feeds into"| UC3
    
    Admin --> UC4
    Admin --> UC5
    Admin --> UC6
    
    Public --> UC4
```

### Sequence Diagram: Anomaly Detection to Map Update
Shows the exact temporal flow of data from the moment a smartphone hits a pothole to when it appears on the map for an administrator.

```mermaid
sequenceDiagram
    autonumber
    actor Driver
    participant Mobile as Mobile App (Sensor Hook)
    participant Engine as Detection Engine (Local)
    participant Supabase as Supabase Backend (Realtime)
    participant DB as Postgres DB (PostGIS)
    participant Dashboard as Admin Dashboard

    Driver->>Mobile: Drives over Pothole
    Mobile->>Engine: Stream 30Hz Accelerometer/Gyro Data
    activate Engine
    Engine->>Engine: Analyze Z-axis variance (Drop -> Strike)
    Engine-->>Mobile: Event Detected (Confidence: 85%)
    deactivate Engine
    
    Mobile->>Supabase: POST /reports (Geo-coarsened, timestamp stripped)
    activate Supabase
    Supabase->>DB: Insert new report
    DB-->>DB: DB Trigger: Check for reports within 50m radius
    
    alt Existing Report Nearby
        DB->>DB: Increment corroboration count & weight
    else No Nearby Reports
        DB->>DB: Create new standalone sector/report
    end
    
    Supabase-->>Dashboard: Realtime WebSocket Broadcast (Update Map)
    deactivate Supabase
    Dashboard->>Dashboard: Render updated sector polyline & markers
```

### State Machine Diagram: Report Lifecycle
Details how a detected anomaly matures into an actionable item and eventually gets resolved.

```mermaid
stateDiagram-v2
    [*] --> Unverified: Anomaly Detected (Single Device)
    
    Unverified --> Corroborated: >2 Independent Vehicles Report
    Unverified --> Dropped: TTL Expires (False Positive)
    
    Corroborated --> Actionable: Confidence Score > 90%
    
    Actionable --> In_Progress: Work Order Generated
    In_Progress --> Resolved: Road Repaired
    
    Resolved --> [*]
```

---

## 2. Non-Functional Architecture

Non-functional diagrams describe *how* the system is built, deployed, and how its components are structured physically and logically.

### Deployment Diagram (Physical Architecture)
Shows the serverless infrastructure, demonstrating that the system is scalable, distributed, and how it handles edge deployment.

```mermaid
flowchart TD
    subgraph Edge["Edge Devices (Smartphones)"]
        Browser1["Mobile Browser (Chrome/Safari)"]
        Browser2["Mobile Browser (Chrome/Safari)"]
    end

    subgraph CDN["Vercel / Netlify Edge Network"]
        WebApp["Vite React SPA (Static Assets)"]
    end

    subgraph Cloud["Supabase Cloud"]
        API["PostgREST API"]
        WS["Realtime WebSocket Server"]
        DB[("PostgreSQL\n(PostGIS + RLS)")]
        EdgeFunctions["Edge Functions\n(Corroboration Logic)"]
    end

    subgraph Admin["Authority HQ"]
        DesktopBrowser["Desktop Browser (Dashboard)"]
    end

    %% Connections
    Edge -->|1. Downloads App| WebApp
    Edge -->|2. WSS / 30Hz Stream| WS
    Edge -->|3. HTTPS / REST| API
    
    API <--> DB
    WS <--> DB
    DB <--> EdgeFunctions
    
    WS ===>|4. Push Updates WSS| DesktopBrowser
    WebApp -->|1. Downloads App| DesktopBrowser
```

### Component Diagram (Frontend Logical Architecture)
Breaks down the monolithic React application into logical, decoupled modules.

```mermaid
flowchart TD
    subgraph UI["Presentation Layer (React)"]
        LiveSensorPage["Live Sensor View"]
        MapPage["Interactive Map View"]
        StatsPage["Fleet Dashboard"]
    end

    subgraph Hooks["Custom Hooks"]
        useLocalSensor["useLocalSensor (Device API)"]
        useWebRTC["useWebRTCBridge (P2P)"]
    end

    subgraph Core["Core Logic Services"]
        SensorBridge["sensorBridge.ts\n(Hardware API)"]
        DetectionEngine["detectionEngine.ts\n(Kinematic Analysis)"]
    end

    subgraph State["State Management (Zustand)"]
        AppStore["useAppStore"]
    end

    subgraph BackendClient["Backend Integration"]
        SupabaseClient["supabase.ts"]
    end

    %% Wiring
    LiveSensorPage --> useLocalSensor
    LiveSensorPage --> useWebRTC
    useLocalSensor --> SensorBridge
    SensorBridge --> DetectionEngine
    
    DetectionEngine -->|Dispatch Events| AppStore
    AppStore -->|Re-render| UI
    
    AppStore -->|Sync Data| SupabaseClient
    MapPage --> SupabaseClient
```
