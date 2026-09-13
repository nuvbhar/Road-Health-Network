import React from 'react';

import styles from './PrivacyPanel.module.css';
import { CheckCircleIcon, XIcon } from '../shared/Icons';

export const PrivacyPanel: React.FC = () => {
  

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Data Privacy Policy</h3>
      
      <ul className={styles.list}>
        <li className={styles.listItem}>
          <CheckCircleIcon color="var(--colour-ok)" width={18} height={18} />
          <span>Only structural anomaly events are transmitted.</span>
        </li>
        <li className={styles.listItem}>
          <CheckCircleIcon color="var(--colour-ok)" width={18} height={18} />
          <span>Vehicle IDs are cryptographically hashed and rotated hourly.</span>
        </li>
        <li className={styles.listItem}>
          <XIcon color="var(--colour-danger)" width={18} height={18} />
          <span>No continuous location tracking.</span>
        </li>
        <li className={styles.listItem}>
          <XIcon color="var(--colour-danger)" width={18} height={18} />
          <span>No personal identifiable information (PII) leaves the device.</span>
        </li>
      </ul>

      <div className={styles.statusBox}>
        <div className={styles.statusLabel}>Raw Data Sharing:</div>
        <div className={styles.statusValue}>Disabled (Default)</div>
      </div>
    </div>
  );
};
