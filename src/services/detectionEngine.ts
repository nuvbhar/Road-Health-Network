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
let triggerSpeed: number | null = null;

export function processSensorReading(
  reading: SensorReading, 
  onEvent: (event: RoadEvent) => void,
  onMetrics?: (metrics: any) => void
) {
  const rawZ = reading.accelerometer.z;
  const currentSpeed = reading.gps?.speed || null;
  
  // Basic gyroscope handling: if the phone is tumbling wildly, abort processing
  const isTumbling = 
    Math.abs(reading.gyroscope.x) > 2.5 || 
    Math.abs(reading.gyroscope.y) > 2.5 || 
    Math.abs(reading.gyroscope.z) > 2.5;

  // 1. Maintain Rolling Window
  zBuffer.push(rawZ);
  if (zBuffer.length > WINDOW_SIZE) {
    zBuffer.shift();
  }

  if (zBuffer.length < WINDOW_SIZE || isTumbling) return;

  // 2. Calculate Context (Rolling Mean & Variance)
  const meanZ = zBuffer.reduce((sum, val) => sum + val, 0) / zBuffer.length;
  const variance = zBuffer.reduce((sum, val) => sum + Math.pow(val - meanZ, 2), 0) / zBuffer.length;
  const stdDev = Math.sqrt(variance);

  const zForce = Math.abs(rawZ - meanZ);
  
  // 3. Dynamic Threshold based on speed
  // A bump at 30 m/s (108 km/h) creates much higher g-force than at 5 m/s (18 km/h).
  // We dynamically raise the absolute threshold if the vehicle is moving fast.
  let dynamicThreshold = ABSOLUTE_THRESHOLD;
  if (currentSpeed && currentSpeed > 15) {
    dynamicThreshold += (currentSpeed - 15) * 0.05; 
  }

  const snr = zForce / (stdDev + VARIANCE_SMOOTHING);

  // Emit debug metrics to UI
  if (onMetrics) {
    onMetrics({ rawZ, meanZ, stdDev, zForce, snr, threshold: 3.0 });
  }

  // ---------------------------------------------------------
  // STATE: IDLE -> Check for threshold breaches
  // ---------------------------------------------------------
  if (engineState === 'IDLE') {
    if (zForce > dynamicThreshold && snr > 3.0) {
      engineState = 'CAPTURING';
      captureBuffer = zBuffer.slice(-5);
      triggerMean = meanZ;
      triggerStdDev = stdDev;
      triggerSpeed = currentSpeed;
    }
  } 
  // ---------------------------------------------------------
  // STATE: CAPTURING -> Accumulate the waveform
  // ---------------------------------------------------------
  else if (engineState === 'CAPTURING') {
    captureBuffer.push(rawZ);
    
    if (captureBuffer.length >= 5 + CAPTURE_FRAMES) {
      // 4. WAVEFORM WINDOW ANALYSIS
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
      
      // Feature: Symmetry Ratio (Speed bumps are highly symmetric ~ 0.8-1.2, potholes vary wildly)
      const dropDepth = Math.abs(minZ - triggerMean);
      const strikeHeight = Math.abs(maxZ - triggerMean);
      const symmetryRatio = strikeHeight > 0 ? dropDepth / strikeHeight : 1;
      
      // 5. CLASSIFICATION (Sequence Timing + Symmetry)
      let type: string;
      const isPotholeSequence = idxMin < idxMax;
      
      if (isPotholeSequence) {
        // High Peak-to-Peak amplitude indicates a severe crater
        type = peakToPeak > 3.5 ? 'SEVERE_POTHOLE' : 'POTENTIAL_POTHOLE';
      } else {
        // If it looks like a speedbump but is extremely asymmetric (< 0.2 or > 5.0), 
        // it might just be bad noise or a protruding rock, but we'll still call it 
        // a speed bump with a logged warning for ML extraction later.
        if (symmetryRatio < 0.2 || symmetryRatio > 5.0) {
          console.debug('[Engine] Asymmetric bump detected. Ratio:', symmetryRatio);
        }
        type = 'SPEED_BUMP';
      }
      
      // 6. CONFIDENCE SCORING (w/ Speed Normalisation)
      let confidence = Math.min(98, Math.floor(40 + ((windowSnr - 3.0) * 12)));
      
      if (peakToPeak > 3.0) confidence = Math.min(99, confidence + 10);
      
      // Speed Modifier: High speeds make hits larger, so if we get a massive hit 
      // at low speed, confidence in severity skyrockets.
      if (triggerSpeed !== null && triggerSpeed < 10 && peakToPeak > 2.5) {
        confidence = Math.min(99, confidence + 15);
      }
      
      const weight = parseFloat(peakToPeak.toFixed(2));
      
      onEvent({
        detected: true,
        type,
        confidence,
        weight,
        timestamp: Date.now()
      });
      
      engineState = 'COOLDOWN';
      setTimeout(() => {
        engineState = 'IDLE';
      }, 2000);
    }
  }
}
