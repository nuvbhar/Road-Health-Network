import { supabase } from "./supabaseClient";

export function connectToBackend(storeActions: any): () => void {
  console.info("[Supabase] Subscribing to realtime database changes...");

  const channel = supabase
    .channel("schema-db-changes")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "reports" },
      (payload) => {
        console.log("[Supabase] New report detected:", payload.new);
        storeActions.loadInitialData();
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "reports" },
      (payload) => {
        console.log("[Supabase] Report updated:", payload.new);
        storeActions.loadInitialData();
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.info("[Supabase] Connected to realtime stream");
      }
    });

  // Note: Local sensor readings and events (like sensor:reading and sensor:event)
  // are handled via WebRTC (PeerJS) in MobileSensorPage.tsx and LiveSensorPage.tsx.
  // The global WebSocket is now purely for database state changes via Supabase.

  return () => {
    supabase.removeChannel(channel);
  };
}
