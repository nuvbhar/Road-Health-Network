import { SensorReading } from "../store/types";

export interface PermissionsStatus {
  accelerometer: boolean;
  gyroscope: boolean;
  gps: boolean;
}

export async function requestSensorAccess(): Promise<PermissionsStatus> {
  const status: PermissionsStatus = {
    accelerometer: false,
    gyroscope: false,
    gps: false,
  };

  if (
    typeof (DeviceMotionEvent as any) !== "undefined" &&
    typeof (DeviceMotionEvent as any).requestPermission === "function"
  ) {
    try {
      const permissionState = await (DeviceMotionEvent as any).requestPermission();
      if (permissionState === "granted") {
        status.accelerometer = true;
        status.gyroscope = true;
      }
    } catch (err) {
      console.error(err);
    }
  } else {
    // Non-iOS 13+ generally do not require explicit prompt for motion
    status.accelerometer = true;
    status.gyroscope = true;
  }

  if ("geolocation" in navigator) {
    try {
      const gpsGranted = await new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          (err) => {
            console.warn("GPS request failed or denied", err);
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });
      status.gps = gpsGranted;
    } catch (e) {
      console.error(e);
    }
  }

  return status;
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
