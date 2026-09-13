import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { StatCard } from './StatCard';
import { 
  ClipboardListIcon, 
  TruckIcon, 
  MapIcon, 
  AlertTriangleIcon, 
  ClockIcon, 
  CheckCircleIcon 
} from '../shared/Icons';

const styles = {
  row: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 'var(--space-4)',
    width: '100%',
  }
};

export const StatCardRow: React.FC = () => {
  const stats = useAppStore(state => state.stats);

  return (
    <div style={styles.row} aria-live="polite">
      <StatCard label="Total reports" value={stats.totalReports} icon={ClipboardListIcon} accentColour="info" />
      <StatCard label="Active vehicles" value={stats.activeVehicles} icon={TruckIcon} accentColour="info" />
      <StatCard label="Sectors monitored" value={stats.sectorsMonitored} icon={MapIcon} accentColour="info" />
      <StatCard label="High confidence defects" value={stats.highConfidence} icon={AlertTriangleIcon} accentColour="danger" />
      <StatCard label="Pending review" value={stats.pendingReview} icon={ClockIcon} accentColour="warning" />
      <StatCard label="Resolved" value={stats.resolved} icon={CheckCircleIcon} accentColour="ok" />
    </div>
  );
};
