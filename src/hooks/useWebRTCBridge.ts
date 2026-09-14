import { useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import { useAppStore } from "../store/useAppStore";
import { processSensorReading } from "../services/detectionEngine";

export function useWebRTCBridge(setActiveDevice: (device: string | null) => void) {
  const [peerId, setPeerId] = useState<string | undefined>(undefined);
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    const peer = new Peer();
    peer.on("open", (id) => {
      console.log("PeerJS ID:", id);
      setPeerId(id);
    });

    peer.on("connection", (conn) => {
      console.log("Mobile device connected via WebRTC");
      setActiveDevice("External Mobile Device (WebRTC)");

      conn.on("data", (data: any) => {
        if (data && data.type === "sensor:reading") {
          useAppStore.getState().setSensorReading(data.data);
          processSensorReading(
            data.data,
            () => {}, // Ignore local classification for remote data since remote device sends 'sensor:event'
            useAppStore.getState().setEngineMetrics,
          );
        } else if (data && data.type === "sensor:event") {
          useAppStore.getState().enqueueSensorEvent(data.data);
        }
      });

      conn.on("close", () => {
        setActiveDevice(null);
      });
    });

    peerRef.current = peer;

    return () => {
      peer.destroy();
    };
  }, [setActiveDevice]);

  return { peerId };
}
