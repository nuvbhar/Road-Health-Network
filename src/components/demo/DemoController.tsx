import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useDemoLoop } from '../../hooks/useDemoLoop';
import { Button } from '../shared/Button';
import { TruckIcon } from '../shared/Icons';

export const DemoController: React.FC = () => {
  const isDemoActive = useAppStore(state => state.demoMode);
  const toggleDemoMode = useAppStore(state => state.toggleDemoMode);
  
  // Start the background loop
  useDemoLoop();

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 'var(--space-4)',
      backgroundColor: 'var(--bg-surface)',
      padding: 'var(--space-3) var(--space-5)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-light)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <TruckIcon color={isDemoActive ? 'var(--colour-ok)' : 'var(--text-muted)'} />
        <div>
          <div style={{ fontSize: 'var(--type-body)', fontWeight: 600 }}>Fleet Simulation</div>
          <div style={{ fontSize: 'var(--type-caption)', color: 'var(--text-secondary)' }}>
            {isDemoActive ? 'Simulating 120 active sensors' : 'Simulation paused'}
          </div>
        </div>
      </div>
      
      <div style={{ marginLeft: 'auto' }}>
        <Button variant={isDemoActive ? 'secondary' : 'primary'} onClick={toggleDemoMode}>
          {isDemoActive ? 'Stop Simulation' : 'Start Simulation'}
        </Button>
      </div>
    </div>
  );
};
