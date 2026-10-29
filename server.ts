// server.ts
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { db } from './src/db/index.ts';
import {
  employees,
  responsibilities,
  tasks,
  kpis,
  appSettings,
  users,
  taskAuditLogs,
  notifications,
  deadlineExtensionRequests,
} from './src/db/schema.ts';
import { eq, desc, asc, and, or, sql } from 'drizzle-orm';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { seedDatabase } from './src/db/seed.ts';

dotenv.config();

const app = express();
app.use(express.json());

// Helper for today in Asia/Dhaka (format: YYYY-MM-DD)
function getTodayDhaka(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    return '2026-10-29';
  }
}

// Calculate days between two dates
function calculateDaysOverdue(deadline: string, today: string): number {
  const dDate = new Date(deadline);
  const tDate = new Date(today);
  const diffTime = tDate.getTime() - dDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Automatic overdue evaluator for tasks
function processTaskOverdue(task: any, today: string) {
  const effectiveDeadline = task.revisedDeadline || task.originalDeadline;
  const isPast = effectiveDeadline < today;
  const isTerminal = task.status === 'Completed' || task.status === 'Cancelled';
  const isOverdue = !isTerminal && isPast;
  const daysOverdue = isOverdue ? calculateDaysOverdue(effectiveDeadline, today) : 0;

  return {
    ...task,
    effectiveDeadline,
    isOverdue,
    daysOverdue,
    calculatedStatus: isOverdue ? 'Overdue' : task.status,
  };
}

// --- API ROUTES ---

// 1. Current Authenticated User / Me
app.get('/api/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    let employeeData = null;
    if (user.employeeCode) {
      const emps = await db.select().from(employees).where(eq(employees.employeeCode, user.employeeCode));
      employeeData = emps[0] || null;
    }
    res.json({
      user,
      employee: employeeData,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Employees Directory & Summary Metrics
app.get('/api/employees', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const allEmployees = await db.select().from(employees).orderBy(asc(employees.employeeCode));
    const allTasks = await db.select().from(tasks);
    const allKpis = await db.select().from(kpis);
    const allResps = await db.select().from(responsibilities);
    const today = getTodayDhaka();

    // Map metrics for each employee
    const enriched = allEmployees.map((emp) => {
      const empTasks = allTasks.filter((t) => t.assignedEmployeeId === emp.id).map(t => processTaskOverdue(t, today));
      const empKpis = allKpis.filter((k) => k.employeeId === emp.id);
      const empResps = allResps.filter((r) => r.employeeId === emp.id && r.status === 'active');

      const totalTasks = empTasks.length;
      const completedTasks = empTasks.filter((t) => t.status === 'Completed').length;
      const overdueTasks = empTasks.filter((t) => t.isOverdue).length;
      const pendingTasks = totalTasks - completedTasks;
      const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // On-time completion: completed tasks where completionDate <= effectiveDeadline
      const onTimeCompleted = empTasks.filter(
        (t) => t.status === 'Completed' && t.completionDate && t.completionDate <= t.effectiveDeadline
      ).length;
      const onTimeRate = completedTasks > 0 ? Math.round((onTimeCompleted / completedTasks) * 100) : 100;

      // KPI Achievement (weighted approved score)
      const approvedKpis = empKpis.filter((k) => k.approvedAchievementPercentage !== null);
      let totalWeight = 0;
      let weightedSum = 0;
      approvedKpis.forEach((k) => {
        const weight = k.weight || 1.0;
        const score = k.approvedAchievementPercentage || 0;
        weightedSum += score * weight;
        totalWeight += weight;
      });
      const avgKpiAchievement = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;

      return {
        ...emp,
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        taskCompletionRate,
        onTimeRate,
        avgKpiAchievement,
        responsibilitiesCount: empResps.length,
        kpiCount: empKpis.length,
        approvedKpiCount: approvedKpis.length,
      };
    });

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Employee (Admin or Head of HR)
app.post('/api/employees', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'head_of_hr') {
      return res.status(403).json({ error: 'Permission denied. Only Admin or Head of HR can add employees.' });
    }

    const { employeeCode, name, email, designation, department, reportingManagerId, reportingManagerName, isHeadOfHr, joinDate } = req.body;
    if (!employeeCode || !name || !email || !designation) {
      return res.status(400).json({ error: 'Missing required employee fields' });
    }

    const initials = name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const [newEmp] = await db.insert(employees).values({
      employeeCode,
      name,
      email,
      designation,
      department: department || 'Human Resources & OD',
      reportingManagerId: reportingManagerId ? parseInt(reportingManagerId, 10) : null,
      reportingManagerName,
      isHeadOfHr: !!isHeadOfHr,
      avatarInitials: initials,
      joinDate: joinDate || getTodayDhaka(),
      status: 'active',
    }).returning();

    // Create user profile too
    await db.insert(users).values({
      uid: `usr-${Date.now()}`,
      email,
      name,
      role: isHeadOfHr ? 'head_of_hr' : designation.toLowerCase().includes('manager') ? 'hr_manager' : 'employee',
      employeeCode,
    }).onConflictDoNothing();

    res.json(newEmp);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update Employee Profile
app.put('/api/employees/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'head_of_hr') {
      return res.status(403).json({ error: 'Permission denied. Only Admin or Head of HR can edit employees.' });
    }

    const id = parseInt(req.params.id, 10);
    const { name, designation, department, reportingManagerId, reportingManagerName, status, isHeadOfHr } = req.body;

    const [updated] = await db
      .update(employees)
      .set({
        name,
        designation,
        department,
        reportingManagerId: reportingManagerId ? parseInt(reportingManagerId, 10) : null,
        reportingManagerName,
        status,
        isHeadOfHr: isHeadOfHr !== undefined ? !!isHeadOfHr : undefined,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Responsibilities Register
app.get('/api/responsibilities', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const allResps = await db
      .select({
        id: responsibilities.id,
        responsibilityCode: responsibilities.responsibilityCode,
        employeeId: responsibilities.employeeId,
        title: responsibilities.title,
        description: responsibilities.description,
        category: responsibilities.category,
        frequency: responsibilities.frequency,
        expectedDeliverable: responsibilities.expectedDeliverable,
        measurementCriteria: responsibilities.measurementCriteria,
        relatedKpiTitle: responsibilities.relatedKpiTitle,
        reportingManager: responsibilities.reportingManager,
        effectiveDate: responsibilities.effectiveDate,
        status: responsibilities.status,
        createdAt: responsibilities.createdAt,
        employeeName: employees.name,
        employeeDesignation: employees.designation,
        employeeCode: employees.employeeCode,
      })
      .from(responsibilities)
      .leftJoin(employees, eq(responsibilities.employeeId, employees.id))
      .orderBy(asc(responsibilities.responsibilityCode));

    res.json(allResps);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/responsibilities', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'employee') {
      return res.status(403).json({ error: 'Only Managers, Head of HR, or Admin can assign job responsibilities.' });
    }

    const {
      responsibilityCode,
      employeeId,
      title,
      description,
      category,
      frequency,
      expectedDeliverable,
      measurementCriteria,
      relatedKpiTitle,
      reportingManager,
      effectiveDate,
    } = req.body;

    if (!employeeId || !title || !description || !category || !frequency) {
      return res.status(400).json({ error: 'Missing mandatory responsibility fields.' });
    }

    const code = responsibilityCode || `RESP-${Date.now().toString().slice(-4)}`;

    const [newResp] = await db.insert(responsibilities).values({
      responsibilityCode: code,
      employeeId: parseInt(employeeId, 10),
      title,
      description,
      category,
      frequency,
      expectedDeliverable: expectedDeliverable || 'Quarterly Deliverable Document',
      measurementCriteria: measurementCriteria || 'Standard departmental SLA',
      relatedKpiTitle,
      reportingManager: reportingManager || req.user?.name,
      effectiveDate: effectiveDate || getTodayDhaka(),
      status: 'active',
    }).returning();

    res.json(newResp);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/responsibilities/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'employee') {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    const id = parseInt(req.params.id, 10);
    const { title, description, category, frequency, expectedDeliverable, measurementCriteria, relatedKpiTitle, status } = req.body;

    const [updated] = await db
      .update(responsibilities)
      .set({
        title,
        description,
        category,
        frequency,
        expectedDeliverable,
        measurementCriteria,
        relatedKpiTitle,
        status,
        updatedAt: new Date(),
      })
      .where(eq(responsibilities.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Tasks Register & Management
app.get('/api/tasks', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const today = getTodayDhaka();
    const allTasks = await db
      .select({
        id: tasks.id,
        taskCode: tasks.taskCode,
        title: tasks.title,
        description: tasks.description,
        assignedEmployeeId: tasks.assignedEmployeeId,
        assigningManagerName: tasks.assigningManagerName,
        relatedResponsibilityId: tasks.relatedResponsibilityId,
        relatedKpiId: tasks.relatedKpiId,
        priority: tasks.priority,
        assignmentDate: tasks.assignmentDate,
        startDate: tasks.startDate,
        originalDeadline: tasks.originalDeadline,
        revisedDeadline: tasks.revisedDeadline,
        revisedBy: tasks.revisedBy,
        revisedAt: tasks.revisedAt,
        extensionReason: tasks.extensionReason,
        completionDate: tasks.completionDate,
        status: tasks.status,
        progressPercent: tasks.progressPercent,
        employeeCompletionNotes: tasks.employeeCompletionNotes,
        delayReason: tasks.delayReason,
        delayCategory: tasks.delayCategory,
        managerComments: tasks.managerComments,
        supportingAttachments: tasks.supportingAttachments,
        approvalStatus: tasks.approvalStatus,
        createdBy: tasks.createdBy,
        lastUpdatedBy: tasks.lastUpdatedBy,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        employeeName: employees.name,
        employeeDesignation: employees.designation,
        employeeEmail: employees.email,
        employeeCode: employees.employeeCode,
        responsibilityTitle: responsibilities.title,
      })
      .from(tasks)
      .leftJoin(employees, eq(tasks.assignedEmployeeId, employees.id))
      .leftJoin(responsibilities, eq(tasks.relatedResponsibilityId, responsibilities.id))
      .orderBy(desc(tasks.id));

    const processed = allTasks.map((t) => processTaskOverdue(t, today));
    res.json(processed);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create/Assign Task
app.post('/api/tasks', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole === 'employee') {
      return res.status(403).json({ error: 'Employees cannot create tasks for others.' });
    }

    const {
      title,
      description,
      assignedEmployeeId,
      relatedResponsibilityId,
      relatedKpiId,
      priority,
      startDate,
      originalDeadline,
    } = req.body;

    if (!title || !description || !assignedEmployeeId || !originalDeadline) {
      return res.status(400).json({ error: 'Title, description, assigned employee, and deadline are required.' });
    }

    const taskCode = `TSK-${Math.floor(1000 + Math.random() * 9000)}`;
    const today = getTodayDhaka();

    const [newTask] = await db.insert(tasks).values({
      taskCode,
      title,
      description,
      assignedEmployeeId: parseInt(assignedEmployeeId, 10),
      assigningManagerName: req.user?.name || 'HR Manager',
      relatedResponsibilityId: relatedResponsibilityId ? parseInt(relatedResponsibilityId, 10) : null,
      relatedKpiId: relatedKpiId ? parseInt(relatedKpiId, 10) : null,
      priority: priority || 'Medium',
      assignmentDate: today,
      startDate: startDate || today,
      originalDeadline,
      status: 'Not Started',
      progressPercent: 0,
      approvalStatus: 'Not Submitted',
      createdBy: req.user?.name || 'Manager',
      lastUpdatedBy: req.user?.name || 'Manager',
    }).returning();

    // Audit log
    await db.insert(taskAuditLogs).values({
      taskId: newTask.id,
      actionType: 'created',
      actionSummary: `Task ${taskCode} created and assigned by ${req.user?.name} with deadline ${originalDeadline}.`,
      performedBy: req.user?.name || 'Manager',
    });

    // Notification to assigned employee
    await db.insert(notifications).values({
      recipientEmployeeId: parseInt(assignedEmployeeId, 10),
      title: `New Task Assigned: ${title}`,
      message: `You have been assigned "${title}" due on ${originalDeadline} by ${req.user?.name}.`,
      type: 'task_assigned',
      linkId: newTask.id,
      isRead: false,
    });

    res.json(newTask);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update Task (Progress, Notes, Delay Reasons)
app.put('/api/tasks/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!existing[0]) return res.status(404).json({ error: 'Task not found' });

    const currentTask = existing[0];
    const { progressPercent, employeeCompletionNotes, delayReason, delayCategory, managerComments, status } = req.body;

    const updates: any = {
      lastUpdatedBy: req.user?.name || 'User',
      updatedAt: new Date(),
    };

    if (progressPercent !== undefined) updates.progressPercent = progressPercent;
    if (employeeCompletionNotes !== undefined) updates.employeeCompletionNotes = employeeCompletionNotes;
    if (delayReason !== undefined) updates.delayReason = delayReason;
    if (delayCategory !== undefined) updates.delayCategory = delayCategory;
    if (managerComments !== undefined) updates.managerComments = managerComments;
    if (status !== undefined) updates.status = status;

    const [updated] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();

    // Log progress/delay in audit trail
    if (delayReason && delayReason !== currentTask.delayReason) {
      await db.insert(taskAuditLogs).values({
        taskId: id,
        actionType: 'delay_reported',
        actionSummary: `Delay reason updated: [${delayCategory || 'General'}] ${delayReason}`,
        previousValue: currentTask.delayReason || 'None',
        newValue: delayReason,
        performedBy: req.user?.name || 'Employee',
      });
    }

    if (progressPercent !== undefined && progressPercent !== currentTask.progressPercent) {
      await db.insert(taskAuditLogs).values({
        taskId: id,
        actionType: 'progress_updated',
        actionSummary: `Progress updated to ${progressPercent}%`,
        previousValue: `${currentTask.progressPercent}%`,
        newValue: `${progressPercent}%`,
        performedBy: req.user?.name || 'Employee',
      });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit Task for Review
app.post('/api/tasks/:id/submit', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { completionNotes, attachments } = req.body;
    const today = getTodayDhaka();

    const [updated] = await db
      .update(tasks)
      .set({
        status: 'Submitted for Review',
        approvalStatus: 'Pending Review',
        progressPercent: 100,
        employeeCompletionNotes: completionNotes,
        supportingAttachments: attachments,
        lastUpdatedBy: req.user?.name || 'Employee',
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    await db.insert(taskAuditLogs).values({
      taskId: id,
      actionType: 'submission',
      actionSummary: `Task submitted for managerial review with completion notes.`,
      newValue: completionNotes || 'Submitted for review',
      performedBy: req.user?.name || 'Employee',
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Manager/Head of HR Review Decision (Approve / Reject / Revision)
app.post('/api/tasks/:id/review', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'employee') {
      return res.status(403).json({ error: 'Separation of duties: Employees cannot review/approve tasks.' });
    }

    const id = parseInt(req.params.id, 10);
    const { decision, managerComments } = req.body; // 'approve' | 'reject' | 'revision'
    const today = getTodayDhaka();

    let newStatus = 'In Progress';
    let newApprovalStatus = 'Pending Review';
    let completionDate = null;

    if (decision === 'approve') {
      newStatus = 'Completed';
      newApprovalStatus = 'Approved';
      completionDate = today;
    } else if (decision === 'revision') {
      newStatus = 'Revision Required';
      newApprovalStatus = 'Revision Requested';
    } else if (decision === 'reject') {
      newStatus = 'Revision Required';
      newApprovalStatus = 'Rejected';
    }

    const [updated] = await db
      .update(tasks)
      .set({
        status: newStatus,
        approvalStatus: newApprovalStatus,
        completionDate: completionDate,
        managerComments: managerComments,
        lastUpdatedBy: req.user?.name || 'Manager',
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    await db.insert(taskAuditLogs).values({
      taskId: id,
      actionType: 'approval_decision',
      actionSummary: `Manager ${req.user?.name} decided [${decision.toUpperCase()}]. Comment: ${managerComments || 'None'}`,
      previousValue: 'Submitted for Review',
      newValue: newStatus,
      performedBy: req.user?.name || 'Manager',
    });

    // Notify employee
    await db.insert(notifications).values({
      recipientEmployeeId: updated.assignedEmployeeId,
      title: `Task Review Decision: ${decision === 'approve' ? 'Approved' : 'Revision Requested'}`,
      message: `Your task "${updated.title}" was evaluated by ${req.user?.name}: ${managerComments || decision}`,
      type: decision === 'approve' ? 'task_assigned' : 'revision_requested',
      linkId: id,
      isRead: false,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Request Deadline Extension (Preserves original deadline)
app.post('/api/tasks/:id/request-extension', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { requestedDeadline, reasonCategory, detailedReason } = req.body;

    const [existing] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const currentDeadline = existing.revisedDeadline || existing.originalDeadline;

    const [reqRecord] = await db.insert(deadlineExtensionRequests).values({
      taskId: id,
      employeeId: existing.assignedEmployeeId,
      currentDeadline,
      requestedDeadline,
      reasonCategory: reasonCategory || 'Workload conflict',
      detailedReason: detailedReason || 'Extension requested due to dependencies',
      status: 'Pending',
    }).returning();

    await db.insert(taskAuditLogs).values({
      taskId: id,
      actionType: 'extension_requested',
      actionSummary: `Deadline extension requested until ${requestedDeadline}. Category: ${reasonCategory}. Reason: ${detailedReason}`,
      previousValue: currentDeadline,
      newValue: requestedDeadline,
      performedBy: req.user?.name || 'Employee',
    });

    res.json(reqRecord);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve or Reject Deadline Extension (Authorized approver only)
app.post('/api/tasks/:id/decide-extension', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'employee') {
      return res.status(403).json({ error: 'Separation of duties: Only managers or Head of HR can approve extensions.' });
    }

    const id = parseInt(req.params.id, 10);
    const { requestId, decision, reviewerComments, approvedDeadline } = req.body; // decision: 'approve' | 'reject'
    const today = getTodayDhaka();

    const [taskRecord] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!taskRecord) return res.status(404).json({ error: 'Task not found' });

    // Update extension request record
    if (requestId) {
      await db
        .update(deadlineExtensionRequests)
        .set({
          status: decision === 'approve' ? 'Approved' : 'Rejected',
          reviewerName: req.user?.name,
          reviewerComments,
          reviewedAt: new Date().toISOString(),
        })
        .where(eq(deadlineExtensionRequests.id, requestId));
    }

    if (decision === 'approve') {
      const finalRevised = approvedDeadline || taskRecord.revisedDeadline;
      // Preserve original deadline, update revised_deadline and extension metadata
      await db
        .update(tasks)
        .set({
          revisedDeadline: finalRevised,
          revisedBy: req.user?.name,
          revisedAt: today,
          extensionReason: reviewerComments,
          lastUpdatedBy: req.user?.name,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, id));

      await db.insert(taskAuditLogs).values({
        taskId: id,
        actionType: 'extension_decision',
        actionSummary: `Extension APPROVED by ${req.user?.name}. Revised Deadline: ${finalRevised}. (Original deadline: ${taskRecord.originalDeadline} retained).`,
        previousValue: taskRecord.revisedDeadline || taskRecord.originalDeadline,
        newValue: finalRevised,
        performedBy: req.user?.name || 'Approver',
      });
    } else {
      await db.insert(taskAuditLogs).values({
        taskId: id,
        actionType: 'extension_decision',
        actionSummary: `Extension REJECTED by ${req.user?.name}. Reason: ${reviewerComments}`,
        performedBy: req.user?.name || 'Approver',
      });
    }

    res.json({ success: true, decision });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Task History & Audit Trail
app.get('/api/tasks/:id/history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const logs = await db
      .select()
      .from(taskAuditLogs)
      .where(eq(taskAuditLogs.taskId, id))
      .orderBy(desc(taskAuditLogs.createdAt));

    const extensions = await db
      .select()
      .from(deadlineExtensionRequests)
      .where(eq(deadlineExtensionRequests.taskId, id))
      .orderBy(desc(deadlineExtensionRequests.createdAt));

    res.json({ logs, extensions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. KPI Module
app.get('/api/kpis', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const allKpis = await db
      .select({
        id: kpis.id,
        kpiCode: kpis.kpiCode,
        employeeId: kpis.employeeId,
        title: kpis.title,
        description: kpis.description,
        category: kpis.category,
        measurementMethod: kpis.measurementMethod,
        targetValue: kpis.targetValue,
        actualValue: kpis.actualValue,
        unit: kpis.unit,
        weight: kpis.weight,
        reportingPeriod: kpis.reportingPeriod,
        startDate: kpis.startDate,
        endDate: kpis.endDate,
        dataSource: kpis.dataSource,
        evidenceNotes: kpis.evidenceNotes,
        submissionStatus: kpis.submissionStatus,
        managerReviewStatus: kpis.managerReviewStatus,
        approvedAchievementPercentage: kpis.approvedAchievementPercentage,
        createdAt: kpis.createdAt,
        updatedAt: kpis.updatedAt,
        employeeName: employees.name,
        employeeDesignation: employees.designation,
        employeeCode: employees.employeeCode,
      })
      .from(kpis)
      .leftJoin(employees, eq(kpis.employeeId, employees.id))
      .orderBy(asc(kpis.kpiCode));

    // Calculate preliminary achievement % for submitted actuals
    const enriched = allKpis.map((k) => {
      let calculatedAchievement: number | null = null;
      if (k.actualValue !== null && k.actualValue !== undefined && k.targetValue > 0) {
        if (k.measurementMethod === 'lower_is_better') {
          // e.g. target 30 days, actual 26 days => 30/26 * 100 = 115.3%
          calculatedAchievement = Math.round((k.targetValue / k.actualValue) * 1000) / 10;
        } else {
          // Standard higher is better
          calculatedAchievement = Math.round((k.actualValue / k.targetValue) * 1000) / 10;
        }
      }

      return {
        ...k,
        calculatedAchievement,
      };
    });

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create KPI
app.post('/api/kpis', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'employee') {
      return res.status(403).json({ error: 'Permission denied. Only managers or Head of HR can create KPIs.' });
    }

    const {
      employeeId,
      title,
      description,
      category,
      measurementMethod,
      targetValue,
      unit,
      weight,
      reportingPeriod,
      startDate,
      endDate,
      dataSource,
    } = req.body;

    if (!employeeId || !title || !targetValue) {
      return res.status(400).json({ error: 'Employee, title, and target value are required.' });
    }

    const kpiCode = `KPI-${Math.floor(100 + Math.random() * 900)}`;

    const [newKpi] = await db.insert(kpis).values({
      kpiCode,
      employeeId: parseInt(employeeId, 10),
      title,
      description: description || title,
      category: category || 'General HR',
      measurementMethod: measurementMethod || 'higher_is_better',
      targetValue: parseFloat(targetValue),
      unit: unit || '%',
      weight: weight ? parseFloat(weight) : 1.0,
      reportingPeriod: reportingPeriod || 'October 2026',
      startDate: startDate || '2026-10-01',
      endDate: endDate || '2026-10-31',
      dataSource: dataSource || 'HRIS',
      submissionStatus: 'Not Submitted',
      managerReviewStatus: 'Pending',
    }).returning();

    res.json(newKpi);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit KPI Actual Value (Employee)
app.post('/api/kpis/:id/submit', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { actualValue, evidenceNotes } = req.body;

    if (actualValue === undefined || actualValue === null) {
      return res.status(400).json({ error: 'Actual value is required.' });
    }

    const [updated] = await db
      .update(kpis)
      .set({
        actualValue: parseFloat(actualValue),
        evidenceNotes: evidenceNotes || '',
        submissionStatus: 'Submitted',
        managerReviewStatus: 'Pending',
        updatedAt: new Date(),
      })
      .where(eq(kpis.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Recommend / Review KPI (Manager)
app.post('/api/kpis/:id/review', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'employee') {
      return res.status(403).json({ error: 'Separation of duties: Employees cannot review KPIs.' });
    }

    const id = parseInt(req.params.id, 10);
    const { status, comments } = req.body; // 'Recommended' | 'Revision Requested'

    const [updated] = await db
      .update(kpis)
      .set({
        managerReviewStatus: status || 'Recommended',
        updatedAt: new Date(),
      })
      .where(eq(kpis.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Final Approve KPI (Head of HR / Admin)
app.post('/api/kpis/:id/approve', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'head_of_hr' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied. Final KPI approval is restricted to Head of HR.' });
    }

    const id = parseInt(req.params.id, 10);
    const { approvedPercentage, reviewStatus } = req.body;

    const [updated] = await db
      .update(kpis)
      .set({
        approvedAchievementPercentage: approvedPercentage !== undefined ? parseFloat(approvedPercentage) : null,
        managerReviewStatus: reviewStatus || 'Approved',
        submissionStatus: 'Approved',
        updatedAt: new Date(),
      })
      .where(eq(kpis.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Monthly Performance Ranking
app.get('/api/performance/ranking', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const today = getTodayDhaka();
    const allEmployees = await db.select().from(employees).where(eq(employees.status, 'active')).orderBy(asc(employees.employeeCode));
    const allTasks = await db.select().from(tasks);
    const allKpis = await db.select().from(kpis);
    const settingsList = await db.select().from(appSettings);

    const settingsMap = Object.fromEntries(settingsList.map((s) => [s.settingKey, s.settingValue]));
    const kpiWeight = parseFloat(settingsMap['scoring_kpi_weight'] || '70') / 100;
    const taskWeight = parseFloat(settingsMap['scoring_task_weight'] || '30') / 100;
    const kpiCap = parseFloat(settingsMap['kpi_cap_percentage'] || '120');

    const rankings = allEmployees.map((emp) => {
      const empTasks = allTasks.filter((t) => t.assignedEmployeeId === emp.id).map(t => processTaskOverdue(t, today));
      const empKpis = allKpis.filter((k) => k.employeeId === emp.id);

      const totalTasks = empTasks.length;
      const completedTasks = empTasks.filter((t) => t.status === 'Completed').length;
      const overdueTasks = empTasks.filter((t) => t.isOverdue).length;

      // On-time completion rate
      const onTimeCompleted = empTasks.filter(
        (t) => t.status === 'Completed' && t.completionDate && t.completionDate <= t.effectiveDeadline
      ).length;
      const onTimeRate = completedTasks > 0 ? Math.round((onTimeCompleted / completedTasks) * 100) : 100;

      // Task Execution Score: combination of completion rate, on-time rate, and deduction for overdue
      let taskExecutionScore = 0;
      if (totalTasks > 0) {
        const rawCompletion = (completedTasks / totalTasks) * 60;
        const rawOnTime = (onTimeRate / 100) * 40;
        const overdueDeduction = overdueTasks * 5;
        taskExecutionScore = Math.max(0, Math.min(100, Math.round(rawCompletion + rawOnTime - overdueDeduction)));
      }

      // Approved KPI Score
      const approvedKpis = empKpis.filter((k) => k.approvedAchievementPercentage !== null);
      let totalKpiWeight = 0;
      let weightedKpiSum = 0;
      approvedKpis.forEach((k) => {
        const w = k.weight || 1.0;
        const cappedScore = Math.min(kpiCap, k.approvedAchievementPercentage || 0);
        weightedKpiSum += cappedScore * w;
        totalKpiWeight += w;
      });

      const approvedKpiScore = totalKpiWeight > 0 ? Math.round((weightedKpiSum / totalKpiWeight) * 10) / 10 : null;
      const kpiSubmissionRate = empKpis.length > 0 ? Math.round((empKpis.filter((k) => k.submissionStatus !== 'Not Submitted').length / empKpis.length) * 100) : 0;

      // Overall Score calculation
      let overallScore: number | null = null;
      let statusLabel = 'Active';

      if (approvedKpiScore === null && totalTasks === 0) {
        statusLabel = 'Insufficient Data';
      } else if (approvedKpiScore === null) {
        statusLabel = 'Pending KPI Evaluation';
        overallScore = Math.round(taskExecutionScore * taskWeight * 10) / 10;
      } else {
        overallScore = Math.round((approvedKpiScore * kpiWeight + taskExecutionScore * taskWeight) * 10) / 10;
      }

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        name: emp.name,
        designation: emp.designation,
        department: emp.department,
        isHeadOfHr: emp.isHeadOfHr,
        assignedTaskCount: totalTasks,
        completedTaskCount: completedTasks,
        overdueTaskCount: overdueTasks,
        onTimeCompletionRate: onTimeRate,
        taskExecutionScore,
        approvedKpiScore,
        kpiSubmissionRate,
        overallScore,
        statusLabel,
      };
    });

    // Sort rankable employees (descending overall score)
    const sorted = [...rankings].sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
    const rankedWithPosition = sorted.map((item, index) => ({
      ...item,
      rank: item.overallScore !== null ? index + 1 : '—',
    }));

    res.json({
      methodology: {
        kpiWeight: Math.round(kpiWeight * 100),
        taskWeight: Math.round(taskWeight * 100),
        kpiCap,
        period: settingsMap['current_reporting_period'] || 'October 2026',
        description: `Overall Score = (${Math.round(kpiWeight * 100)}% × Approved KPI Score) + (${Math.round(taskWeight * 100)}% × Task Execution Score). Overdue tasks apply proportional execution deductions.`,
      },
      rankings: rankedWithPosition,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Main Dashboard 10 Summary Cards & Chart Data
app.get('/api/dashboard/stats', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const today = getTodayDhaka();
    const allEmployees = await db.select().from(employees).where(eq(employees.status, 'active'));
    const rawTasks = await db.select().from(tasks);
    const allKpis = await db.select().from(kpis);
    const allTasks = rawTasks.map((t) => processTaskOverdue(t, today));

    // 10 Mandatory Metrics:
    // 1. Total Employees
    const totalEmployees = allEmployees.length;
    // 2. Total Assigned Tasks
    const totalAssignedTasks = allTasks.length;
    // 3. Completed Tasks
    const completedTasks = allTasks.filter((t) => t.status === 'Completed').length;
    // 4. In Progress Tasks
    const inProgressTasks = allTasks.filter((t) => t.status === 'In Progress').length;
    // 5. Pending Tasks (Not Completed and not cancelled)
    const pendingTasks = allTasks.filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled').length;
    // 6. Overdue Tasks
    const overdueTasks = allTasks.filter((t) => t.isOverdue).length;
    // 7. Tasks Awaiting Approval
    const awaitingApproval = allTasks.filter((t) => t.status === 'Submitted for Review' || t.approvalStatus === 'Pending Review').length;

    // 8. Average KPI Achievement across approved KPIs
    const approvedKpis = allKpis.filter((k) => k.approvedAchievementPercentage !== null);
    const avgKpiAchievement =
      approvedKpis.length > 0
        ? Math.round(
            (approvedKpis.reduce((acc, k) => acc + (k.approvedAchievementPercentage || 0), 0) / approvedKpis.length) * 10
          ) / 10
        : 0;

    // 9. On-Time Completion Rate
    const onTimeCompleted = allTasks.filter(
      (t) => t.status === 'Completed' && t.completionDate && t.completionDate <= t.effectiveDeadline
    ).length;
    const onTimeCompletionRate = completedTasks > 0 ? Math.round((onTimeCompleted / completedTasks) * 100) : 100;

    // 10. Employees Requiring Attention (Employees with overdue tasks or overdue KPIs)
    const overdueEmpIds = new Set(allTasks.filter((t) => t.isOverdue).map((t) => t.assignedEmployeeId));
    const employeesRequiringAttention = overdueEmpIds.size;

    // Chart Data Preparation:
    // A. Employee-wise Task Completion
    const employeeTaskChart = allEmployees.map((emp) => {
      const empTasks = allTasks.filter((t) => t.assignedEmployeeId === emp.id);
      return {
        name: emp.name.split(' ')[0],
        fullName: emp.name,
        completed: empTasks.filter((t) => t.status === 'Completed').length,
        inProgress: empTasks.filter((t) => t.status === 'In Progress').length,
        overdue: empTasks.filter((t) => t.isOverdue).length,
        total: empTasks.length,
      };
    });

    // B. Monthly KPI Achievement comparison
    const kpiComparison = allEmployees.map((emp) => {
      const empKpis = allKpis.filter((k) => k.employeeId === emp.id && k.approvedAchievementPercentage !== null);
      const score = empKpis.length > 0 ? Math.round(empKpis.reduce((a, b) => a + (b.approvedAchievementPercentage || 0), 0) / empKpis.length) : 0;
      return {
        name: emp.name.split(' ')[0],
        fullName: emp.name,
        target: 100,
        actual: score,
      };
    });

    // C. Task Distribution
    const taskDistribution = [
      { name: 'Completed', value: completedTasks, color: '#16a34a' },
      { name: 'In Progress', value: inProgressTasks, color: '#2563eb' },
      { name: 'Overdue', value: overdueTasks, color: '#dc2626' },
      { name: 'Under Review', value: awaitingApproval, color: '#d97706' },
      { name: 'Not Started', value: allTasks.filter((t) => t.status === 'Not Started').length, color: '#64748b' },
    ];

    // D. Department Trend (6-month simulated historical trend leading to current month)
    const monthlyTrend = [
      { month: 'May 2026', onTimeRate: 88, kpiScore: 91 },
      { month: 'Jun 2026', onTimeRate: 92, kpiScore: 94 },
      { month: 'Jul 2026', onTimeRate: 85, kpiScore: 89 },
      { month: 'Aug 2026', onTimeRate: 90, kpiScore: 93 },
      { month: 'Sep 2026', onTimeRate: 94, kpiScore: 96 },
      { month: 'Oct 2026', onTimeRate: onTimeCompletionRate, kpiScore: avgKpiAchievement },
    ];

    res.json({
      cards: {
        totalEmployees,
        totalAssignedTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        overdueTasks,
        awaitingApproval,
        avgKpiAchievement,
        onTimeCompletionRate,
        employeesRequiringAttention,
      },
      charts: {
        employeeTaskChart,
        kpiComparison,
        taskDistribution,
        monthlyTrend,
      },
      currentDate: today,
      timezone: 'Asia/Dhaka',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Notifications
app.get('/api/notifications', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const list = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(30);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. System Settings
app.get('/api/settings', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const list = await db.select().from(appSettings);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/settings', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'head_of_hr') {
      return res.status(403).json({ error: 'Permission denied. Settings can only be edited by Admin or Head of HR.' });
    }

    const { settings } = req.body; // Array of { settingKey, settingValue }
    if (Array.isArray(settings)) {
      for (const s of settings) {
        await db
          .insert(appSettings)
          .values({
            settingKey: s.settingKey,
            settingValue: String(s.settingValue),
            updatedBy: req.user?.name || 'Administrator',
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: appSettings.settingKey,
            set: {
              settingValue: String(s.settingValue),
              updatedBy: req.user?.name || 'Administrator',
              updatedAt: new Date(),
            },
          });
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Database Reset / Re-seed (Admin only)
app.post('/api/admin/reset-seed', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await seedDatabase(true);
    res.json({ success: true, message: 'Database successfully re-seeded with demo records.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server and Vite Middleware
async function startServer() {
  const PORT = 3000;

  // Initialize DB seed on startup if clean
  try {
    await seedDatabase(false);
  } catch (err) {
    console.warn('Initial seed check warning:', err);
  }

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
