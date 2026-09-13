import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ReportRow } from '../components/reports/ReportRow';
import { ReportModal } from '../components/reports/ReportModal';
import { Report } from '../store/types';

export const ReportsPage: React.FC = () => {
  const reports = useAppStore(state => state.reports);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Pagination could be added here, for now render all or first 50
  const displayedReports = reports.slice(0, 50);

  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)' }}>
      <h1 className="sr-only">Reports</h1>
      <div style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--border-light)' }}>
        <h2 style={{ fontSize: 'var(--type-heading)', fontWeight: 600 }}>All Incident Reports</h2>
      </div>
      <div>
        {displayedReports.map(report => (
          <ReportRow key={report.id} report={report} onClick={setSelectedReport} />
        ))}
      </div>
      
      {selectedReport && (
        <ReportModal 
          report={selectedReport} 
          onClose={() => setSelectedReport(null)} 
        />
      )}
    </div>
  );
};
