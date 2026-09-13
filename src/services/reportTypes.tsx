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
  SPEED_BUMP: {
    label: "Speed Bump",
    icon: <AlertTriangleIcon width={16} height={16} />,
    color: "var(--colour-info)",
    description: "Raised bump on the road surface.",
  },
};
