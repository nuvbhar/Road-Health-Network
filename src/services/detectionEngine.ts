import { SensorReading, RoadEvent } from '../store/types';

// Configuration for Contextual Anomaly Detection
const WINDOW_SIZE = 40; // Represents recent history (approx 1-2 seconds of data)
const zBuffer: number[] = [];
let cooldown = false;

// Minimum absolute G-force deviation required to even consider it a pothole
const ABSOLUTE_THRESHOLD = 0.8; 
// Prevents division by zero on perfectly smooth surfaces
const VARIANCE_SMOOTHING = 0.05; 

export function processSensorReading(
  reading: SensorReading, 
  onEvent: (event: RoadEvent) => void,
  onMetrics?: (metrics: any) => void
) {
  const rawZ = reading.accelerometer.z;
  
  // 1. Maintain Rolling Window
  zBuffer.push(rawZ);
  if (zBuffer.length > WINDOW_SIZE) {
    zBuffer.shift();
  }

  // Need a full buffer to establish a solid baseline
  if (zBuffer.length < WINDOW_SIZE) return;

  // 2. Calculate Context (Rolling Mean & Variance)
  const meanZ = zBuffer.reduce((sum, val) => sum + val, 0) / zBuffer.length;
  const variance = zBuffer.reduce((sum, val) => sum + Math.pow(val - meanZ, 2), 0) / zBuffer.length;
  const stdDev = Math.sqrt(variance);

  // Absolute force of the current spike
  const zForce = Math.abs(rawZ - meanZ);
  
  // 3. Calculate Signal-to-Noise Ratio (Z-Score)
  const snr = zForce / (stdDev + VARIANCE_SMOOTHING);

  // Emit debug metrics to UI
  if (onMetrics) {
    onMetrics({
      rawZ,
      meanZ,
      stdDev,
      zForce,
      snr,
      threshold: 3.0
    });
  }

  if (zForce > ABSOLUTE_THRESHOLD && !cooldown) {
    // 4. Contextual Logic & Classification
    // If SNR > 3.0, the spike stands out clearly from the background noise.
    if (snr > 3.0) {
      cooldown = true;
      
      // Determine Classification based on the direction of the initial breakout:
      // - If Z drops below the mean first, the tire is falling into a void -> POTHOLE
      // - If Z shoots above the mean first, the tire is hitting a ramp -> SPEED_BUMP
      const isNegativeSpike = rawZ < meanZ;
      let type: string;
      
      if (isNegativeSpike) {
        // It's a pothole. Check severity.
        type = zForce > 2.5 ? 'SEVERE_POTHOLE' : 'POTENTIAL_POTHOLE';
      } else {
        // Positive spike first.
        type = 'SPEED_BUMP';
      }

      // Map SNR dynamically to a Confidence %
      // snr=3.0 -> ~40%, snr=8.0+ -> ~98%
      let confidence = Math.min(98, Math.floor(40 + ((snr - 3.0) * 12)));
      
      // Boost confidence if the sheer physical force is massive
      if (zForce > 2.0) confidence = Math.min(99, confidence + 10);
      
      const weight = parseFloat(zForce.toFixed(2));
      
      onEvent({
        detected: true,
        type,
        confidence,
        weight,
        timestamp: Date.now()
      });
      
      // Cooldown prevents double-counting the rebound/landing of the same event
      setTimeout(() => {
        cooldown = false;
      }, 2500);
    }
  }
}
