import React, { useEffect, useState, useRef } from 'react';
import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  accentColour: 'info' | 'warning' | 'danger' | 'ok';
}

export const StatCard: React.FC<StatCardProps> = React.memo(({ label, value, icon: Icon, accentColour }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const prevValueRef = useRef(0);

  useEffect(() => {
    // Determine if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const start = prevValueRef.current;
    const end = value;
    if (start === end) return;

    const duration = 800; // ms
    const startTime = performance.now();

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    let animationFrame: number;
    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      if (elapsed < duration) {
        const progress = easeOut(elapsed / duration);
        setDisplayValue(Math.floor(start + (end - start) * progress));
        animationFrame = requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(end);
        prevValueRef.current = end;
      }
    };

    animationFrame = requestAnimationFrame(updateCounter);
    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  return (
    <div 
      className={`${styles.card} ${styles[accentColour]} ${isHovered ? styles.hover : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={styles.iconWrapper}>
        <Icon className={styles.icon} />
      </div>
      <div className={styles.content}>
        <div className={styles.value}>{displayValue}</div>
        <div className={styles.label}>{label}</div>
      </div>
    </div>
  );
});
