import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useDemoLoop() {
  const isDemoActive = useAppStore(state => state.demoMode);
  const addReport = useAppStore(state => state.addReport);
  const sectors = useAppStore(state => state.sectors);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDemoActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Generate a random report every 3-8 seconds
    const scheduleNext = () => {
      const delay = 3000 + Math.random() * 5000;
      
      timerRef.current = setTimeout(() => {
        if (sectors.length === 0) {
          scheduleNext();
          return;
        }

        const sector = sectors[Math.floor(Math.random() * sectors.length)];
        
        const types = [
          'POTENTIAL_POTHOLE', 'ROAD_ANOMALY', 'SURFACE_DEGRADATION',
          'SEVERE_CRACK', 'SPEED_BUMP_UNMARKED', 'WATERLOGGING',
          'DEBRIS_ON_ROAD', 'UNEVEN_JOINT', 'MANHOLE_DEPRESSION'
        ] as any[];

        const isHotspot = Math.random() > 0.5; // 50% chance to hit a cluster spot
        const baseLat = isHotspot ? sector.bounds.startLat + 0.001 : sector.bounds.startLat + (sector.bounds.endLat - sector.bounds.startLat) * Math.random();
        const baseLng = isHotspot ? sector.bounds.startLng + 0.001 : sector.bounds.startLng + (sector.bounds.endLng - sector.bounds.startLng) * Math.random();

        // Add tiny jitter (~5 meters max) to cluster
        const lat = baseLat + (Math.random() * 0.0001 - 0.00005);
        const lon = baseLng + (Math.random() * 0.0001 - 0.00005);
        
        const type = isHotspot ? 'POTENTIAL_POTHOLE' : types[Math.floor(Math.random() * types.length)];
        const vRef = `V-SIM-${Math.floor(100 + Math.random() * 899)}`;

        addReport({
          reportDate: new Date().toISOString().split('T')[0],
          sectorId: sector.id,
          sectorName: sector.name,
          roadReference: `Simulated Fleet / ${sector.name}`,
          type,
          confidence: Math.floor(60 + Math.random() * 35),
          source: 'VEHICLE_SENSOR',
          vehicleRef: vRef,
          rawDataShared: false,
          status: 'pending',
          independentReports: 1,
          latitude: lat,
          longitude: lon,
          reportingVehicles: [vRef]
        });
        
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isDemoActive, addReport, sectors]);
}
