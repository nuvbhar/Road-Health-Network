import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { SensorCanvas } from '../components/sensor/SensorCanvas';
import { TransmissionPipeline } from '../components/pipeline/TransmissionPipeline';
import { PrivacyPanel } from '../components/privacy/PrivacyPanel';
import { ConfidenceGauge } from '../components/sensor/ConfidenceGauge';
import { PairingQR } from '../components/sensor/PairingQR';
import { SmartphoneIcon } from '../components/shared/Icons';

export const LiveSensorPage: React.FC = () => {
  const [activeDevice, setActiveDevice] = useState<string | null>(null);

  // When a sensor connects or sends data, it updates the liveSensor store.
  // The 'connected' boolean is unfortunately not auto-toggled by ws.ts for just ANY client yet,
  // but if we receive a reading, we know it's connected.
  const reading = useAppStore(state => state.liveSensor.reading);
  
  useEffect(() => {
    if (reading && !activeDevice) {
      setActiveDevice('Mobile Sensor Node');
    }
  }, [reading, activeDevice]);

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
        </div>

        <div style={{ width: '320px', flexShrink: 0 }}>
          <PairingQR />
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
