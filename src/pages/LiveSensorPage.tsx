import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { SensorCanvas } from '../components/sensor/SensorCanvas';
import { TransmissionPipeline } from '../components/pipeline/TransmissionPipeline';
import { PrivacyPanel } from '../components/privacy/PrivacyPanel';
import { ConfidenceGauge } from '../components/sensor/ConfidenceGauge';
import { PairingQR } from '../components/sensor/PairingQR';
import { SmartphoneIcon } from '../components/shared/Icons';
import { Button } from '../components/shared/Button';
import { requestSensorAccess, startSensorStream } from '../services/sensorBridge';
import { processSensorReading } from '../services/detectionEngine';
import Peer from 'peerjs';

export const LiveSensorPage: React.FC = () => {
  const [activeDevice, setActiveDevice] = useState<string | null>(null);
  const [localActive, setLocalActive] = useState(false);
  const [peerId, setPeerId] = useState<string | undefined>(undefined);
  const stopStreamRef = useRef<(() => void) | null>(null);
  const peerRef = useRef<Peer | null>(null);
  
  const setSensorReading = useAppStore(state => state.setSensorReading);
  const setSensorEvent = useAppStore(state => state.setSensorEvent);

  const reading = useAppStore(state => state.liveSensor.reading);
  
  useEffect(() => {
    if (reading && !activeDevice) {
      setActiveDevice(localActive ? 'This Device (Local)' : 'External Sensor Node (P2P)');
    }
  }, [reading, activeDevice, localActive]);

  useEffect(() => {
    // Initialize PeerJS for static P2P receiving
    const peer = new Peer();
    peer.on('open', (id) => {
      console.log('PeerJS ID:', id);
      setPeerId(id);
    });

    peer.on('connection', (conn) => {
      console.log('Mobile device connected via WebRTC');
      setActiveDevice('External Mobile Device (WebRTC)');
      
      conn.on('data', (data: any) => {
        if (data && data.type === 'sensor:reading') {
          setSensorReading(data.data);
        } else if (data && data.type === 'sensor:event') {
          setSensorEvent(data.data);
        }
      });
      
      conn.on('close', () => {
        setActiveDevice(null);
      });
    });

    peerRef.current = peer;

    return () => {
      peer.destroy();
      if (stopStreamRef.current) stopStreamRef.current();
    };
  }, [setSensorReading, setSensorEvent]);

  const handleLocalToggle = async () => {
    if (localActive) {
      if (stopStreamRef.current) stopStreamRef.current();
      stopStreamRef.current = null;
      setLocalActive(false);
      setActiveDevice(null);
    } else {
      const granted = await requestSensorAccess();
      if (!granted) {
        alert("Accelerometer access denied. Please grant permission.");
        return;
      }
      setLocalActive(true);
      setActiveDevice('This Device (Local)');
      
      stopStreamRef.current = startSensorStream((r) => {
        setSensorReading(r);
        processSensorReading(r, setSensorEvent);
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <h1 className="sr-only">Live Sensor</h1>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-6)' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h2 style={{ fontSize: 'var(--type-heading)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
            Live Sensor Telemetry
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            Stream raw accelerometer data and detect anomalies in real time from an external device.
          </p>

          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-4)',
            backgroundColor: activeDevice ? 'rgba(22, 163, 74, 0.1)' : 'var(--bg-elevated)',
            border: `1px solid ${activeDevice ? 'var(--colour-ok)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)',
            color: activeDevice ? 'var(--colour-ok)' : 'var(--text-secondary)'
          }}>
            <SmartphoneIcon width={20} height={20} />
            <span style={{ fontWeight: 500 }}>
              {activeDevice ? `Connected: ${activeDevice}` : 'No active sensor devices'}
            </span>
          </div>

          <div style={{ marginTop: 'var(--space-4)' }}>
            <Button variant={localActive ? "danger" : "secondary"} onClick={handleLocalToggle}>
              {localActive ? "Stop Local Test" : "Test on this device"}
            </Button>
            <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--type-caption)', color: 'var(--text-muted)' }}>
              Useful if you are visiting this dashboard directly from a mobile device without a backend server.
            </p>
          </div>
        </div>

        <div style={{ width: '320px', flexShrink: 0 }}>
          <PairingQR peerId={peerId} />
        </div>
      </div>

      <SensorCanvas />
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
        <ConfidenceGauge />
        <PrivacyPanel />
      </div>

      <TransmissionPipeline />
    </div>
  );
};
