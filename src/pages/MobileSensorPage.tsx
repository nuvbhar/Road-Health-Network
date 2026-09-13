import React, { useEffect, useState, useRef } from 'react';
import { requestSensorAccess, startSensorStream } from '../services/sensorBridge';
import { processSensorReading } from '../services/detectionEngine';
import { SensorReading } from '../store/types';
import { Button } from '../components/shared/Button';

export const MobileSensorPage: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Disconnected');
  const [lastEvent, setLastEvent] = useState<any>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Initialise WebSocket connection
    const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.host}`;
    const ws = new WebSocket(WS_URL.replace('/api', '') + '/ws');
    
    ws.onopen = () => {
      setStatus('Connected to Server');
      ws.send(JSON.stringify({ type: 'init', clientType: 'sensor' }));
    };
    
    ws.onclose = () => setStatus('Disconnected');
    ws.onerror = () => setStatus('Connection Error');
    wsRef.current = ws;

    return () => {
      ws.close();
      if (stopStreamRef.current) stopStreamRef.current();
    };
  }, []);

  const handleStart = async () => {
    const granted = await requestSensorAccess();
    if (!granted) {
      alert('Accelerometer access denied. Ensure you are on HTTPS and explicitly grant permissions if prompted.');
      return;
    }

    setIsActive(true);
    setStatus('Streaming Data...');

    // Callback that runs 30 times a second
    stopStreamRef.current = startSensorStream((reading: SensorReading) => {
      // 1. Send reading over WS
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'sensor:reading', data: reading }));
      }
      
      // 2. Process locally for events
      processSensorReading(reading, async (event) => {
        setLastEvent(event);
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'sensor:event', data: event }));
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
