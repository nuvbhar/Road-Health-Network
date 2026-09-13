import React from 'react';
import { StatCardRow } from '../components/cards/StatCardRow';
import { SectorMap } from '../components/map/SectorMap';
import { TrendGraph } from '../components/charts/TrendGraph';
import { ReportFeed } from '../components/reports/ReportFeed';
import { DemoController } from '../components/demo/DemoController';
import { VehicleList } from '../components/fleet/VehicleList';

export const OverviewPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <h1 className="sr-only">Overview</h1>
      <DemoController />
      <StatCardRow />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        <SectorMap />
        <TrendGraph />
      </div>
      <ReportFeed />
      <VehicleList />
    </div>
  );
};
