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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (reading) {
      historyRef.current.shift();
      historyRef.current.push(reading.accelerometer);
    }

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

    if (event && event.timestamp && Date.now() - event.timestamp < 600) {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.1)';
      ctx.fillRect(0, 0, rect.width, rect.height);
    }

    // Gridlines
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    const gridSpacingY = rect.height / 4;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * gridSpacingY);
      ctx.lineTo(rect.width, i * gridSpacingY);
      ctx.stroke();
    }
    
    const gridSpacingX = rect.width / 10;
    for (let i = 1; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(i * gridSpacingX, 0);
      ctx.lineTo(i * gridSpacingX, rect.height);
      ctx.stroke();
    }

    // Zero-Baseline (Center)
    const midY = rect.height / 2;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(rect.width, midY);
    ctx.strokeStyle = '#CBD5E1'; // slightly darker for zero line
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const scaleY = (val: number) => midY - (val * (rect.height / 8));
    const stepX = rect.width / 150;

    // Y-axis (Longitudinal)
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

    // Z-axis (Vertical)
    ctx.beginPath();
    historyRef.current.forEach((point, i) => {
      const x = i * stepX;
      const y = scaleY(point.z - 1); 
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#3B82F6'; // --accent
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

  }, [reading, event]); // Also depend on event for flash

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>Accelerometer Stream</div>
        <div className={styles.status}>
          {isConnected && (
            <><span className={styles.dotPulse}></span> Streaming 30Hz</>
          )}
        </div>
      </div>
      <div className={styles.canvasWrapper}>
        {!isConnected && (
          <div className={styles.idleOverlay}>Waiting for data...</div>
        )}
        <canvas 
          ref={canvasRef} 
          className={styles.canvas} 
          style={{
            filter: isConnected ? 'none' : 'blur(4px)',
            opacity: isConnected ? 1 : 0.4,
            transition: 'filter 0.5s ease, opacity 0.5s ease'
          }}
        />
        <div className={styles.legend}>
          <span className={styles.legendItem}><span className={styles.legendZ}></span> Z-Axis (Vertical)</span>
          <span className={styles.legendItem}><span className={styles.legendY}></span> Y-Axis (Longitudinal)</span>
        </div>
      </div>
    </div>
  );
};
