import React, { useEffect, useState, useRef } from 'react';
import { requestSensorAccess, startSensorStream } from '../services/sensorBridge';
import { processSensorReading } from '../services/detectionEngine';
import { SensorReading } from '../store/types';
import { Button } from '../components/shared/Button';
import { useSearchParams } from 'react-router-dom';
import Peer, { DataConnection } from 'peerjs';

export const MobileSensorPage: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Disconnected');
  const [lastEvent, setLastEvent] = useState<any>(null);
  const [searchParams] = useSearchParams();
  
  const peerConnRef = useRef<DataConnection | null>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const targetPeerId = searchParams.get('peer');
    
    if (targetPeerId) {
      setStatus('Connecting to Dashboard (WebRTC)...');
      const peer = new Peer();
      
      peer.on('open', () => {
        const conn = peer.connect(targetPeerId);
        
        conn.on('open', () => {
          setStatus('Connected (P2P)');
          peerConnRef.current = conn;
        });
        
        conn.on('close', () => setStatus('Disconnected (P2P)'));
        conn.on('error', (err) => setStatus(`P2P Error: ${err.message}`));
      });
      
      return () => {
        peer.destroy();
        if (stopStreamRef.current) stopStreamRef.current();
      };
    } else {
      setStatus('No P2P target provided');
    }
  }, [searchParams]);

  const handleStart = async () => {
    const granted = await requestSensorAccess();
    if (!granted) {
      alert('Accelerometer access denied. Ensure you are on HTTPS and explicitly grant permissions if prompted.');
      return;
    }

    setIsActive(true);
    setStatus('Streaming Data (P2P)...');

    // Callback that runs 30 times a second
    stopStreamRef.current = startSensorStream((reading: SensorReading) => {
      // 1. Send reading over P2P
      if (peerConnRef.current?.open) {
        peerConnRef.current.send({ type: 'sensor:reading', data: reading });
      }
      
      // 2. Process locally for events
      processSensorReading(reading, async (event) => {
        setLastEvent(event);
        if (peerConnRef.current?.open) {
          peerConnRef.current.send({ type: 'sensor:event', data: event });
        }

        // Post to backend
        try {
          const { getCurrentPosition } = await import('../services/geolocation');
          const coords = await getCurrentPosition();
          
          await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: event.type,
              confidence: event.confidence,
              latitude: coords.latitude,
              longitude: coords.longitude,
              vehicleRef: 'V-MOBILE-NODE'
            })
          });
        } catch (err) {
          console.error('Failed to post report:', err);
        }
      });
    });
  };

  const handleStop = () => {
    if (stopStreamRef.current) stopStreamRef.current();
    stopStreamRef.current = null;
    setIsActive(false);
    setStatus('Connected to Server (Paused)');
  };

  return (
    <div style={{ padding: 'var(--space-6)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-default)' }}>
      <h1 style={{ fontSize: 'var(--type-heading)', marginBottom: 'var(--space-2)' }}>Mobile Sensor</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)', textAlign: 'center' }}>
        Status: <strong style={{ color: isActive ? 'var(--colour-ok)' : 'var(--text-primary)' }}>{status}</strong>
      </p>

      {!isActive ? (
        <Button onClick={handleStart} variant="primary" style={{ padding: 'var(--space-4) var(--space-8)', fontSize: 'var(--type-large)' }}>
          Start Sensor Stream
        </Button>
      ) : (
        <Button onClick={handleStop} variant="danger" style={{ padding: 'var(--space-4) var(--space-8)', fontSize: 'var(--type-large)' }}>
          Stop Sensor Stream
        </Button>
      )}

      {lastEvent && (
        <div style={{ marginTop: 'var(--space-8)', padding: 'var(--space-4)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '300px' }}>
          <h3 style={{ marginBottom: 'var(--space-2)' }}>Latest Event</h3>
          <p><strong>Type:</strong> {lastEvent.type}</p>
          <p><strong>Confidence:</strong> {lastEvent.confidence}%</p>
          <p><strong>Time:</strong> {new Date(lastEvent.timestamp).toLocaleTimeString()}</p>
        </div>
      )}
    </div>
  );
};
