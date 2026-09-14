import { SensorReading, RoadEvent } from "../store/types";
import { useAppStore } from "../store/useAppStore";
import * as tf from "@tensorflow/tfjs";

// Configuration for Contextual Anomaly Detection
const WINDOW_SIZE = 40; // Represents recent history (approx 1-2 seconds of data)
const zBuffer: number[] = [];

// Preload the AI Model
let aiModel: tf.LayersModel | null = null;
tf.loadLayersModel("/model/model.json")
  .then((m) => {
    aiModel = m;
    console.log("[Engine] TensorFlow.js 1D-CNN Model loaded successfully.");
  })
  .catch((e) =>
    console.error(
      "[Engine] Failed to load AI model, falling back to heuristic:",
      e,
    ),
  );

// State Machine for Waveform Window Capture
type EngineState = "IDLE" | "CAPTURING" | "COOLDOWN";
let engineState: EngineState = "IDLE";

let captureBuffer: number[] = [];
const CAPTURE_FRAMES = 15; // ~500ms at 30Hz

// Minimum absolute G-force deviation required to even consider it an anomaly
const ABSOLUTE_THRESHOLD = 0.3;
const VARIANCE_SMOOTHING = 0.05;

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
    // --- STAGE 3: TENSORFLOW 1D-CNN ---
    // Ensure shape [1, sequence.length, 1] for Conv1D compatibility
    const tensor = tf.tensor3d([sequence.map((value) => [value])]);
    const prediction = aiModel.predict(tensor) as tf.Tensor;
    const probs = await prediction.data();

    tensor.dispose();
    prediction.dispose();

    const pPothole = probs[0];
    const pNoise = probs[1];

    if (pNoise > 0.6) {
      console.debug(
        `[Engine] AI classified event as noise (prob: ${pNoise.toFixed(2)}). Emitting anyway for debug.`,
      );
    }

    type = peakToPeak > 3.5 ? "SEVERE_POTHOLE" : "POTENTIAL_POTHOLE";

    aiConfidenceBonus = Math.floor(pPothole * 10) - 5;
    console.debug(
      `[Engine] AI Classification: ${type} (Confidence: ${pPothole.toFixed(2)})`,
    );
  } else {
    // --- STAGE 1.5: HEURISTIC FALLBACK ---
    let minZ = Infinity,
      maxZ = -Infinity;
    let idxMin = 0,
      idxMax = 0;

    sequence.forEach((z, idx) => {
      if (z < minZ) {
        minZ = z;
        idxMin = idx;
      }
      if (z > maxZ) {
        maxZ = z;
        idxMax = idx;
      }
    });

    const isPotholeSequence = idxMin < idxMax;

    if (isPotholeSequence) {
      type = peakToPeak > 3.5 ? "SEVERE_POTHOLE" : "POTENTIAL_POTHOLE";
    } else {
      console.debug("[Engine] Ignored non-pothole sequence.");
      return;
    }
  }

  // CONFIDENCE SCORING (w/ Speed Normalisation & AI Bonus)
  const captureSpeed = reading.gps?.speed ?? null;
  let confidence = Math.min(98, Math.floor(40 + (windowSnr - 3.0) * 12));
  confidence = Math.min(99, confidence + aiConfidenceBonus);

  if (peakToPeak > 3.0) confidence = Math.min(99, confidence + 10);
  if (captureSpeed !== null && captureSpeed < 10 && peakToPeak > 2.5) {
    confidence = Math.min(99, confidence + 15);
  }

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

let cooldownFrames = 0;

export function processSensorReading(
  reading: SensorReading,
  onEvent: (event: RoadEvent) => void,
  onMetrics?: (metrics: any) => void,
) {
  // --- HACKATHON: AUTO-CALIBRATION ---
  // Fetch the current device's suspension calibration factor from the store.
  // A heavy truck might have factor=1.5, a soft sedan factor=0.8
  const calibrationFactor = useAppStore.getState().liveSensor.calibrationFactor || 1.0;

  // Apply calibration to the raw reading before processing
  const rawZ = reading.accelerometer.z * calibrationFactor;
  const currentSpeed = reading.gps?.speed ?? null;

  zBuffer.push(rawZ);
  if (zBuffer.length > WINDOW_SIZE) zBuffer.shift();
  if (zBuffer.length < WINDOW_SIZE) return;

  const meanZ = zBuffer.reduce((sum, val) => sum + val, 0) / zBuffer.length;
  const variance =
    zBuffer.reduce((sum, val) => sum + Math.pow(val - meanZ, 2), 0) /
    zBuffer.length;
  const stdDev = Math.sqrt(variance);

  const zForce = Math.abs(rawZ - meanZ);
  let dynamicThreshold = ABSOLUTE_THRESHOLD;
  if (currentSpeed && currentSpeed > 15) {
    dynamicThreshold += (currentSpeed - 15) * 0.05;
  }

  const snr = zForce / (stdDev + VARIANCE_SMOOTHING);

  if (onMetrics) {
    onMetrics({ rawZ, meanZ, stdDev, zForce, snr, threshold: 3.0 });
  }

  if (engineState === "COOLDOWN") {
    if (cooldownFrames > 0) {
      cooldownFrames--;
    } else {
      engineState = "IDLE";
    }
  }

  if (engineState === "IDLE") {
    if (zForce > dynamicThreshold && snr > 1.5) {
      engineState = "CAPTURING";
      captureBuffer = zBuffer.slice(-5);
      triggerMean = meanZ;
      triggerStdDev = stdDev;
    }
  } else if (engineState === "CAPTURING") {
    captureBuffer.push(rawZ);

    if (captureBuffer.length >= 5 + CAPTURE_FRAMES) {
      const minZ = Math.min(...captureBuffer);
      const maxZ = Math.max(...captureBuffer);

      const peakToPeak = maxZ - minZ;
      const maxDeviation = Math.max(
        Math.abs(maxZ - triggerMean),
        Math.abs(minZ - triggerMean),
      );
      const windowSnr = maxDeviation / (triggerStdDev + VARIANCE_SMOOTHING);

      const sequence = captureBuffer.map((z) => z - triggerMean);

      engineState = "COOLDOWN";
      cooldownFrames = 60; // 2 seconds at 30Hz

      // Fire and forget inference
      classifyEvent(sequence, peakToPeak, windowSnr, reading, onEvent).catch(
        console.error,
      );
    }
  }
}
