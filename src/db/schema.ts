// src/db/schema.ts
import { relations } from 'drizzle-orm';
import { boolean, doublePrecision, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table (authenticated users via Firebase Auth UID or system accounts)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or internal ID
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().default('employee'), // 'head_of_hr' | 'hr_manager' | 'employee' | 'admin'
  employeeCode: text('employee_code'), // Links to employee_code
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Employees table
export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  employeeCode: text('employee_code').notNull().unique(), // e.g. EMP-001
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  designation: text('designation').notNull(),
  department: text('department').notNull().default('Human Resources & OD'),
  reportingManagerId: integer('reporting_manager_id'),
  reportingManagerName: text('reporting_manager_name'),
  status: text('status').notNull().default('active'), // 'active' | 'inactive'
  isHeadOfHr: boolean('is_head_of_hr').notNull().default(false),
  avatarInitials: text('avatar_initials'),
  joinDate: text('join_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Employee ongoing job responsibilities (Job Responsibility Register)
export const responsibilities = pgTable('responsibilities', {
  id: serial('id').primaryKey(),
  responsibilityCode: text('responsibility_code').notNull().unique(), // e.g. RESP-01
  employeeId: integer('employee_id').references(() => employees.id).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(), // 'Talent Acquisition', 'Training & OD', 'HR Operations & Analytics', etc.
  frequency: text('frequency').notNull(), // 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annual' | 'Ad Hoc'
  expectedDeliverable: text('expected_deliverable').notNull(),
  measurementCriteria: text('measurement_criteria').notNull(),
  relatedKpiTitle: text('related_kpi_title'),
  reportingManager: text('reporting_manager'),
  effectiveDate: text('effective_date').notNull(),
  status: text('status').notNull().default('active'), // 'active' | 'inactive'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tasks table
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  taskCode: text('task_code').notNull().unique(), // e.g. TSK-1001
  title: text('title').notNull(),
  description: text('description').notNull(),
  assignedEmployeeId: integer('assigned_employee_id').references(() => employees.id).notNull(),
  assigningManagerName: text('assigning_manager_name').notNull(),
  relatedResponsibilityId: integer('related_responsibility_id').references(() => responsibilities.id),
  relatedKpiId: integer('related_kpi_id'),
  priority: text('priority').notNull().default('Medium'), // 'Low' | 'Medium' | 'High' | 'Critical'
  assignmentDate: text('assignment_date').notNull(),
  startDate: text('start_date').notNull(),
  originalDeadline: text('original_deadline').notNull(), // YYYY-MM-DD
  revisedDeadline: text('revised_deadline'), // YYYY-MM-DD
  revisedBy: text('revised_by'),
  revisedAt: text('revised_at'),
  extensionReason: text('extension_reason'),
  completionDate: text('completion_date'),
  status: text('status').notNull().default('Not Started'), // 'Not Started' | 'In Progress' | 'Submitted for Review' | 'Revision Required' | 'Completed' | 'Overdue' | 'Cancelled'
  progressPercent: integer('progress_percent').notNull().default(0),
  employeeCompletionNotes: text('employee_completion_notes'),
  delayReason: text('delay_reason'),
  delayCategory: text('delay_category'), // 'Dependency on another department' | 'Waiting for approval' | 'Incomplete information or data' | 'Resource constraints' | 'Unexpected urgent assignment' | 'Technical issue' | 'Workload conflict' | 'Other'
  managerComments: text('manager_comments'),
  supportingAttachments: text('supporting_attachments'), // JSON or text
  approvalStatus: text('approval_status').notNull().default('Not Submitted'), // 'Not Submitted' | 'Pending Review' | 'Approved' | 'Revision Requested' | 'Rejected'
  isPoked: boolean('is_poked').notNull().default(false),
  pokedBy: text('poked_by'),
  pokedAt: timestamp('poked_at'),
  pokeCount: integer('poke_count').notNull().default(0),
  createdBy: text('created_by').notNull(),
  lastUpdatedBy: text('last_updated_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Deadline extension requests
export const deadlineExtensionRequests = pgTable('deadline_extension_requests', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').references(() => tasks.id).notNull(),
  employeeId: integer('employee_id').references(() => employees.id).notNull(),
  currentDeadline: text('current_deadline').notNull(),
  requestedDeadline: text('requested_deadline').notNull(),
  reasonCategory: text('reason_category').notNull(),
  detailedReason: text('detailed_reason').notNull(),
  status: text('status').notNull().default('Pending'), // 'Pending' | 'Approved' | 'Rejected'
  reviewerName: text('reviewer_name'),
  reviewerComments: text('reviewer_comments'),
  reviewedAt: text('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// KPIs table
export const kpis = pgTable('kpis', {
  id: serial('id').primaryKey(),
  kpiCode: text('kpi_code').notNull().unique(), // e.g. KPI-201
  employeeId: integer('employee_id').references(() => employees.id).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull().default('HR Operations'),
  measurementMethod: text('measurement_method').notNull().default('higher_is_better'), // 'higher_is_better' | 'lower_is_better' | 'percentage' | 'milestone' | 'qualitative'
  targetValue: doublePrecision('target_value').notNull(),
  actualValue: doublePrecision('actual_value'),
  unit: text('unit').notNull().default('%'),
  weight: doublePrecision('weight').notNull().default(1.0),
  reportingPeriod: text('reporting_period').notNull(), // e.g. 'October 2026'
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  dataSource: text('data_source'),
  evidenceNotes: text('evidence_notes'),
  submissionStatus: text('submission_status').notNull().default('Not Submitted'), // 'Not Submitted' | 'Submitted' | 'Approved' | 'Revision Required'
  managerReviewStatus: text('manager_review_status').notNull().default('Pending'), // 'Pending' | 'Recommended' | 'Revision Requested' | 'Approved' | 'Rejected'
  approvedAchievementPercentage: doublePrecision('approved_achievement_percentage'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Task audit logs (Immutable audit trail)
export const taskAuditLogs = pgTable('task_audit_logs', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').references(() => tasks.id),
  actionType: text('action_type').notNull(), // 'create' | 'status_change' | 'progress_update' | 'delay_reported' | 'extension_requested' | 'extension_decision' | 'submission' | 'approval_decision' | 'kpi_update'
  actionSummary: text('action_summary').notNull(),
  previousValue: text('previous_value'),
  newValue: text('new_value'),
  performedBy: text('performed_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// System notifications
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  recipientEmployeeId: integer('recipient_employee_id').references(() => employees.id),
  recipientEmail: text('recipient_email'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(), // 'task_assigned' | 'deadline_upcoming' | 'due_today' | 'overdue_alert' | 'kpi_missing' | 'kpi_approval' | 'extension_requested' | 'extension_approved' | 'revision_requested'
  linkId: integer('link_id'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// System & scoring configuration settings
export const appSettings = pgTable('app_settings', {
  id: serial('id').primaryKey(),
  settingKey: text('setting_key').notNull().unique(),
  settingValue: text('setting_value').notNull(),
  description: text('description'),
  updatedBy: text('updated_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const employeesRelations = relations(employees, ({ many, one }) => ({
  responsibilities: many(responsibilities),
  tasks: many(tasks),
  kpis: many(kpis),
  manager: one(employees, {
    fields: [employees.reportingManagerId],
    references: [employees.id],
  }),
}));

export const responsibilitiesRelations = relations(responsibilities, ({ one, many }) => ({
  employee: one(employees, {
    fields: [responsibilities.employeeId],
    references: [employees.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  assignedEmployee: one(employees, {
    fields: [tasks.assignedEmployeeId],
    references: [employees.id],
  }),
  responsibility: one(responsibilities, {
    fields: [tasks.relatedResponsibilityId],
    references: [responsibilities.id],
  }),
  extensionRequests: many(deadlineExtensionRequests),
  auditLogs: many(taskAuditLogs),
}));

export const kpisRelations = relations(kpis, ({ one }) => ({
  employee: one(employees, {
    fields: [kpis.employeeId],
    references: [employees.id],
  }),
}));
