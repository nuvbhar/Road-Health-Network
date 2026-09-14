import { useEffect, useRef, useState } from "react";
import Peer, { DataConnection } from "peerjs";
import { useAppStore } from "../store/useAppStore";
import { processSensorReading } from "../services/detectionEngine";

export function useWebRTCBridge(setActiveDevice: (device: string | null) => void) {
  const [peerId, setPeerId] = useState<string | undefined>(undefined);
  const peerRef = useRef<Peer | null>(null);

  const connRef = useRef<DataConnection | null>(null);

  useEffect(() => {
    const peer = new Peer();
    peer.on("open", (id) => {
      console.log("PeerJS ID:", id);
      setPeerId(id);
    });

    peer.on("connection", (conn) => {
      console.log("Mobile device connected via WebRTC");
      connRef.current = conn;
      setActiveDevice("External Mobile Device (WebRTC)");

      conn.on("data", (data: any) => {
        if (data && data.type === "sensor:reading") {
          useAppStore.getState().setSensorReading(data.data);
          processSensorReading(
            data.data,
            () => {},
            useAppStore.getState().setEngineMetrics,
          );
        } else if (data && data.type === "sensor:event") {
          useAppStore.getState().enqueueSensorEvent(data.data);
        }
      });

      conn.on("close", () => {
        setActiveDevice(null);
        connRef.current = null;
      });
    });

    peerRef.current = peer;

    return () => {
      peer.destroy();
    };
  }, [setActiveDevice]);

  const disconnectMobile = () => {
    if (connRef.current) {
      connRef.current.close();
    }
  };

  return { peerId, disconnectMobile };
}
