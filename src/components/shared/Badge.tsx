import React from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  variant?: 'ok' | 'warning' | 'danger' | 'info' | 'neutral';
  role?: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', role, children }) => {
  return (
    <span className={`${styles.badge} ${styles[variant]}`} role={role}>
      <span className={styles.dot}></span>
      {children}
    </span>
  );
};
