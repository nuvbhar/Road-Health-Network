import React from "react";
import { ReportType } from "../store/types";
import { AlertTriangleIcon } from "../components/shared/Icons";

export interface ReportTypeDef {
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

export const REPORT_TYPES: Record<ReportType, ReportTypeDef> = {
  POTENTIAL_POTHOLE: {
    label: "Potential Pothole",
    icon: <AlertTriangleIcon width={16} height={16} />,
    color: "var(--colour-warning)",
    description: "Sharp sudden depression in the road surface.",
  },
  SEVERE_POTHOLE: {
    label: "Severe Pothole",
    icon: <AlertTriangleIcon width={16} height={16} />,
    color: "var(--colour-danger)",
    description: "Deep and dangerous crater in the road surface.",
  },
  ROAD_ANOMALY: {
    label: "Road Anomaly",
    icon: <AlertTriangleIcon width={16} height={16} />,
    color: "var(--colour-info, #3b82f6)",
    description: "General irregularity or uneven road surface.",
  },
  SPEED_BUMP: {
    label: "Speed Bump",
    icon: <AlertTriangleIcon width={16} height={16} />,
    color: "var(--colour-success, #22c55e)",
    description: "Deliberate raised obstacle to slow down traffic.",
  },
  TRAFFIC_HAZARD: {
    label: "Traffic Hazard",
    icon: <AlertTriangleIcon width={16} height={16} />,
    color: "var(--colour-warning)",
    description: "Debris, stopped vehicle, or object on the road.",
  },
};
