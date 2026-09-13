import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { CheckCircleIcon, AlertTriangleIcon } from '../shared/Icons';
import styles from './TransmissionPipeline.module.css';

export const TransmissionPipeline: React.FC = () => {
  const event = useAppStore(state => state.liveSensor.event);
  const stage = useAppStore(state => state.transmission.stage);
  const setTransmissionStage = useAppStore(state => state.setTransmissionStage);
  
  // Pipeline automation mock
  useEffect(() => {
    if (event && event.detected && stage === 'idle') {
      setTransmissionStage('processing');
      
      // Encrypting...
      setTimeout(() => {
        setTransmissionStage('transmitted');
        
        // Finalised
        setTimeout(() => {
          setTransmissionStage('confirmed');
          
          // We no longer emit the report here, the mobile sensor does it directly.
          // This pipeline is now purely a visual reflection of the transmission process.
          
          // Reset after a while
          setTimeout(() => {
            setTransmissionStage('idle');
            useAppStore.getState().setSensorEvent(null);
          }, 4000);
          
        }, 1200);
      }, 1500);
    }
  }, [event, stage, setTransmissionStage]);

  if (stage === 'idle') {
    return (
      <div className={styles.containerEmpty}>
        <div className={styles.emptyText}>Awaiting anomaly detection...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <AlertTriangleIcon color="var(--colour-danger)" />
        <span className={styles.headerTitle}>Anomaly Detected: {event?.type?.replace(/_/g, ' ')}</span>
        <span className={styles.headerConf}>{event?.confidence}% Confidence</span>
      </div>
      
      <div className={styles.pipeline}>
        <div className={styles.node}>
          <div className={styles.iconActive}>1</div>
          <div className={styles.nodeLabel}>Capture</div>
        </div>
        
        <div className={styles.lineActive} />
        
        <div className={styles.node}>
          <div className={stage === 'processing' ? styles.iconPulse : styles.iconActive}>2</div>
          <div className={styles.nodeLabel}>{stage === 'processing' ? 'Encrypting...' : 'Encrypted'}</div>
        </div>
        
        <div className={stage === 'processing' ? styles.linePending : styles.lineActive} />
        
        <div className={styles.node}>
          <div className={stage === 'processing' || stage === 'transmitted' ? (stage === 'processing' ? styles.iconPending : styles.iconPulse) : styles.iconActive}>3</div>
          <div className={styles.nodeLabel}>{stage === 'transmitted' ? 'Transmitting...' : (stage === 'confirmed' ? 'Transmitted' : 'Pending')}</div>
        </div>
        
        <div className={stage === 'confirmed' ? styles.lineActive : styles.linePending} />
        
        <div className={styles.node}>
          <div className={stage === 'confirmed' ? styles.iconOk : styles.iconPending}>
            {stage === 'confirmed' ? <CheckCircleIcon width={16} height={16} /> : '4'}
          </div>
          <div className={styles.nodeLabel}>{stage === 'confirmed' ? 'Dashboard Confirmed' : 'Pending Auth'}</div>
        </div>
      </div>
    </div>
  );
};
