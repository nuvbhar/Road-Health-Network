import { Report } from "../store/types";

/**
 * Spatial Confirmation and Waveform Correlation Engine
 * Implements Stages 4, 5, and 6 of the Pothole Detection Plan:
 * - Spatial proximity (Haversine metric)
 * - Speed-normalized distance resampling
 * - Cross-car Pearson correlation & DTW shape confirmation
 * - Multi-car confidence scoring
 */

export const CLUSTER_EPSILON_METERS = 15.0; // Spatial tolerance for GPS error
export const MIN_CORRELATION_THRESHOLD = 0.55; // Pearson r threshold for shape match
export const NOMINAL_SPEED_MS = 8.33; // Default 30 km/h in m/s if GPS speed unavailable
export const TARGET_WAVEFORM_POINTS = 20;

/**
 * Calculates Haversine distance in meters between two lat/lng coordinates.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Resamples a time-series g-force window by physical road distance.
 * Fast cars register narrower, sharper spikes in time; slow cars register wider spikes.
 * Normalizing to a standard road distance (e.g. 5m road segment) aligns physical geometry.
 */
export function resampleByDistance(
  waveform: number[],
  speedMs: number | null | undefined,
  targetPoints: number = TARGET_WAVEFORM_POINTS
): number[] {
  if (!waveform || waveform.length === 0) return [];
  if (waveform.length === 1) return new Array(targetPoints).fill(waveform[0]);

  const effectiveSpeed = (speedMs !== null && speedMs !== undefined && speedMs > 1.0)
    ? speedMs
    : NOMINAL_SPEED_MS;

  // Window duration is ~666ms (20 samples at 30Hz)
  const windowDurationSec = (waveform.length / 30);
  const physicalDistanceMeters = effectiveSpeed * windowDurationSec;

  // Standard target distance for normalization = 6.0 meters
  const standardDistanceMeters = 6.0;
  const distanceRatio = physicalDistanceMeters / standardDistanceMeters;

  const resampled: number[] = new Array(targetPoints).fill(0);
  const srcLen = waveform.length;

  for (let i = 0; i < targetPoints; i++) {
    // Relative position in target [0, 1]
    const u = i / (targetPoints - 1);
    
    // Center-aligned scale by distance ratio
    const centeredU = (u - 0.5) * distanceRatio + 0.5;
    const srcIndex = centeredU * (srcLen - 1);

    if (srcIndex <= 0) {
      resampled[i] = waveform[0];
    } else if (srcIndex >= srcLen - 1) {
      resampled[i] = waveform[srcLen - 1];
    } else {
      const idxLow = Math.floor(srcIndex);
      const idxHigh = Math.ceil(srcIndex);
      const weight = srcIndex - idxLow;
      resampled[i] = waveform[idxLow] * (1 - weight) + waveform[idxHigh] * weight;
    }
  }

  return resampled;
}

/**
 * Calculates Pearson Correlation Coefficient r between two resampled waveforms.
 * Returns value in [-1.0, 1.0].
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    denomX += diffX * diffX;
    denomY += diffY * diffY;
  }

  const denominator = Math.sqrt(denomX * denomY);
  if (denominator === 0) return 0;

  const r = numerator / denominator;
  return Math.max(-1, Math.min(1, parseFloat(r.toFixed(4))));
}

/**
 * Fast Dynamic Time Warping (DTW) distance metric.
 * Returns normalized similarity score between 0.0 (dissimilar) and 1.0 (identical).
 */
export function calculateDtwSimilarity(seqA: number[], seqB: number[]): number {
  const n = seqA.length;
  const m = seqB.length;
  if (n === 0 || m === 0) return 0;

  const dtw: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(Infinity)
  );
  dtw[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = Math.abs(seqA[i - 1] - seqB[j - 1]);
      dtw[i][j] = cost + Math.min(
        dtw[i - 1][j],     // insertion
        dtw[i][j - 1],     // deletion
        dtw[i - 1][j - 1]  // match
      );
    }
  }

  const totalDistance = dtw[n][m] / (n + m);
  // Map distance to [0, 1] similarity score (decay factor 1.5)
  return parseFloat(Math.exp(-totalDistance * 1.5).toFixed(3));
}

/**
 * Stage 6: Calculate final composite confidence score.
 * Factors:
 * 1. Local sensor confidence
 * 2. Multi-car corroboration bonus (independent fleet vehicles)
 * 3. Cross-car waveform shape correlation
 * 4. Recency decay (half-life of 30 days)
 */
export function calculateCompositeConfidence(
  baseConfidence: number,
  independentVehiclesCount: number,
  correlationScore: number | null,
  reportDateStr?: string
): number {
  let score = baseConfidence;

  // 1. Independent vehicle corroboration weight
  if (independentVehiclesCount >= 2) score += 15;
  if (independentVehiclesCount >= 3) score += 10;
  if (independentVehiclesCount >= 5) score += 5;

  // 2. Shape correlation bonus
  if (correlationScore !== null && correlationScore > 0) {
    if (correlationScore >= 0.75) {
      score += 12;
    } else if (correlationScore >= MIN_CORRELATION_THRESHOLD) {
      score += 6;
    }
  }

  // 3. Recency decay (potholes reported months ago without recent confirmation decay)
  if (reportDateStr) {
    const reportTime = new Date(reportDateStr).getTime();
    if (!isNaN(reportTime)) {
      const ageDays = (Date.now() - reportTime) / (1000 * 60 * 60 * 24);
      if (ageDays > 30) {
        score -= Math.min(25, Math.floor((ageDays - 30) / 7));
      }
    }
  }

  return Math.max(10, Math.min(99, Math.round(score)));
}

export interface ConfirmationResult {
  matchedReport: Report | null;
  isConfirmed: boolean;
  correlationScore: number | null;
  updatedConfidence: number;
  isNewVehicle: boolean;
}

/**
 * Cross-Car Confirmation Engine:
 * Compares incoming candidate bump with existing active reports in the spatial cluster.
 */
export function processSpatialConfirmation(
  incoming: Partial<Report>,
  activeReports: Report[]
): ConfirmationResult {
  const inLat = incoming.latitude || 0;
  const inLon = incoming.longitude || 0;
  const inVehicle = incoming.vehicleRef || "UNKNOWN";
  const inSpeed = incoming.speed;
  const inWave = incoming.waveformData || null;
  const inBaseConfidence = incoming.confidence || 50;

  let bestMatch: Report | null = null;
  let minDistance = Infinity;

  // 1. Spatial clustering within epsilon (15m)
  for (const report of activeReports) {
    if (report.status === "resolved") continue;
    if (!report.latitude || !report.longitude) continue;

    const dist = haversineDistance(inLat, inLon, report.latitude, report.longitude);
    if (dist <= CLUSTER_EPSILON_METERS && dist < minDistance) {
      minDistance = dist;
      bestMatch = report;
    }
  }

  if (!bestMatch) {
    return {
      matchedReport: null,
      isConfirmed: false,
      correlationScore: null,
      updatedConfidence: inBaseConfidence,
      isNewVehicle: true,
    };
  }

  // Check if this vehicle has already reported
  const existingVehicles = bestMatch.reportingVehicles || [];
  const existingIds = existingVehicles.map((v: any) => typeof v === 'string' ? v : v.id).concat(bestMatch.vehicleRef);
  const isNewVehicle = !existingIds.includes(inVehicle);

  let correlationScore: number | null = bestMatch.correlationScore ?? null;

  // 2. Cross-car shape confirmation (if both have waveforms)
  if (inWave && inWave.length > 0 && bestMatch.waveformData && bestMatch.waveformData.length > 0) {
    const resampledIncoming = resampleByDistance(inWave, inSpeed);
    const resampledExisting = resampleByDistance(bestMatch.waveformData, bestMatch.speed);

    const r = pearsonCorrelation(resampledIncoming, resampledExisting);
    correlationScore = correlationScore !== null ? Math.max(correlationScore, r) : r;
  }

  // 3. Independent vehicle count
  const newVehiclesCount = isNewVehicle
    ? (bestMatch.independentReports || 1) + 1
    : (bestMatch.independentReports || 1);

  // 4. Confirmed status: >= 2 independent cars and either good correlation or 3+ independent cars
  const shapeConfirmed = correlationScore !== null && correlationScore >= MIN_CORRELATION_THRESHOLD;
  const isConfirmed = newVehiclesCount >= 2 && (shapeConfirmed || newVehiclesCount >= 3);

  // 5. Composite Confidence
  const updatedConfidence = calculateCompositeConfidence(
    Math.max(bestMatch.confidence, inBaseConfidence),
    newVehiclesCount,
    correlationScore,
    bestMatch.reportDate
  );

  return {
    matchedReport: bestMatch,
    isConfirmed,
    correlationScore,
    updatedConfidence,
    isNewVehicle,
  };
}
