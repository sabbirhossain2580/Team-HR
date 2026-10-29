// src/types/index.ts

export type UserRole = 'head_of_hr' | 'hr_manager' | 'employee' | 'admin';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  employeeCode?: string;
  employeeId?: number;
}

export interface Employee {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  reportingManagerId?: number | null;
  reportingManagerName?: string | null;
  status: 'active' | 'inactive';
  isHeadOfHr: boolean;
  avatarInitials?: string;
  joinDate?: string;
  totalTasks?: number;
  completedTasks?: number;
  pendingTasks?: number;
  overdueTasks?: number;
  taskCompletionRate?: number;
  onTimeRate?: number;
  avgKpiAchievement?: number | null;
  responsibilitiesCount?: number;
  kpiCount?: number;
  approvedKpiCount?: number;
}

export interface Responsibility {
  id: number;
  responsibilityCode: string;
  employeeId: number;
  title: string;
  description: string;
  category: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annual' | 'Ad Hoc';
  expectedDeliverable: string;
  measurementCriteria: string;
  relatedKpiTitle?: string;
  reportingManager?: string;
  effectiveDate: string;
  status: 'active' | 'inactive';
  employeeName?: string;
  employeeDesignation?: string;
  employeeCode?: string;
}

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type TaskStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Submitted for Review'
  | 'Revision Required'
  | 'Completed'
  | 'Overdue'
  | 'Cancelled';

export type DelayCategory =
  | 'Dependency on another department'
  | 'Waiting for approval'
  | 'Incomplete information or data'
  | 'Resource constraints'
  | 'Unexpected urgent assignment'
  | 'Technical issue'
  | 'Workload conflict'
  | 'Other';

export interface Task {
  id: number;
  taskCode: string;
  title: string;
  description: string;
  assignedEmployeeId: number;
  assigningManagerName: string;
  relatedResponsibilityId?: number | null;
  relatedKpiId?: number | null;
  priority: TaskPriority;
  assignmentDate: string;
  startDate: string;
  originalDeadline: string;
  revisedDeadline?: string | null;
  revisedBy?: string | null;
  revisedAt?: string | null;
  extensionReason?: string | null;
  completionDate?: string | null;
  status: TaskStatus;
  progressPercent: number;
  employeeCompletionNotes?: string | null;
  delayReason?: string | null;
  delayCategory?: DelayCategory | null;
  managerComments?: string | null;
  supportingAttachments?: string | null;
  approvalStatus: 'Not Submitted' | 'Pending Review' | 'Approved' | 'Revision Requested' | 'Rejected';
  createdBy: string;
  lastUpdatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  employeeName?: string;
  employeeDesignation?: string;
  employeeEmail?: string;
  employeeCode?: string;
  responsibilityTitle?: string;
  effectiveDeadline: string;
  isOverdue: boolean;
  daysOverdue: number;
  calculatedStatus: TaskStatus;
}

export interface DeadlineExtensionRequest {
  id: number;
  taskId: number;
  employeeId: number;
  currentDeadline: string;
  requestedDeadline: string;
  reasonCategory: string;
  detailedReason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewerName?: string;
  reviewerComments?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface TaskAuditLog {
  id: number;
  taskId?: number;
  actionType: string;
  actionSummary: string;
  previousValue?: string;
  newValue?: string;
  performedBy: string;
  createdAt: string;
}

export type KpiMeasurementMethod =
  | 'higher_is_better'
  | 'lower_is_better'
  | 'percentage'
  | 'milestone'
  | 'qualitative';

export interface KPI {
  id: number;
  kpiCode: string;
  employeeId: number;
  title: string;
  description: string;
  category: string;
  measurementMethod: KpiMeasurementMethod;
  targetValue: number;
  actualValue?: number | null;
  unit: string;
  weight: number;
  reportingPeriod: string;
  startDate: string;
  endDate: string;
  dataSource?: string;
  evidenceNotes?: string;
  submissionStatus: 'Not Submitted' | 'Submitted' | 'Approved' | 'Revision Required';
  managerReviewStatus: 'Pending' | 'Recommended' | 'Revision Requested' | 'Approved' | 'Rejected';
  approvedAchievementPercentage?: number | null;
  calculatedAchievement?: number | null;
  employeeName?: string;
  employeeDesignation?: string;
  employeeCode?: string;
}

export interface PerformanceRankItem {
  id: number;
  employeeCode: string;
  name: string;
  designation: string;
  department: string;
  isHeadOfHr: boolean;
  assignedTaskCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
  onTimeCompletionRate: number;
  taskExecutionScore: number;
  approvedKpiScore: number | null;
  kpiSubmissionRate: number;
  overallScore: number | null;
  statusLabel: string;
  rank: number | string;
}

export interface DashboardStats {
  cards: {
    totalEmployees: number;
    totalAssignedTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    pendingTasks: number;
    overdueTasks: number;
    awaitingApproval: number;
    avgKpiAchievement: number;
    onTimeCompletionRate: number;
    employeesRequiringAttention: number;
  };
  charts: {
    employeeTaskChart: Array<{
      name: string;
      fullName: string;
      completed: number;
      inProgress: number;
      overdue: number;
      total: number;
    }>;
    kpiComparison: Array<{
      name: string;
      fullName: string;
      target: number;
      actual: number;
    }>;
    taskDistribution: Array<{
      name: string;
      value: number;
      color: string;
    }>;
    monthlyTrend: Array<{
      month: string;
      onTimeRate: number;
      kpiScore: number;
    }>;
  };
  currentDate: string;
  timezone: string;
}

export interface NotificationItem {
  id: number;
  recipientEmployeeId?: number;
  recipientEmail?: string;
  title: string;
  message: string;
  type: string;
  linkId?: number;
  isRead: boolean;
  createdAt: string;
}

export interface AppSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  description?: string;
  updatedBy?: string;
  updatedAt?: string;
}
