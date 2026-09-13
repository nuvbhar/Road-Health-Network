import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';

export const PairingQR: React.FC = () => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    // Generate the correct URL depending on whether we are using HashRouter or base paths
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    // Ensure we point to the #/sensor route regardless of current hash
    setUrl(`${origin}${pathname}#/sensor`);
  }, []);

  if (!url) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 'var(--space-6)',
      backgroundColor: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-default)',
      textAlign: 'center'
    }}>
      <h3 style={{ marginBottom: 'var(--space-2)' }}>Connect a Sensor</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', fontSize: 'var(--type-small)' }}>
        Scan this QR code with a mobile phone to stream its accelerometer data directly to this dashboard.
      </p>
      
      <div style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
        <QRCode value={url} size={150} />
      </div>
      
      <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--type-caption)', color: 'var(--text-muted)' }}>
        {url}
      </p>
    </div>
  );
};
