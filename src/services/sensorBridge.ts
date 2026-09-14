import { SensorReading } from "../store/types";

export interface PermissionsStatus {
  accelerometer: boolean;
  gyroscope: boolean;
  gps: boolean;
}

export async function requestMotionAccess(): Promise<boolean> {
  if (typeof (window as any).DeviceMotionEvent === "undefined") {
    return false; // No motion sensor support (e.g., desktop)
  }

  if (typeof (window as any).DeviceMotionEvent.requestPermission === "function") {
    try {
      const permissionState = await (window as any).DeviceMotionEvent.requestPermission();
      return permissionState === "granted";
    } catch (err) {
      console.error(err);
      return false;
    }
  }
  
  // Non-iOS 13+ mobile devices
  return true;
}

export async function requestGpsAccess(): Promise<boolean> {
  if ("geolocation" in navigator) {
    try {
      return await new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          (err) => {
            console.warn("GPS request failed or denied", err);
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });
    } catch (e) {
      console.error(e);
      return false;
    }
  }
  return false;
}

export async function requestSensorAccess(): Promise<PermissionsStatus> {
  const motionGranted = await requestMotionAccess();
  const gpsGranted = await requestGpsAccess();

  return {
    accelerometer: motionGranted,
    gyroscope: motionGranted,
    gps: gpsGranted,
  };
}

export function startSensorStream(
  onReading: (r: SensorReading) => void,
): () => void {
  let lastCall = 0;
  const throttleMs = 33; // ~30Hz

  let currentSpeed: number | null = null;
  let currentLat: number | undefined;
  let currentLng: number | undefined;
  let watchId: number | null = null;

  if ("geolocation" in navigator) {
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // speed is in meters per second
        currentSpeed = pos.coords.speed;
        currentLat = pos.coords.latitude;
        currentLng = pos.coords.longitude;
      },
      () => {}, // ignore errors for now
      { enableHighAccuracy: true },
    );
  }

  let currentGyro = { x: 0, y: 0, z: 0 };
  let lastGyroCall = 0;
  const gyroThrottleMs = 150; // Slower poll rate for gyroscope

  const handleMotion = (event: DeviceMotionEvent) => {
    const now = performance.now();
    if (now - lastCall < throttleMs) return;
    lastCall = now;

    // Normalise to g-force if not already
    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc) return;

    const rot = event.rotationRate;
    if (rot && now - lastGyroCall > gyroThrottleMs) {
      currentGyro = {
        x: rot.alpha || 0,
        y: rot.beta || 0,
        z: rot.gamma || 0,
      };
      lastGyroCall = now;
    }

    onReading({
      accelerometer: {
        x: (acc.x || 0) / 9.81,
        y: (acc.y || 0) / 9.81,
        z: (acc.z || 0) / 9.81,
      },
      gyroscope: currentGyro,
      gps: {
        speed: currentSpeed,
        latitude: currentLat,
        longitude: currentLng,
      },
    });
  };

  window.addEventListener("devicemotion", handleMotion);

  return () => {
    window.removeEventListener("devicemotion", handleMotion);
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  };
}
