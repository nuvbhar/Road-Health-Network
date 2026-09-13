import React from 'react';
import { StatCardRow } from '../components/cards/StatCardRow';
import { SectorMap } from '../components/map/SectorMap';
import { TrendGraph } from '../components/charts/TrendGraph';
import { ReportFeed } from '../components/reports/ReportFeed';

export const OverviewPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <h1 className="sr-only">Overview</h1>
      <StatCardRow />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
        <SectorMap />
        <TrendGraph />
      </div>
      <ReportFeed />
    </div>
  );
};
