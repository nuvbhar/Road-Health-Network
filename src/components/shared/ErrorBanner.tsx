import React from "react";

interface ErrorBannerProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message = "An error occurred while loading data.",
  onRetry,
}) => {
  return (
    <div
      style={{
        backgroundColor: "var(--colour-danger-muted)",
        border: "1px solid var(--colour-danger)",
        color: "var(--colour-danger)",
        padding: "var(--space-4)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        margin: "var(--space-4) 0",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
      >
        <span style={{ fontSize: "1.2rem" }}>⚠</span>
        <span style={{ fontWeight: 500 }}>{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            backgroundColor: "transparent",
            border: "1px solid var(--colour-danger)",
            color: "var(--colour-danger)",
            padding: "4px 12px",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
};
