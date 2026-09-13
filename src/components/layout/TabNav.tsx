import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './TabNav.module.css';

export const TabNav: React.FC = () => {
  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <NavLink to="/" className={({ isActive }) => isActive ? styles.active : styles.link} end>
          Overview
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => isActive ? styles.active : styles.link}>
          Reports
        </NavLink>
        <NavLink to="/live-sensor" className={({ isActive }) => isActive ? styles.active : styles.link}>
          Live Sensor
        </NavLink>
      </div>
    </nav>
  );
};
