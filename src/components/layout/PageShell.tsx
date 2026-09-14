import React from "react";
import styles from "./PageShell.module.css";
import { DebugMenu } from "./DebugMenu";

interface PageShellProps {
  children: React.ReactNode;
}

export const PageShell: React.FC<PageShellProps> = ({ children }) => {
  return (
    <main className={styles.main}>
      <div className={styles.container}>{children}</div>
      <DebugMenu />
    </main>
  );
};
