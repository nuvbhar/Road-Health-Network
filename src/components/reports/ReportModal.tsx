import React from 'react';
import { Report } from '../../store/types';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { XIcon, MapIcon, ClockIcon, TruckIcon } from '../shared/Icons';
import { useAppStore } from '../../store/useAppStore';
import { REPORT_TYPES } from '../../services/reportTypes';
import styles from './ReportModal.module.css';

interface ReportModalProps {
  report: Report;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ report, onClose }) => {
  const updateReportStatus = useAppStore(state => state.updateReportStatus);

  const handleStatusChange = (status: Report['status']) => {
    updateReportStatus(report.id, status);
  };

  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusable = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    // Focus first element on mount
    if (modalRef.current) {
      const focusable = modalRef.current.querySelectorAll('button');
      if (focusable.length > 0) focusable[0].focus();
    }
    
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const typeInfo = REPORT_TYPES[report.type] || REPORT_TYPES['ROAD_ANOMALY'];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className={styles.header}>
          <div>
            <h2 id="modal-title" className={styles.title} style={{ color: typeInfo.color }}>
              <span style={{ marginRight: '8px' }}>{typeInfo.icon}</span>
              {typeInfo.label}
            </h2>
            <div className={styles.id}>{report.id}</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <XIcon />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.grid}>
            <div className={styles.label}>Description</div>
            <div className={styles.value} style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
              {typeInfo.description}
            </div>

            <div className={styles.label}><ClockIcon width={14} height={14} /> Date Detected</div>
            <div className={styles.value}>{new Date(report.reportDate).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            
            <div className={styles.label}><MapIcon width={14} height={14} /> Location</div>
            <div className={styles.value}>{report.roadReference} ({report.sectorName})</div>
            
            <div className={styles.label}><TruckIcon width={14} height={14} /> Initial Source</div>
            <div className={styles.value}>{report.vehicleRef} (Anonymised Sensor)</div>
            
            <div className={styles.label}>Confidence</div>
            <div className={styles.value}>
              <span className={styles.confidenceScore}>{report.confidence}%</span>
              <span className={styles.corroboration}>Corroborated by {report.independentReports} vehicles</span>
            </div>
            
            <div className={styles.label}>Current Status</div>
            <div className={styles.value}>
              <Badge variant={report.status === 'resolved' ? 'ok' : report.status === 'under_review' ? 'warning' : 'danger'}>
                {report.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-light)' }}>
            <div className={styles.label} style={{ marginBottom: 'var(--space-3)' }}>
              Corroborated by {report.independentReports} vehicle{report.independentReports !== 1 ? 's' : ''}
            </div>
            
            {report.independentReports === 1 ? (
              <div style={{ color: 'var(--colour-warning)', fontSize: 'var(--type-caption)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                ⚠ Awaiting corroboration
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {report.reportingVehicles?.map(v => (
                  <span key={v} style={{ 
                    padding: '2px 8px', 
                    backgroundColor: 'var(--bg-inset)', 
                    border: '1px solid var(--border-default)', 
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--type-caption)',
                    fontFamily: 'monospace'
                  }}>
                    {v}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <div className={styles.actionLabel}>Change Status:</div>
            <div className={styles.actionGroup}>
              <Button 
                variant="secondary" 
                disabled={report.status === 'pending'}
                onClick={() => handleStatusChange('pending')}
              >
                Mark Pending
              </Button>
              <Button 
                variant="secondary" 
                disabled={report.status === 'under_review'}
                onClick={() => handleStatusChange('under_review')}
              >
                Mark Under Review
              </Button>
              <Button 
                variant="primary" 
                disabled={report.status === 'resolved'}
                onClick={() => handleStatusChange('resolved')}
              >
                Mark Resolved
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
