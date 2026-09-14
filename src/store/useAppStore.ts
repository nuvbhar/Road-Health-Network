import { create } from "zustand";
import {
  Sector,
  Report,
  Vehicle,
  AppStats,
  TrendDataPoint,
  SensorReading,
  RoadEvent,
  EngineMetrics,
} from "./types";
import {
  fetchStats,
  fetchSectors,
  fetchReports,
  fetchVehicles,
  fetchTrend,
  updateReportStatus as apiUpdateReportStatus,
  createReport as apiCreateReport,
} from "../services/api";
import { getOrCreateDeviceId, registerDevice } from "../services/deviceIdentity";

interface AppState {
  isInitialLoading: boolean;
  globalError: string | null;
  stats: AppStats;
  sectors: Sector[];
  reports: Report[];
  vehicles: Vehicle[];
  trendData: TrendDataPoint[];

  activeSectorFilter: string | null;
  activeStatusFilter: string;
  sortColumn: string;
  sortDirection: "asc" | "desc";

  liveSensor: {
    connected: boolean;
    reading: SensorReading | null;
    event: RoadEvent | null;
    queue: RoadEvent[];
    sessionHistory: RoadEvent[];
    metrics: EngineMetrics | null;
    calibrationFactor: number;
  };
  transmission: {
    stage: "idle" | "processing" | "transmitted" | "confirmed";
  };

  // Actions
  setStats: (stats: AppStats) => void;
  addReport: (report: Partial<Report>) => Promise<void>;
  updateReportStatus: (id: string, status: Report["status"]) => Promise<void>;
  setSectorFilter: (sectorId: string | null) => void;
  setStatusFilter: (status: string) => void;
  setSortColumn: (col: string, dir: "asc" | "desc") => void;
  setSensorReading: (reading: SensorReading) => void;
  setSensorEvent: (event: RoadEvent | null) => void;
  enqueueSensorEvent: (event: RoadEvent) => void;
  dequeueSensorEvent: () => void;
  removeSensorEventFromQueue: (index: number) => void;
  addSessionHistoryItem: (event: RoadEvent) => void;
  setEngineMetrics: (metrics: EngineMetrics) => void;
  setTransmissionStage: (
    stage: "idle" | "processing" | "transmitted" | "confirmed",
  ) => void;
  setCalibrationFactor: (factor: number) => void;
  loadInitialData: () => Promise<void>;
  handleRealtimeUpdate: (payload: any) => void;
  processTransmissionEvent: (event: RoadEvent) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  isInitialLoading: true,
  globalError: null,

  stats: {
    totalReports: 0,
    activeVehicles: 0,
    sectorsMonitored: 0,
    highConfidence: 0,
    pendingReview: 0,
    resolved: 0,
  },
  sectors: [],
  reports: [],
  vehicles: [],
  trendData: [],

  activeSectorFilter: null,
  activeStatusFilter: "all",
  sortColumn: "reportDate",
  sortDirection: "desc",

  liveSensor: { connected: false, reading: null, event: null, queue: [], sessionHistory: [], metrics: null, calibrationFactor: 1.0 },
  transmission: { stage: "idle" },

  setStats: (stats) => set({ stats }),

  addReport: async (report) => {
    try {
      await apiCreateReport(report);
      // Real-time subscription in App.tsx will trigger data reload automatically
    } catch (e) {
      console.error("Failed to push report to database:", e);
      set({ globalError: e instanceof Error ? e.message : String(e) });
    }
  },

  updateReportStatus: async (id, status) => {
    const previousReports = get().reports;
    // Optimistic update
    set((state) => ({
      reports: state.reports.map((r) => (r.id === id ? { ...r, status } : r)),
    }));
    try {
      await apiUpdateReportStatus(id, status);
      const newStats = await fetchStats();
      set({ stats: newStats });
    } catch (e) {
      console.error("Failed to update status, rolling back:", e);
      set({ reports: previousReports, globalError: "Failed to update report status" });
    }
  },

  setSectorFilter: (sectorId) => set({ activeSectorFilter: sectorId }),
  setStatusFilter: (status) => set({ activeStatusFilter: status }),
  setSortColumn: (col, dir) => set({ sortColumn: col, sortDirection: dir }),

  setSensorReading: (reading) =>
    set((state) => ({
      liveSensor: { ...state.liveSensor, reading, connected: true },
    })),
  setSensorEvent: (event) =>
    set((state) => ({
      liveSensor: { ...state.liveSensor, event },
    })),
  enqueueSensorEvent: (event) =>
    set((state) => {
      const localNow = Date.now();
      const DEBOUNCE_MS = 1500;
      
      // Store local timestamp on the event for UI rendering and future debounce checks
      const eventWithLocalTime = { ...event, _localTimestamp: localNow };

      // Check against current event
      if (state.liveSensor.event && (state.liveSensor.event as any)._localTimestamp) {
        if (localNow - (state.liveSensor.event as any)._localTimestamp < DEBOUNCE_MS) return state;
      }
      
      // Check against last queued item
      const lastQueued = state.liveSensor.queue[state.liveSensor.queue.length - 1];
      if (lastQueued && (lastQueued as any)._localTimestamp) {
        if (localNow - (lastQueued as any)._localTimestamp < DEBOUNCE_MS) return state;
      }
      
      // Check against most recent session history item
      const lastPushed = state.liveSensor.sessionHistory[0];
      if (lastPushed && (lastPushed as any)._localTimestamp) {
        if (localNow - (lastPushed as any)._localTimestamp < DEBOUNCE_MS) return state;
      }

      return {
        liveSensor: { ...state.liveSensor, queue: [...state.liveSensor.queue, eventWithLocalTime] },
      };
    }),
  dequeueSensorEvent: () =>
    set((state) => {
      if (state.liveSensor.queue.length === 0) return state;
      const [nextEvent, ...rest] = state.liveSensor.queue;
      return {
        liveSensor: { ...state.liveSensor, event: nextEvent, queue: rest },
      };
    }),
  removeSensorEventFromQueue: (index: number) =>
    set((state) => {
      const newQueue = [...state.liveSensor.queue];
      newQueue.splice(index, 1);
      return {
        liveSensor: { ...state.liveSensor, queue: newQueue },
      };
    }),
  addSessionHistoryItem: (event: RoadEvent) =>
    set((state) => ({
      liveSensor: {
        ...state.liveSensor,
        sessionHistory: [event, ...state.liveSensor.sessionHistory],
      },
    })),
  setEngineMetrics: (metrics) =>
    set((state) => ({
      liveSensor: { ...state.liveSensor, metrics },
    })),
  setTransmissionStage: (stage) => set({ transmission: { stage } }),
  setCalibrationFactor: (factor) =>
    set((state) => ({
      liveSensor: { ...state.liveSensor, calibrationFactor: factor },
    })),

  loadInitialData: async () => {
    set({ isInitialLoading: true, globalError: null });
    try {
      const [stats, sectors, reports, vehicles, trendData] = await Promise.all([
        fetchStats(),
        fetchSectors(),
        fetchReports(), // initially fetch all
        fetchVehicles(),
        fetchTrend(),
      ]);
      set({ stats, sectors, reports, vehicles, trendData, isInitialLoading: false });
    } catch (err) {
      console.error("Failed to load initial data:", err);
      set({ isInitialLoading: false, globalError: "Failed to load dashboard data." });
    }
  },

  handleRealtimeUpdate: (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    set((state) => {
      let nextReports = [...state.reports];
      if (eventType === 'INSERT') {
        if (!nextReports.find(r => r.id === newRecord.id)) {
          nextReports = [newRecord as Report, ...nextReports];
        }
      } else if (eventType === 'UPDATE') {
        nextReports = nextReports.map(r => r.id === newRecord.id ? (newRecord as Report) : r);
      } else if (eventType === 'DELETE') {
        nextReports = nextReports.filter(r => r.id !== oldRecord.id);
      }
      return { reports: nextReports };
    });
    // We can fetch stats in background without blocking UI
    fetchStats().then(stats => set({ stats })).catch(() => {});
  },

  processTransmissionEvent: (event: RoadEvent) => {
    set({ transmission: { stage: "processing" } });
    registerDevice();

    setTimeout(() => {
      set({ transmission: { stage: "transmitted" } });

      setTimeout(() => {
        set({ transmission: { stage: "confirmed" } });

        if (event && event.type) {
          const uuid = getOrCreateDeviceId();
          get().addReport({
            id: `RPT-LIVE-${Math.floor(Math.random() * 9000)}`,
            reportDate: new Date().toISOString(),
            type: event.type as any,
            confidence: event.confidence,
            weight: event.weight || 0,
            source: "VEHICLE_SENSOR",
            vehicleRef: uuid,
            sectorId: "SEC-B",
            sectorName: "Kharar-CU Sector B",
            roadReference: "Live Demo Route",
            latitude: event.latitude || 30.748 + Math.random() * 0.005,
            longitude: event.longitude || 76.645 + Math.random() * 0.005,
            status: "pending",
            independentReports: 1,
            reportingVehicles: [{ id: uuid }],
            speed: event.speed,
            gyroscope: event.gyroscope,
            waveformData: event.waveformData,
          } as any).catch((e) => console.warn("Failed to push to DB:", e));

          // Track in session history
          get().addSessionHistoryItem(event);
        }

        setTimeout(() => {
          set({ transmission: { stage: "idle" } });
          set((state) => ({ liveSensor: { ...state.liveSensor, event: null } }));
        }, 150);
      }, 25);
    }, 25);
  },
}));

if (typeof window !== "undefined") {
  (window as any).__store = useAppStore;
}
