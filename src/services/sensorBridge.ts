import { SensorReading } from "../store/types";

export function requestSensorAccess(): Promise<boolean> {
  return new Promise((resolve) => {
    if (
      typeof (DeviceMotionEvent as any) !== "undefined" &&
      typeof (DeviceMotionEvent as any).requestPermission === "function"
    ) {
      (DeviceMotionEvent as any)
        .requestPermission()
        .then((permissionState: string) => {
          if (permissionState === "granted") {
            resolve(true);
          } else {
            resolve(false);
          }
        })
        .catch(console.error);
    } else {
      // Non-iOS 13+ devices
      resolve(true);
    }
  });
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

  const handleMotion = (event: DeviceMotionEvent) => {
    const now = performance.now();
    if (now - lastCall < throttleMs) return;
    lastCall = now;

    // Normalise to g-force if not already
    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc) return;

    // For iOS, rotationRate is typically in degrees, Android is sometimes radians.
    // This is a prototype so we take values as is.
    const rot = event.rotationRate;

    onReading({
      accelerometer: {
        x: (acc.x || 0) / 9.81,
        y: (acc.y || 0) / 9.81,
        z: (acc.z || 0) / 9.81,
      },
      gyroscope: {
        x: rot?.alpha || 0,
        y: rot?.beta || 0,
        z: rot?.gamma || 0,
      },
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
