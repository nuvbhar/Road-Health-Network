import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ReportRow } from './ReportRow';
import { ReportModal } from './ReportModal';
import { Report } from '../../store/types';
import styles from './ReportFeed.module.css';

export const ReportFeed: React.FC = () => {
  const reports = useAppStore(state => state.reports);
  const activeSectorFilter = useAppStore(state => state.activeSectorFilter);
  const activeStatusFilter = useAppStore(state => state.activeStatusFilter);
  const setStatusFilter = useAppStore(state => state.setStatusFilter);
  
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Filter logic
  const filteredReports = reports.filter(r => {
    if (activeSectorFilter && r.sectorId !== activeSectorFilter) return false;
    if (activeStatusFilter !== 'all' && r.status !== activeStatusFilter) return false;
    return true;
  });

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            Live Incident Feed
            {activeSectorFilter && <span className={styles.filterTag}>Sector {activeSectorFilter.replace('SEC-', '')}</span>}
          </h3>
          
          <div className={styles.filterPills}>
            {['all', 'pending', 'under_review', 'resolved'].map(status => (
              <button
                key={status}
                className={`${styles.pill} ${activeStatusFilter === status ? styles.pillActive : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.feed} aria-live="polite">
          {filteredReports.length === 0 ? (
            <div className={styles.empty}>No reports matching the current filters.</div>
          ) : (
            filteredReports.slice(0, 10).map(report => (
              <ReportRow key={report.id} report={report} onClick={setSelectedReport} />
            ))
          )}
        </div>
        
        {filteredReports.length > 10 && (
          <div className={styles.footer}>
            Showing 10 of {filteredReports.length} reports. View full log in Reports tab.
          </div>
        )}
      </div>
      
      {selectedReport && (
        <ReportModal 
          report={selectedReport} 
          onClose={() => setSelectedReport(null)} 
        />
      )}
    </>
  );
};
