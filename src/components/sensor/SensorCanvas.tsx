import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import styles from './SensorCanvas.module.css';

export const SensorCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reading = useAppStore(state => state.liveSensor.reading);
  const isConnected = useAppStore(state => state.liveSensor.connected);
  const event = useAppStore(state => state.liveSensor.event);
  
  // Keep a history buffer of the last 150 readings (~5 seconds at 30Hz)
  const historyRef = useRef<{ x: number, y: number, z: number }[]>(Array(150).fill({ x: 0, y: 0, z: 0 }));

  useEffect(() => {
    if (!reading) return;
    
    // Shift history left and add new reading
    historyRef.current.shift();
    historyRef.current.push(reading.accelerometer);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    } else {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Flash background if event recently detected
    if (event && event.timestamp && Date.now() - event.timestamp < 600) {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.1)'; // danger light
      ctx.fillRect(0, 0, rect.width, rect.height);
    }

    // Draw baseline
    const midY = rect.height / 2;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(rect.width, midY);
    ctx.strokeStyle = '#E2E8F0'; // --border-light
    ctx.lineWidth = 1;
    ctx.stroke();

    // Scale factor for G-forces (assuming max expected is ~4G)
    const scaleY = (val: number) => midY - (val * (rect.height / 8));
    const stepX = rect.width / 150;

    // Draw Z-axis (vertical bounce, most important for potholes)
    ctx.beginPath();
    historyRef.current.forEach((point, i) => {
      const x = i * stepX;
      // Z usually rests at 1G (gravity). Subtract 1 to center at 0.
      const y = scaleY(point.z - 1); 
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#3B82F6'; // --accent
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    // Draw Y-axis (braking/acceleration)
    ctx.beginPath();
    historyRef.current.forEach((point, i) => {
      const x = i * stepX;
      const y = scaleY(point.y); 
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#FCD34D'; // --warning-border
    ctx.lineWidth = 1.5;
    ctx.stroke();

  }, [reading]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>Accelerometer Stream</div>
        <div className={styles.status}>
          {isConnected ? (
            <><span className={styles.dotPulse}></span> Streaming 30Hz</>
          ) : (
            <><span className={styles.dotOffline}></span> Offline</>
          )}
        </div>
      </div>
      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}><span className={styles.legendZ}></span> Z-Axis (Vertical)</span>
        <span className={styles.legendItem}><span className={styles.legendY}></span> Y-Axis (Longitudinal)</span>
      </div>
    </div>
  );
};
