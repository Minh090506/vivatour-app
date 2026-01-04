'use client';

import { Badge } from '@/components/ui/badge';
import { REQUEST_STATUSES, REQUEST_STAGES } from '@/config/request-config';
import type { RequestStatus, RequestStage } from '@/types';

// Static color mapping for Tailwind JIT compiler
const COLOR_CLASSES = {
  blue: {
    stage: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  purple: {
    stage: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700 border-purple-300',
  },
  orange: {
    stage: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700 border-orange-300',
  },
  gray: {
    stage: 'text-gray-600',
    badge: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  green: {
    stage: 'text-green-600',
    badge: 'bg-green-100 text-green-700 border-green-300',
  },
  red: {
    stage: 'text-red-600',
    badge: 'bg-red-100 text-red-700 border-red-300',
  },
  yellow: {
    stage: 'text-yellow-600',
    badge: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
} as const;

type ColorKey = keyof typeof COLOR_CLASSES;

interface RequestStatusBadgeProps {
  status: RequestStatus;
  showStage?: boolean;
}

export function RequestStatusBadge({ status, showStage = false }: RequestStatusBadgeProps) {
  const config = REQUEST_STATUSES[status];
  if (!config) {
    return (
      <Badge variant="outline" className="bg-gray-100 text-gray-700">
        {status}
      </Badge>
    );
  }

  const stageConfig = REQUEST_STAGES[config.stage as RequestStage];
  const colorClasses = COLOR_CLASSES[config.color as ColorKey] || COLOR_CLASSES.gray;
  const stageColorClasses = stageConfig
    ? COLOR_CLASSES[stageConfig.color as ColorKey] || COLOR_CLASSES.gray
    : COLOR_CLASSES.gray;

  return (
    <div className="flex items-center gap-1">
      {showStage && stageConfig && (
        <span className={`text-xs font-medium ${stageColorClasses.stage}`}>
          {stageConfig.label}:
        </span>
      )}
      <Badge variant="outline" className={colorClasses.badge}>
        {config.label}
      </Badge>
    </div>
  );
}
