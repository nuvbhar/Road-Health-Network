import { SensorReading, RoadEvent } from "../store/types";
import { useAppStore } from "../store/useAppStore";
import * as tf from "@tensorflow/tfjs";
import { DETECTION_CONFIG } from "../utils/constants";

// Configuration for Rapid Contextual Anomaly Detection
const zBuffer: number[] = [];
let runningSum = 0;
let runningSqSum = 0;

// Preload the AI Model
let aiModel: tf.LayersModel | null = null;
tf.loadLayersModel(DETECTION_CONFIG.MODEL_PATH)
  .then((m) => {
    aiModel = m;
    console.log("[Engine] TensorFlow.js 1D-CNN Model loaded successfully.");
  })
  .catch((e) => {
    console.error("[Engine] Failed to load AI model, falling back to heuristic:", e);
    // Ideally this would dispatch to a centralized error store
  });

// State Machine for Waveform Window Capture
type EngineState = "IDLE" | "CAPTURING" | "COOLDOWN";
let engineState: EngineState = "IDLE";
let captureCountdown = 0;
let cooldownFrames = 0;

// Minimum absolute G-force deviation required to consider an anomaly
const ABSOLUTE_THRESHOLD = 0.65; // increased significantly to lower sensitivity
const VARIANCE_SMOOTHING = 0.04;

// Context snapshots for SNR
let triggerMean = 0;
let triggerStdDev = 0;

async function classifyEvent(
  sequence: number[],
  peakToPeak: number,
  windowSnr: number,
  reading: SensorReading,
  onEvent: (event: RoadEvent) => void,
) {
  let type: string;
  let aiConfidenceBonus = 0;

  if (aiModel) {
    try {
      // Fast Tensor3D inference [1, sequence.length, 1]
      const tensor = tf.tensor3d([sequence.map((value) => [value])]);
      const prediction = aiModel.predict(tensor) as tf.Tensor;
      const probs = await prediction.data();

      tensor.dispose();
      prediction.dispose();

      const pPothole = probs[0] ?? 0.5;
      type = peakToPeak > 2.8 ? "SEVERE_POTHOLE" : "POTENTIAL_POTHOLE";
      aiConfidenceBonus = Math.floor(pPothole * 12) - 3;
    } catch {
      type = peakToPeak > 2.8 ? "SEVERE_POTHOLE" : "POTENTIAL_POTHOLE";
    }
  } else {
    // Fast heuristic classification
    type = peakToPeak > 2.8 ? "SEVERE_POTHOLE" : "POTENTIAL_POTHOLE";
  }

  // Dynamic Confidence Scoring starting at 0% and scaling with sensor movement
  const captureSpeed = reading.gps?.speed ?? null;
  let confidence = 0;

  // Scale with Signal-to-Noise Ratio (movement clarity)
  if (windowSnr > 1.35) {
    confidence += (windowSnr - 1.35) * 15;
  }
  
  // Scale with absolute movement force (peak to peak Z-axis deviation)
  if (peakToPeak > 0.5) {
    confidence += (peakToPeak - 0.5) * 25;
  }

  confidence += aiConfidenceBonus;

  if (peakToPeak > 2.5) confidence += 12;
  if (captureSpeed !== null && captureSpeed < 10 && peakToPeak > 2.0) {
    confidence += 10;
  }

  // Ensure it stays within 0-99%
  confidence = Math.max(0, Math.min(99, Math.floor(confidence)));

  onEvent({
    detected: true,
    type,
    confidence,
    weight: parseFloat(peakToPeak.toFixed(2)),
    timestamp: Date.now(),
    latitude: reading.gps?.latitude,
    longitude: reading.gps?.longitude,
    speed: captureSpeed,
    gyroscope: {
      pitch: reading.gyroscope.x,
      roll: reading.gyroscope.y,
      yaw: reading.gyroscope.z,
    },
    waveformData: sequence,
  });
}

export function processSensorReading(
  reading: SensorReading,
  onEvent: (event: RoadEvent) => void,
  onMetrics?: (metrics: any) => void,
) {
  const calibrationFactor = useAppStore.getState().liveSensor.calibrationFactor || 1.0;
  const rawZ = reading.accelerometer.z * calibrationFactor;
  const currentSpeed = reading.gps?.speed ?? null;

  // Fast O(1) Running Statistics
  zBuffer.push(rawZ);
  runningSum += rawZ;
  runningSqSum += rawZ * rawZ;

  if (zBuffer.length > DETECTION_CONFIG.WINDOW_SIZE) {
    const removed = zBuffer.shift()!;
    runningSum -= removed;
    runningSqSum -= removed * removed;
  }

  const count = zBuffer.length;
  const meanZ = count > 0 ? runningSum / count : rawZ;
  const variance = count > 1 ? Math.max(0, (runningSqSum / count) - (meanZ * meanZ)) : 0.01;
  const stdDev = Math.sqrt(variance);

  const zForce = Math.abs(rawZ - meanZ);
  let dynamicThreshold = DETECTION_CONFIG.ABSOLUTE_THRESHOLD;
  if (currentSpeed && currentSpeed > 15) {
    dynamicThreshold += (currentSpeed - 15) * 0.04;
  }

  const snr = zForce / (stdDev + DETECTION_CONFIG.VARIANCE_SMOOTHING);

  // Instantly emit live metrics to UI
  if (onMetrics) {
    onMetrics({ rawZ, meanZ, stdDev, zForce, snr, threshold: dynamicThreshold });
  }

  if (engineState === "COOLDOWN") {
    if (cooldownFrames > 0) {
      cooldownFrames--;
    } else {
      engineState = "IDLE";
    }
  }

  if (engineState === "IDLE") {
    // Fast trigger on immediate spike
    if ((zForce > dynamicThreshold && snr > 2.2) || zForce > 0.85) {
      engineState = "CAPTURING";
      captureCountdown = 4; // Wait only ~130ms (4 frames) for crest/bounce
      triggerMean = meanZ;
      triggerStdDev = stdDev;
    }
  } else if (engineState === "CAPTURING") {
    captureCountdown--;
    if (captureCountdown <= 0) {
      // Pre-buffered window: extract 20 most recent frames centered on the spike
      const samples = zBuffer.slice(-20);
      while (samples.length < 20) {
        samples.unshift(samples[0] ?? meanZ);
      }

      const minZ = Math.min(...samples);
      const maxZ = Math.max(...samples);
      const peakToPeak = maxZ - minZ;
      const maxDeviation = Math.max(
        Math.abs(maxZ - triggerMean),
        Math.abs(minZ - triggerMean),
      );
      const windowSnr = maxDeviation / (triggerStdDev + VARIANCE_SMOOTHING);
      const sequence = samples.map((z) => z - triggerMean);

      engineState = "COOLDOWN";
      cooldownFrames = 15; // Fast 500ms recovery for back-to-back potholes

      // Classify immediately
      classifyEvent(sequence, peakToPeak, windowSnr, reading, onEvent).catch(
        console.error,
      );
    }
  }
}
