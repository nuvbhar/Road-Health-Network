import { create } from 'zustand';
import { Sector, Report, Vehicle, AppStats, TrendDataPoint, SensorReading, RoadEvent } from './types';
import { fetchStats, fetchSectors, fetchReports, fetchVehicles, fetchTrend, updateReportStatus as apiUpdateReportStatus, createReport as apiCreateReport } from '../services/api';

interface AppState {
  stats: AppStats;
  sectors: Sector[];
  reports: Report[];
  vehicles: Vehicle[];
  trendData: TrendDataPoint[];
  
  activeSectorFilter: string | null;
  activeStatusFilter: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  
  liveSensor: {
    connected: boolean;
    reading: SensorReading | null;
    event: RoadEvent | null;
  };
  transmission: {
    stage: 'idle' | 'processing' | 'transmitted' | 'confirmed';
  };
  demoMode: boolean;

  // Actions
  setStats: (stats: AppStats) => void;
  addReport: (report: Partial<Report>) => Promise<void>;
  updateReportStatus: (id: string, status: Report['status']) => Promise<void>;
  setSectorFilter: (sectorId: string | null) => void;
  setStatusFilter: (status: string) => void;
  setSortColumn: (col: string, dir: 'asc' | 'desc') => void;
  setSensorReading: (reading: SensorReading) => void;
  setSensorEvent: (event: RoadEvent | null) => void;
  setTransmissionStage: (stage: 'idle' | 'processing' | 'transmitted' | 'confirmed') => void;
  toggleDemoMode: () => void;
  loadInitialData: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  stats: { totalReports: 0, activeVehicles: 0, sectorsMonitored: 0, highConfidence: 0, pendingReview: 0, resolved: 0 },
  sectors: [],
  reports: [],
  vehicles: [],
  trendData: [],
  
  activeSectorFilter: null,
  activeStatusFilter: 'all',
  sortColumn: 'reportDate',
  sortDirection: 'desc',
  
  liveSensor: { connected: false, reading: null, event: null },
  transmission: { stage: 'idle' },
  demoMode: false,

  setStats: (stats) => set({ stats }),
  
  addReport: async (report) => {
    // Send to backend
    await apiCreateReport(report);
    // Refresh lists
    await get().loadInitialData();
  },
  
  updateReportStatus: async (id, status) => {
    // Optimistic update
    set((state) => ({
      reports: state.reports.map(r => r.id === id ? { ...r, status } : r)
    }));
    await apiUpdateReportStatus(id, status);
    const newStats = await fetchStats();
    set({ stats: newStats });
  },
  
  setSectorFilter: (sectorId) => set({ activeSectorFilter: sectorId }),
  setStatusFilter: (status) => set({ activeStatusFilter: status }),
  setSortColumn: (col, dir) => set({ sortColumn: col, sortDirection: dir }),
  
  setSensorReading: (reading) => set((state) => ({ 
    liveSensor: { ...state.liveSensor, reading, connected: true } 
  })),
  setSensorEvent: (event) => set((state) => ({ 
    liveSensor: { ...state.liveSensor, event } 
  })),
  setTransmissionStage: (stage) => set({ transmission: { stage } }),
  toggleDemoMode: () => set((state) => ({ demoMode: !state.demoMode })),
  
  loadInitialData: async () => {
    try {
      const [stats, sectors, reports, vehicles, trendData] = await Promise.all([
        fetchStats(),
        fetchSectors(),
        fetchReports(), // initially fetch all
        fetchVehicles(),
        fetchTrend()
      ]);
      set({ stats, sectors, reports, vehicles, trendData });
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  }
}));

if (typeof window !== 'undefined') {
  (window as any).__store = useAppStore;
}
