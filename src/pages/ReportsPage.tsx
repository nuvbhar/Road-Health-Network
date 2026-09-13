import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ReportRow } from '../components/reports/ReportRow';
import { ReportModal } from '../components/reports/ReportModal';
import { SearchIcon } from '../components/shared/Icons';

export const ReportsPage: React.FC = () => {
  const reports = useAppStore(state => state.reports);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<'date' | 'confidence'>('date');

  const filteredAndSorted = useMemo(() => {
    let result = [...reports];
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.id.toLowerCase().includes(lower) ||
        r.roadReference.toLowerCase().includes(lower) ||
        r.sectorName.toLowerCase().includes(lower) ||
        r.type.toLowerCase().replace('_', ' ').includes(lower)
      );
    }
    
    result.sort((a, b) => {
      if (sortBy === 'date') return new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime();
      return b.confidence - a.confidence;
    });
    
    return result;
  }, [reports, searchTerm, sortBy]);

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize) || 1;
  const displayedReports = filteredAndSorted.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="animate-fade-in" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)' }}>
      <h1 className="sr-only">Reports</h1>
      <div style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--border-light)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 'var(--type-heading)', fontWeight: 600 }}>All Incident Reports</h2>
        
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '8px', color: 'var(--text-muted)' }}>
              <SearchIcon width={16} height={16} />
            </span>
            <input 
              type="text" 
              placeholder="Search reports..." 
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 32px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', fontSize: 'var(--type-body)' }}
            />
          </div>
          
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value as any)}
            style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)' }}
          >
            <option value="date">Sort by Date</option>
            <option value="confidence">Sort by Confidence</option>
          </select>
        </div>
      </div>
      
      <div>
        {displayedReports.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No reports found matching your search.
          </div>
        ) : (
          displayedReports.map(report => (
            <ReportRow key={report.id} report={report} onClick={(r) => setSelectedReportId(r.id)} />
          ))
        )}
      </div>
      
      <div style={{ padding: 'var(--space-4) var(--space-5)', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-elevated)', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' }}>
        <div style={{ fontSize: 'var(--type-caption)', color: 'var(--text-secondary)' }}>
          Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, filteredAndSorted.length)} of {filteredAndSorted.length} reports
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <select 
            value={pageSize} 
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--border-default)', fontSize: 'var(--type-caption)' }}
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
          
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-default)', background: page === 1 ? 'var(--bg-inset)' : 'white', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            Prev
          </button>
          <span style={{ fontSize: 'var(--type-caption)' }}>Page {page} of {totalPages}</span>
          <button 
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-default)', background: page === totalPages ? 'var(--bg-inset)' : 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
      </div>
      
      {selectedReportId && reports.find(r => r.id === selectedReportId) && (
        <ReportModal 
          report={reports.find(r => r.id === selectedReportId)!} 
          onClose={() => setSelectedReportId(null)} 
        />
      )}
    </div>
  );
};
