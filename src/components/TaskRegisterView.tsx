// src/components/TaskRegisterView.tsx
import React, { useState } from 'react';
import {
  CheckSquare,
  PlusCircle,
  Search,
  Filter,
  Clock,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  History,
  FileText,
  User,
  Send,
  Calendar,
  Layers,
  ChevronRight,
  Shield,
  MessageSquare,
} from 'lucide-react';
import {
  Task,
  Employee,
  Responsibility,
  TaskPriority,
  TaskStatus,
  DelayCategory,
} from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';

interface TaskRegisterViewProps {
  tasks: Task[];
  employees: Employee[];
  responsibilities: Responsibility[];
  onRefresh: () => void;
  onCreateTask: (data: any) => Promise<void>;
  onUpdateTask: (id: number, data: any) => Promise<void>;
  onSubmitTask: (id: number, data: { completionNotes: string; attachments?: string }) => Promise<void>;
  onReviewTask: (id: number, data: { decision: 'approve' | 'reject' | 'revision'; managerComments: string }) => Promise<void>;
  onRequestExtension: (id: number, data: { requestedDeadline: string; reasonCategory: string; detailedReason: string }) => Promise<void>;
  onDecideExtension: (id: number, data: { requestId?: number; decision: 'approve' | 'reject'; reviewerComments?: string; approvedDeadline?: string }) => Promise<void>;
}

export const TaskRegisterView: React.FC<TaskRegisterViewProps> = ({
  tasks,
  employees,
  responsibilities,
  onRefresh,
  onCreateTask,
  onUpdateTask,
  onSubmitTask,
  onReviewTask,
  onRequestExtension,
  onDecideExtension,
}) => {
  const { activePersona } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskAuditHistory, setTaskAuditHistory] = useState<{ logs: any[]; extensions: any[] }>({ logs: [], extensions: [] });

  // Form states
  const [createForm, setCreateForm] = useState<any>({
    priority: 'Medium',
    originalDeadline: '2026-11-15',
  });
  const [completionNotes, setCompletionNotes] = useState('');
  const [reviewDecision, setReviewDecision] = useState<'approve' | 'reject' | 'revision'>('approve');
  const [reviewComments, setReviewComments] = useState('');
  const [extensionDeadline, setExtensionDeadline] = useState('');
  const [extensionReasonCategory, setExtensionReasonCategory] = useState('Dependency on another department');
  const [extensionReasonText, setExtensionReasonText] = useState('');
  const [newProgress, setNewProgress] = useState(0);
  const [newDelayReason, setNewDelayReason] = useState('');
  const [newDelayCategory, setNewDelayCategory] = useState<DelayCategory>('Workload conflict');

  const [loadingAction, setLoadingAction] = useState(false);

  const canCreate = activePersona.role !== 'employee';
  const canReview = activePersona.role !== 'employee';

  const filteredTasks = tasks.filter((t) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      t.title.toLowerCase().includes(q) ||
      t.taskCode.toLowerCase().includes(q) ||
      (t.employeeName && t.employeeName.toLowerCase().includes(q)) ||
      t.description.toLowerCase().includes(q);

    const matchStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'Overdue'
        ? t.isOverdue
        : t.status === statusFilter;

    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchEmployee = employeeFilter === 'all' || t.assignedEmployeeId === parseInt(employeeFilter, 10);

    return matchSearch && matchStatus && matchPriority && matchEmployee;
  });

  const openHistory = async (task: Task) => {
    setSelectedTask(task);
    try {
      const res = await api.getTaskHistory(task.id);
      setTaskAuditHistory(res);
      setHistoryModalOpen(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoadingAction(true);
      await onCreateTask(createForm);
      setCreateModalOpen(false);
      setCreateForm({ priority: 'Medium', originalDeadline: '2026-11-15' });
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      setLoadingAction(true);
      await onSubmitTask(selectedTask.id, { completionNotes });
      setSubmitModalOpen(false);
      setCompletionNotes('');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      setLoadingAction(true);
      await onReviewTask(selectedTask.id, {
        decision: reviewDecision,
        managerComments: reviewComments,
      });
      setReviewModalOpen(false);
      setReviewComments('');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleExtensionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      setLoadingAction(true);
      await onRequestExtension(selectedTask.id, {
        requestedDeadline: extensionDeadline,
        reasonCategory: extensionReasonCategory,
        detailedReason: extensionReasonText,
      });
      setExtensionModalOpen(false);
      setExtensionDeadline('');
      setExtensionReasonText('');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      setLoadingAction(true);
      await onUpdateTask(selectedTask.id, {
        progressPercent: newProgress,
        delayReason: newDelayReason || undefined,
        delayCategory: newDelayReason ? newDelayCategory : undefined,
        status: newProgress === 100 ? 'Submitted for Review' : newProgress > 0 ? 'In Progress' : 'Not Started',
      });
      setProgressModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300 font-bold';
      case 'High':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      case 'Medium':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (t: Task) => {
    if (t.isOverdue) {
      return (
        <span className="bg-red-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow-xs uppercase inline-flex items-center space-x-1">
          <AlertOctagon className="w-3 h-3" />
          <span>OVERDUE ({t.daysOverdue}d)</span>
        </span>
      );
    }

    switch (t.status) {
      case 'Completed':
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded uppercase">
            Completed
          </span>
        );
      case 'Submitted for Review':
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px] px-2 py-0.5 rounded uppercase">
            Under Review
          </span>
        );
      case 'Revision Required':
        return (
          <span className="bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[10px] px-2 py-0.5 rounded uppercase">
            Revision Needed
          </span>
        );
      case 'In Progress':
        return (
          <span className="bg-blue-100 text-blue-800 border border-blue-300 font-medium text-[10px] px-2 py-0.5 rounded uppercase">
            In Progress
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-300 font-medium text-[10px] px-2 py-0.5 rounded uppercase">
            {t.status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Task Assignment &amp; Tracking Register</h1>
              <p className="text-xs md:text-sm text-slate-500">
                Detailed task assignments, progress tracking, managerial reviews, and accountability workflow
              </p>
            </div>
          </div>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setCreateForm({
                assignedEmployeeId: employees[1]?.id || '',
                priority: 'High',
                startDate: '2026-10-29',
                originalDeadline: '2026-11-10',
              });
              setCreateModalOpen(true);
            }}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create &amp; Assign Task</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search task code, title, employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white transition"
          />
        </div>

        <select
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700"
        >
          <option value="all">All Assignees</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 font-medium"
        >
          <option value="all">All Statuses</option>
          <option value="Overdue" className="text-red-600 font-bold">
            🚨 Overdue Tasks Only
          </option>
          <option value="In Progress">In Progress</option>
          <option value="Submitted for Review">Submitted for Review</option>
          <option value="Revision Required">Revision Required</option>
          <option value="Completed">Completed</option>
          <option value="Not Started">Not Started</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700"
        >
          <option value="all">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Task ID</th>
                <th className="py-3 px-4">Task Title &amp; Duty Scope</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Deadlines (Asia/Dhaka)</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map((task) => (
                <tr
                  key={task.id}
                  className={`hover:bg-slate-50/70 transition ${
                    task.isOverdue ? 'bg-red-50/20 hover:bg-red-50/40' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                    {task.taskCode}
                  </td>
                  <td className="py-3.5 px-4 max-w-sm">
                    <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                      <span>{task.title}</span>
                    </div>
                    <p className="text-slate-500 line-clamp-1 mt-0.5">{task.description}</p>
                    {task.delayReason && (
                      <div className="text-[10px] text-red-700 font-medium mt-1 bg-red-50 p-1 rounded border border-red-200">
                        Delay: {task.delayReason}
                      </div>
                    )}
                    {task.managerComments && (
                      <div className="text-[10px] text-blue-700 font-medium mt-1 bg-blue-50 p-1 rounded border border-blue-200">
                        Reviewer: {task.managerComments}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-800">{task.employeeName}</div>
                    <div className="text-[11px] text-slate-400">{task.employeeDesignation}</div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${getPriorityBadge(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-medium text-slate-800">Due: {task.originalDeadline}</div>
                    {task.revisedDeadline && (
                      <div className="text-[10px] font-bold text-indigo-700">Revised: {task.revisedDeadline}</div>
                    )}
                    {task.completionDate && (
                      <div className="text-[10px] text-emerald-600 font-semibold">Done: {task.completionDate}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="w-24">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-700 mb-0.5">
                        <span>{task.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${task.progressPercent}%` }}
                          className={`h-full rounded-full ${
                            task.isOverdue
                              ? 'bg-red-500'
                              : task.progressPercent === 100
                              ? 'bg-emerald-500'
                              : 'bg-blue-500'
                          }`}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(task)}</td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-1.5">
                      {/* Update progress */}
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setNewProgress(task.progressPercent);
                          setNewDelayReason(task.delayReason || '');
                          setProgressModalOpen(true);
                        }}
                        className="p-1 text-slate-500 hover:text-indigo-600 rounded transition"
                        title="Update Progress & Delay Reason"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      {/* Submit for review */}
                      {task.status !== 'Completed' && (
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setCompletionNotes(task.employeeCompletionNotes || '');
                            setSubmitModalOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-emerald-600 rounded transition"
                          title="Submit Task for Manager Review"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Manager Review */}
                      {canReview && (task.status === 'Submitted for Review' || task.approvalStatus === 'Pending Review' || task.isOverdue) && (
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setReviewDecision('approve');
                            setReviewComments('');
                            setReviewModalOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-amber-600 rounded transition"
                          title="Manager Review & Approval"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Request Extension */}
                      {task.status !== 'Completed' && (
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setExtensionDeadline(task.effectiveDeadline);
                            setExtensionModalOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-purple-600 rounded transition"
                          title="Request Deadline Extension"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* History & Audit */}
                      <button
                        onClick={() => openHistory(task)}
                        className="p-1 text-slate-500 hover:text-slate-900 rounded transition"
                        title="View Immutable Audit Trail"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CREATE TASK */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Create &amp; Assign Task</h3>
            <p className="text-xs text-slate-500 mt-1">Assign task under Renaissance HR &amp; OD</p>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={createForm.title || ''}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Conduct Q4 Supervisory Leadership Workshop"
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Task Scope &amp; Deliverables</label>
                <textarea
                  rows={3}
                  required
                  value={createForm.description || ''}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Detailed instructions, milestones, and expected deliverables..."
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assign to Employee</label>
                  <select
                    required
                    value={createForm.assignedEmployeeId || ''}
                    onChange={(e) => setCreateForm({ ...createForm, assignedEmployeeId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="">Select Assignee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.designation})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={createForm.priority || 'Medium'}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={createForm.startDate || '2026-10-29'}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Deadline (Asia/Dhaka)</label>
                  <input
                    type="date"
                    required
                    value={createForm.originalDeadline || ''}
                    onChange={(e) => setCreateForm({ ...createForm, originalDeadline: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Linked Ongoing Job Responsibility</label>
                <select
                  value={createForm.relatedResponsibilityId || ''}
                  onChange={(e) => setCreateForm({ ...createForm, relatedResponsibilityId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="">No linked responsibility</option>
                  {responsibilities.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.responsibilityCode}] {r.title} ({r.employeeName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {loadingAction ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUBMIT TASK FOR REVIEW */}
      {submitModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Submit Task for Manager Review</h3>
            <p className="text-xs text-slate-500 mt-1">
              {selectedTask.taskCode} • {selectedTask.title}
            </p>

            <form onSubmit={handleSubmitReview} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Completion Notes &amp; Summary</label>
                <textarea
                  rows={4}
                  required
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Detail your completed deliverables, links to dossiers, or verification outcomes..."
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {loadingAction ? 'Submitting...' : 'Submit Completion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: MANAGER REVIEW DECISION */}
      {reviewModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Managerial Review &amp; Sign-off</h3>
            <p className="text-xs text-slate-500 mt-1">
              Task: {selectedTask.title} • Assignee: {selectedTask.employeeName}
            </p>

            <form onSubmit={handleDecisionSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Review Decision</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDecision('approve')}
                    className={`py-2 px-3 rounded-lg border font-bold text-center transition ${
                      reviewDecision === 'approve'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Approve (Completed)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision('revision')}
                    className={`py-2 px-3 rounded-lg border font-bold text-center transition ${
                      reviewDecision === 'revision'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Request Revision
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision('reject')}
                    className={`py-2 px-3 rounded-lg border font-bold text-center transition ${
                      reviewDecision === 'reject'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Manager Comments &amp; Feedback</label>
                <textarea
                  rows={3}
                  required
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="State evaluation remarks, approval notes, or specific clauses to revise..."
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {loadingAction ? 'Recording...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: REQUEST EXTENSION */}
      {extensionModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Request Deadline Extension</h3>
            <p className="text-xs text-slate-500 mt-1">
              Current Deadline: <strong className="text-slate-800">{selectedTask.effectiveDeadline}</strong> (Original: {selectedTask.originalDeadline} will remain preserved)
            </p>

            <form onSubmit={handleExtensionSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Requested Extended Deadline</label>
                <input
                  type="date"
                  required
                  value={extensionDeadline}
                  onChange={(e) => setExtensionDeadline(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason Category</label>
                <select
                  value={extensionReasonCategory}
                  onChange={(e) => setExtensionReasonCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="Dependency on another department">Dependency on another department</option>
                  <option value="Waiting for approval">Waiting for approval</option>
                  <option value="Incomplete information or data">Incomplete information or data</option>
                  <option value="Resource constraints">Resource constraints</option>
                  <option value="Unexpected urgent assignment">Unexpected urgent assignment</option>
                  <option value="Technical issue">Technical issue</option>
                  <option value="Workload conflict">Workload conflict</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Detailed Written Justification</label>
                <textarea
                  rows={3}
                  required
                  value={extensionReasonText}
                  onChange={(e) => setExtensionReasonText(e.target.value)}
                  placeholder="Explain dependencies, constraints, or unforeseen circumstances..."
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExtensionModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {loadingAction ? 'Submitting...' : 'Submit Extension Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: UPDATE PROGRESS & DELAY REASON */}
      {progressModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Update Task Progress &amp; Delays</h3>
            <p className="text-xs text-slate-500 mt-1">{selectedTask.title}</p>

            <form onSubmit={handleProgressSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Execution Progress: {newProgress}%</label>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={newProgress}
                  onChange={(e) => setNewProgress(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Delay Reason (If impeded or behind schedule)</label>
                <textarea
                  rows={3}
                  value={newDelayReason}
                  onChange={(e) => setNewDelayReason(e.target.value)}
                  placeholder="Record obstacle or external dependency..."
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              {newDelayReason && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Delay Category</label>
                  <select
                    value={newDelayCategory}
                    onChange={(e) => setNewDelayCategory(e.target.value as DelayCategory)}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="Dependency on another department">Dependency on another department</option>
                    <option value="Waiting for approval">Waiting for approval</option>
                    <option value="Incomplete information or data">Incomplete information or data</option>
                    <option value="Resource constraints">Resource constraints</option>
                    <option value="Unexpected urgent assignment">Unexpected urgent assignment</option>
                    <option value="Technical issue">Technical issue</option>
                    <option value="Workload conflict">Workload conflict</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProgressModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {loadingAction ? 'Saving...' : 'Update Progress'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: IMMUTABLE AUDIT TRAIL & TASK HISTORY */}
      {historyModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-slate-900 text-white flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs bg-slate-800 text-indigo-400 px-2 py-0.5 rounded font-bold">
                    {selectedTask.taskCode}
                  </span>
                  <h3 className="text-sm font-bold">{selectedTask.title}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Assigned to: {selectedTask.employeeName} • Original Deadline: {selectedTask.originalDeadline}
                  {selectedTask.revisedDeadline && ` • Approved Revised Deadline: ${selectedTask.revisedDeadline}`}
                </p>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Extensions Record */}
              {taskAuditHistory.extensions.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Deadline Extension Decisions</span>
                  </h4>
                  <div className="space-y-2">
                    {taskAuditHistory.extensions.map((ext: any) => (
                      <div key={ext.id} className="p-3 bg-amber-50/50 rounded-lg border border-amber-200">
                        <div className="flex items-center justify-between font-bold">
                          <span>Requested: {ext.requestedDeadline} (from {ext.currentDeadline})</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded uppercase ${
                              ext.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ext.status === 'Rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ext.status}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1">Reason: {ext.detailedReason} [{ext.reasonCategory}]</p>
                        {ext.reviewerComments && (
                          <div className="text-[11px] text-slate-700 mt-1 font-medium">
                            Decision note by {ext.reviewerName}: {ext.reviewerComments}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chronological Audit Logs */}
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3 flex items-center space-x-1.5">
                  <History className="w-4 h-4 text-indigo-600" />
                  <span>Chronological Immutable Audit Log</span>
                </h4>
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {taskAuditHistory.logs.map((log: any) => (
                    <div key={log.id} className="relative space-y-1">
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800">{log.actionSummary}</span>
                        <span className="text-slate-400 font-mono">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Performed by: <strong className="text-slate-700">{log.performedBy}</strong>
                      </div>
                      {log.newValue && (
                        <div className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 font-mono">
                          Value: {log.newValue}
                        </div>
                      )}
                    </div>
                  ))}
                  {taskAuditHistory.logs.length === 0 && (
                    <p className="text-slate-400 italic">No previous modifications logged.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
