import React from 'react';
import { Badge } from '../shared/Badge';
import { TabNav } from './TabNav';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.branding}>
          <div className={styles.logo}></div>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>Road Health Network</h1>
            <span className={styles.subtitle}>Government Road Intelligence</span>
          </div>
        </div>
        <TabNav />
      </div>
      <div className={styles.right}>
        <Badge variant="ok" role="status">System Online</Badge>
        <span className={styles.timestamp}>Last updated: {new Date().toLocaleTimeString()}</span>
      </div>
    </header>
  );
};
