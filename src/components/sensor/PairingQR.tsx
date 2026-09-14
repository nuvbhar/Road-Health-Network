import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";

interface PairingQRProps {
  peerId?: string;
}

export const PairingQR: React.FC<PairingQRProps> = ({ peerId }) => {
  const [url, setUrl] = useState("");

  useEffect(() => {
    // Generate the correct URL for BrowserRouter with basename /Road-Health-Network/
    const origin = window.location.origin;
    const target = `${origin}/Road-Health-Network/sensor`;
    setUrl(peerId ? `${target}?peer=${peerId}` : target);
  }, [peerId]);

  if (!url) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        height: "100%",
        boxSizing: "border-box",
        padding: "var(--space-8)",
        backgroundColor: "var(--bg-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-light)",
        boxShadow:
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          textAlign: "left",
          marginBottom: "var(--space-4)",
        }}
      >
        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            marginBottom: "var(--space-2)",
          }}
        >
          Option 2: Connect External Mobile
        </h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
          Scan this QR code with a mobile phone to stream its accelerometer data
          directly to this dashboard over WebRTC.
        </p>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid var(--border-default)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              filter: peerId ? "none" : "blur(8px)",
              opacity: peerId ? 1 : 0.4,
              transition: "filter 0.5s ease, opacity 0.5s ease",
            }}
          >
            <QRCode value={url} size={160} />
          </div>
          {!peerId && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255, 255, 255, 0.6)",
                backdropFilter: "blur(2px)",
              }}
            >
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  backgroundColor: "var(--bg-surface)",
                  padding: "var(--space-2) var(--space-4)",
                  borderRadius: "var(--radius-full)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                Generating P2P...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
