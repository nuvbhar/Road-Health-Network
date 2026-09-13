import React from 'react';
import { Report } from '../../store/types';
import { Badge } from '../shared/Badge';
import { REPORT_TYPES } from '../../services/reportTypes';
import styles from './ReportFeed.module.css';

interface ReportRowProps {
  report: Report;
  onClick?: (report: Report) => void;
}

export const ReportRow: React.FC<ReportRowProps> = React.memo(({ report, onClick }) => {
  const getConfidenceColour = (conf: number) => {
    if (conf > 80) return 'var(--colour-danger)';
    if (conf > 50) return 'var(--colour-warning)';
    return 'var(--text-secondary)';
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'resolved': return 'ok';
      case 'under_review': return 'warning';
      case 'pending':
      default:
        return 'danger';
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const typeInfo = REPORT_TYPES[report.type] || REPORT_TYPES['ROAD_ANOMALY'];

  return (
    <div className={`${styles.row} ${onClick ? styles.clickable : ''}`} onClick={() => onClick?.(report)}>
      <div className={styles.cellMain}>
        <div className={styles.typeRow} style={{ color: typeInfo.color }}>
          <span style={{ fontSize: '1.2em', marginRight: 'var(--space-2)' }}>{typeInfo.icon}</span>
          <span className={styles.type} style={{ color: 'var(--text-primary)' }}>{typeInfo.label}</span>
        </div>
        <div className={styles.reference}>{report.roadReference}</div>
      </div>
      
      <div className={styles.cell}>
        <div className={styles.cellLabel}>Date</div>
        <div className={styles.cellValue}>{formatDate(report.reportDate)}</div>
      </div>
      
      <div className={styles.cell}>
        <div className={styles.cellLabel}>Confidence</div>
        <div className={styles.confidenceValue} style={{ color: getConfidenceColour(report.confidence) }}>
          {report.confidence}%
        </div>
      </div>
      
      <div className={styles.cell}>
        <div className={styles.cellLabel}>Corroboration</div>
        <div className={styles.corroborationStack}>
          {report.reportingVehicles?.slice(0, 3).map((vId, i) => (
            <span key={i} className={styles.vehiclePill} title={vId}>
              {vId.substring(0, 4)}
            </span>
          ))}
          {report.independentReports > 3 && (
            <span className={styles.vehiclePillMore}>
              +{report.independentReports - 3}
            </span>
          )}
        </div>
      </div>
      
      <div className={styles.cellStatus}>
        <Badge variant={getStatusBadgeVariant(report.status)}>
          {report.status.replace('_', ' ')}
        </Badge>
      </div>
    </div>
  );
});
