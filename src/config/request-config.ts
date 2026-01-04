// ============================================
// Request Module Configuration
// Status workflow: 4 stages, 14 statuses
// ============================================

// Stage definitions
export const REQUEST_STAGES = {
  LEAD: { label: 'Lead', color: 'blue' },
  QUOTE: { label: 'Báo giá', color: 'purple' },
  FOLLOWUP: { label: 'Follow-up', color: 'orange' },
  OUTCOME: { label: 'Kết quả', color: 'gray' },
} as const;

// Status definitions grouped by stage
export const REQUEST_STATUSES = {
  // LEAD stage
  DANG_LL_CHUA_TL: { label: 'Đang LL - chưa trả lời', stage: 'LEAD', color: 'blue' },
  DANG_LL_DA_TL: { label: 'Đang LL - đã trả lời', stage: 'LEAD', color: 'cyan' },
  // QUOTE stage
  DA_BAO_GIA: { label: 'Đã báo giá', stage: 'QUOTE', color: 'purple' },
  DANG_XAY_TOUR: { label: 'Đang xây Tour', stage: 'QUOTE', color: 'violet' },
  // FOLLOWUP stage
  F1: { label: 'Follow-up 1', stage: 'FOLLOWUP', color: 'orange' },
  F2: { label: 'Follow-up 2', stage: 'FOLLOWUP', color: 'amber' },
  F3: { label: 'Follow-up 3', stage: 'FOLLOWUP', color: 'yellow' },
  F4: { label: 'Lần cuối', stage: 'FOLLOWUP', color: 'red' },
  // OUTCOME stage
  BOOKING: { label: 'Booking', stage: 'OUTCOME', color: 'green' },
  KHACH_HOAN: { label: 'Khách hoãn', stage: 'OUTCOME', color: 'slate' },
  KHACH_SUY_NGHI: { label: 'Đang suy nghĩ', stage: 'OUTCOME', color: 'gray' },
  KHONG_DU_TC: { label: 'Không đủ TC', stage: 'OUTCOME', color: 'rose' },
  DA_KET_THUC: { label: 'Đã kết thúc', stage: 'OUTCOME', color: 'neutral' },
  CANCEL: { label: 'Cancel', stage: 'OUTCOME', color: 'red' },
} as const;

// Type exports
export type RequestStage = keyof typeof REQUEST_STAGES;
export type RequestStatus = keyof typeof REQUEST_STATUSES;

// Keys for iteration
export const REQUEST_STAGE_KEYS = Object.keys(REQUEST_STAGES) as RequestStage[];
export const REQUEST_STATUS_KEYS = Object.keys(REQUEST_STATUSES) as RequestStatus[];

// Follow-up statuses for checking
export const FOLLOWUP_STATUSES: RequestStatus[] = ['F1', 'F2', 'F3', 'F4'];

// Helper: Get statuses by stage
export function getStatusesByStage(stage: RequestStage): RequestStatus[] {
  return REQUEST_STATUS_KEYS.filter(s => REQUEST_STATUSES[s].stage === stage);
}

// Helper: Get stage from status
export function getStageFromStatus(status: RequestStatus): RequestStage {
  return REQUEST_STATUSES[status].stage as RequestStage;
}

// Helper: Check if status is a follow-up status
export function isFollowUpStatus(status: RequestStatus): boolean {
  return FOLLOWUP_STATUSES.includes(status);
}

// Helper: Get status label
export function getStatusLabel(status: RequestStatus): string {
  return REQUEST_STATUSES[status]?.label ?? status;
}

// Helper: Get stage label
export function getStageLabel(stage: RequestStage): string {
  return REQUEST_STAGES[stage]?.label ?? stage;
}

// Helper: Get status color (for badges)
export function getStatusColor(status: RequestStatus): string {
  return REQUEST_STATUSES[status]?.color ?? 'gray';
}

// Helper: Get statuses grouped by stage for dropdowns
export function getStatusesGroupedByStage(): Record<RequestStage, { status: RequestStatus; label: string }[]> {
  const grouped = {} as Record<RequestStage, { status: RequestStatus; label: string }[]>;

  for (const stage of REQUEST_STAGE_KEYS) {
    grouped[stage] = getStatusesByStage(stage).map(status => ({
      status,
      label: REQUEST_STATUSES[status].label,
    }));
  }

  return grouped;
}
