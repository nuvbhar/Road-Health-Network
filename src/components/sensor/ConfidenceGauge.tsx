import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import styles from './ConfidenceGauge.module.css';

export const ConfidenceGauge: React.FC = () => {
  const event = useAppStore(state => state.liveSensor.event);
  
  const confidence = event?.confidence || 0;
  
  // Calculate arc for an SVG doughnut chart (semi-circle)
  const radius = 60;
  const circumference = radius * Math.PI;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  let colour = 'var(--text-muted)';
  if (confidence > 80) colour = 'var(--colour-danger)';
  else if (confidence > 50) colour = 'var(--colour-warning)';
  else if (confidence > 0) colour = 'var(--colour-ok)';

  return (
    <div className={styles.container} aria-live="assertive">
      <h3 className={styles.title}>Event Confidence</h3>
      <div className={styles.gaugeWrapper}>
        <svg width="200" height="110" viewBox="0 0 200 110" className={styles.svg}>
          {/* Background arc */}
          <path 
            d="M 20 100 A 80 80 0 0 1 180 100" 
            fill="none" 
            stroke="var(--bg-inset)" 
            strokeWidth="16" 
            strokeLinecap="round" 
          />
          {/* Foreground arc */}
          <path 
            d="M 20 100 A 80 80 0 0 1 180 100" 
            fill="none" 
            stroke={colour} 
            strokeWidth="16" 
            strokeLinecap="round" 
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={styles.arc}
            style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.3s' }}
          />
        </svg>
        <div className={styles.valueDisplay}>
          <span className={styles.value} style={{ color: colour }}>{confidence}%</span>
          <span className={styles.label}>Probability</span>
        </div>
      </div>
      
      <div className={styles.info}>
        Confidence is calculated using vertical G-force magnitude, impact duration, and matching signatures to known defect profiles.
      </div>
    </div>
  );
};
