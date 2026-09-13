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
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 'var(--space-4)',
    width: '100%',
  }
};

export const StatCardRow: React.FC = () => {
  const stats = useAppStore(state => state.stats);

  const cards = [
    { label: "Total reports", value: stats.totalReports, icon: ClipboardListIcon, color: "info" },
    { label: "Active vehicles", value: stats.activeVehicles, icon: TruckIcon, color: "info" },
    { label: "Sectors monitored", value: stats.sectorsMonitored, icon: MapIcon, color: "info" },
    { label: "High confidence defects", value: stats.highConfidence, icon: AlertTriangleIcon, color: "danger" },
    { label: "Pending review", value: stats.pendingReview, icon: ClockIcon, color: "warning" },
    { label: "Resolved", value: stats.resolved, icon: CheckCircleIcon, color: "ok" }
  ];

  return (
    <div style={styles.row} aria-live="polite">
      {cards.map((card, i) => (
        <div key={card.label} className="animate-slide-up" style={{ animationDelay: `${i * 0.05}s`, opacity: 0 }}>
          <StatCard label={card.label} value={card.value} icon={card.icon} accentColour={card.color as any} />
        </div>
      ))}
    </div>
  );
};
