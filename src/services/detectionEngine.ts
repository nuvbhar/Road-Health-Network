import { SensorReading, RoadEvent } from '../store/types';

let cooldown = false;

export function processSensorReading(
  reading: SensorReading, 
  onEvent: (event: RoadEvent) => void
) {
  // Simple threshold mock: if Z-axis (vertical) bounces beyond 1.5G from baseline (1G)
  const zForce = Math.abs(reading.accelerometer.z - 1);
  
  if (zForce > 1.5 && !cooldown) {
    cooldown = true;
    
    // Determine confidence based on force magnitude
    const confidence = Math.min(100, Math.floor(50 + (zForce - 1.5) * 20));
    
    onEvent({
      detected: true,
      type: zForce > 2.5 ? 'SEVERE_IMPACT' : 'POTENTIAL_POTHOLE',
      confidence,
      timestamp: Date.now()
    });
    
    // 3 second cooldown before another event can trigger
    setTimeout(() => {
      cooldown = false;
    }, 3000);
  }
}
