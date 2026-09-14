import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { TabNav } from "./TabNav";
import { ActivityIcon, CarAndRoadIcon } from "../shared/Icons";
import styles from "./Header.module.css";

export const Header: React.FC = () => {
  const location = useLocation();
  const isMobileSensorPage = location.pathname === "/sensor";

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.branding}>
          <div className={styles.logo}>
            <CarAndRoadIcon width={20} height={20} color="white" />
          </div>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>Road Health Network</h1>
          </div>
        </div>
        {!isMobileSensorPage && <TabNav />}
      </div>
      <div className={styles.right}>
        {!isMobileSensorPage && (
          <NavLink
            to="/live-sensor"
            className={({ isActive }) =>
              `${styles.debugLink} ${isActive ? styles.active : ""}`
            }
            title="Debug Live Sensor"
          >
            <ActivityIcon width={20} height={20} />
            <span>Live Sensor (Debug)</span>
          </NavLink>
        )}
      </div>
    </header>
  );
};
