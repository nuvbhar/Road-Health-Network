import React from "react";

import styles from "./PrivacyPanel.module.css";
import { ShieldCheckIcon } from "../shared/Icons";

export const PrivacyPanel: React.FC = () => {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Data Privacy Policy</h3>

      <ul className={styles.list}>
        <li className={styles.listItem}>
          <ShieldCheckIcon color="var(--colour-ok)" width={18} height={18} />
          <span>Only structural anomaly events are transmitted.</span>
        </li>
        <li className={styles.listItem}>
          <ShieldCheckIcon color="var(--colour-ok)" width={18} height={18} />
          <span>
            Vehicle IDs are cryptographically hashed and rotated hourly.
          </span>
        </li>
        <li className={styles.listItem}>
          <ShieldCheckIcon color="var(--colour-ok)" width={18} height={18} />
          <span>Location tracking is strictly on-demand for events.</span>
        </li>
        <li className={styles.listItem}>
          <ShieldCheckIcon color="var(--colour-ok)" width={18} height={18} />
          <span>All PII remains securely processed on-device.</span>
        </li>
      </ul>
    </div>
  );
};
