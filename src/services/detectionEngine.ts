import { SensorReading, RoadEvent } from '../store/types';

// Configuration for Contextual Anomaly Detection
const WINDOW_SIZE = 40; // Represents recent history (approx 1-2 seconds of data)
const zBuffer: number[] = [];

// State Machine for Waveform Window Capture
type EngineState = 'IDLE' | 'CAPTURING' | 'COOLDOWN';
let engineState: EngineState = 'IDLE';

let captureBuffer: number[] = [];
const CAPTURE_FRAMES = 15; // ~500ms at 30Hz

// Minimum absolute G-force deviation required to even consider it an anomaly
const ABSOLUTE_THRESHOLD = 0.8; 
const VARIANCE_SMOOTHING = 0.05; 

// Context snapshots for SNR
let triggerMean = 0;
let triggerStdDev = 0;

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
  const snr = zForce / (stdDev + VARIANCE_SMOOTHING);

  // Emit debug metrics to UI
  if (onMetrics) {
    onMetrics({ rawZ, meanZ, stdDev, zForce, snr, threshold: 3.0 });
  }

  // ---------------------------------------------------------
  // STATE: IDLE -> Check for threshold breaches
  // ---------------------------------------------------------
  if (engineState === 'IDLE') {
    if (zForce > ABSOLUTE_THRESHOLD && snr > 3.0) {
      // Threshold breached! Begin capturing the full waveform window.
      engineState = 'CAPTURING';
      
      // Seed buffer with the last 5 frames (pre-impact context)
      captureBuffer = zBuffer.slice(-5);
      
      // Snapshot the road noise *before* the spike corrupts it
      triggerMean = meanZ;
      triggerStdDev = stdDev;
    }
  } 
  // ---------------------------------------------------------
  // STATE: CAPTURING -> Accumulate the waveform
  // ---------------------------------------------------------
  else if (engineState === 'CAPTURING') {
    captureBuffer.push(rawZ);
    
    // Once we have collected 500ms of future data...
    if (captureBuffer.length >= 5 + CAPTURE_FRAMES) {
      // 3. WAVEFORM WINDOW ANALYSIS (Feature Extraction)
      let minZ = Infinity;
      let maxZ = -Infinity;
      let idxMin = 0;
      let idxMax = 0;
      
      captureBuffer.forEach((z, idx) => {
        if (z < minZ) { minZ = z; idxMin = idx; }
        if (z > maxZ) { maxZ = z; idxMax = idx; }
      });
      
      const peakToPeak = maxZ - minZ;
      const maxDeviation = Math.max(Math.abs(maxZ - triggerMean), Math.abs(minZ - triggerMean));
      const windowSnr = maxDeviation / (triggerStdDev + VARIANCE_SMOOTHING);
      
      // 4. CLASSIFICATION (Sequence Timing)
      // Pothole: Minimum (Drop) occurs BEFORE Maximum (Strike)
      // Speed Bump: Maximum (Ramp) occurs BEFORE Minimum (Landing)
      const isPothole = idxMin < idxMax;
      
      let type: string;
      if (isPothole) {
        // High Peak-to-Peak amplitude indicates a severe crater
        type = peakToPeak > 3.5 ? 'SEVERE_POTHOLE' : 'POTENTIAL_POTHOLE';
      } else {
        type = 'SPEED_BUMP';
      }
      
      // 5. CONFIDENCE SCORING
      let confidence = Math.min(98, Math.floor(40 + ((windowSnr - 3.0) * 12)));
      // Massive kinetic energy (Peak-to-Peak) boosts confidence
      if (peakToPeak > 3.0) confidence = Math.min(99, confidence + 10);
      
      const weight = parseFloat(peakToPeak.toFixed(2));
      
      onEvent({
        detected: true,
        type,
        confidence,
        weight,
        timestamp: Date.now()
      });
      
      // 6. COOLDOWN -> Prevent double-counting the suspension rebound ringing
      engineState = 'COOLDOWN';
      setTimeout(() => {
        engineState = 'IDLE';
      }, 2000);
    }
  }
}
