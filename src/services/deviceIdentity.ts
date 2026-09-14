import { supabase } from "./supabaseClient";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "V-UNKNOWN";
  
  let deviceId = localStorage.getItem("rhn_device_id");
  if (!deviceId) {
    // Generate a readable ID for hackathon demos (e.g. V-847291)
    deviceId = "V-" + Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem("rhn_device_id", deviceId);
  }
  return deviceId;
}

export async function registerDevice(sectorId: string = "SEC-A") {
  const deviceId = getOrCreateDeviceId();
  
  try {
    const { error } = await supabase
      .from("vehicles")
      .upsert(
        {
          id: deviceId,
          sectorId,
          status: "active",
          lastSeenAt: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      
    if (error) {
      console.warn("[Device Identity] Failed to register device:", error);
    }
  } catch (e) {
    console.error("[Device Identity] Exception registering device:", e);
  }
  
  return deviceId;
}
