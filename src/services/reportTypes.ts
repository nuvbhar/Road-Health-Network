import { ReportType } from '../store/types';

export interface ReportTypeDef {
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const REPORT_TYPES: Record<ReportType, ReportTypeDef> = {
  POTENTIAL_POTHOLE: {
    label: 'Potential Pothole',
    icon: '⚠',
    color: 'var(--colour-danger)',
    description: 'Sharp sudden depression in the road surface.'
  },
  ROAD_ANOMALY: {
    label: 'Road Anomaly',
    icon: '⚠',
    color: 'var(--colour-warning)',
    description: 'Unclassified sudden bump or jolt.'
  },
  SURFACE_DEGRADATION: {
    label: 'Surface Degradation',
    icon: '◐',
    color: 'var(--colour-warning)',
    description: 'Sustained uneven or rough surface.'
  },
  SEVERE_CRACK: {
    label: 'Severe Crack',
    icon: '╱',
    color: 'var(--colour-danger)',
    description: 'Deep longitudinal or transverse crack.'
  },
  SPEED_BUMP_UNMARKED: {
    label: 'Unmarked Speed Bump',
    icon: '▬',
    color: 'var(--colour-info)',
    description: 'Sudden elevation consistent with a speed breaker.'
  },
  WATERLOGGING: {
    label: 'Waterlogging',
    icon: '◉',
    color: 'var(--colour-info)',
    description: 'Standing water affecting traction.'
  },
  DEBRIS_ON_ROAD: {
    label: 'Debris on Road',
    icon: '✕',
    color: 'var(--colour-danger)',
    description: 'Obstacle or object on the carriageway.'
  },
  UNEVEN_JOINT: {
    label: 'Uneven Joint',
    icon: '≈',
    color: 'var(--colour-warning)',
    description: 'Poor alignment at bridge or road joints.'
  },
  MANHOLE_DEPRESSION: {
    label: 'Manhole Depression',
    icon: '○',
    color: 'var(--colour-danger)',
    description: 'Sunken manhole cover.'
  }
};
