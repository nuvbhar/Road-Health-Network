export async function getCurrentPosition(): Promise<{
  latitude: number;
  longitude: number;
}> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      // Fallback
      resolve({ latitude: 30.758, longitude: 76.608 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Coarsen to 3 decimal places (~100m precision) for privacy
        const latitude = parseFloat(position.coords.latitude.toFixed(3));
        const longitude = parseFloat(position.coords.longitude.toFixed(3));
        resolve({ latitude, longitude });
      },
      () => {
        // Fallback
        resolve({ latitude: 30.758, longitude: 76.608 });
      },
      { enableHighAccuracy: false, maximumAge: 10000, timeout: 5000 },
    );
  });
}
