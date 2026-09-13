import React from 'react';
import { NavLink } from 'react-router-dom';
import { TabNav } from './TabNav';
import { ActivityIcon } from '../shared/Icons';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.branding}>
          <div className={styles.logo}></div>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>Road Health Network</h1>
          </div>
        </div>
        <TabNav />
      </div>
      <div className={styles.right}>
        <NavLink 
          to="/live-sensor" 
          className={({ isActive }) => `${styles.debugLink} ${isActive ? styles.active : ''}`}
          title="Debug Live Sensor"
        >
          <ActivityIcon width={20} height={20} />
          <span>Live Sensor (Debug)</span>
        </NavLink>
      </div>
    </header>
  );
};
