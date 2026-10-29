// src/components/EmployeeDirectoryView.tsx
import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Briefcase,
  GitBranch,
  CheckCircle,
  AlertOctagon,
  Clock,
  Target,
  Edit2,
  ChevronRight,
  Shield,
  Search,
} from 'lucide-react';
import { Employee, Task, KPI, Responsibility } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface EmployeeDirectoryViewProps {
  employees: Employee[];
  tasks: Task[];
  kpis: KPI[];
  responsibilities: Responsibility[];
  onRefresh: () => void;
  onCreateEmployee: (data: Partial<Employee>) => Promise<void>;
  onUpdateEmployee: (id: number, data: Partial<Employee>) => Promise<void>;
}

export const EmployeeDirectoryView: React.FC<EmployeeDirectoryViewProps> = ({
  employees,
  tasks,
  kpis,
  responsibilities,
  onRefresh,
  onCreateEmployee,
  onUpdateEmployee,
}) => {
  const { activePersona } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [actionLoading, setActionLoading] = useState(false);

  const canManage = activePersona.role === 'admin' || activePersona.role === 'head_of_hr';

  const filteredEmployees = employees.filter((emp) => {
    const q = searchTerm.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.designation.toLowerCase().includes(q) ||
      emp.employeeCode.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q)
    );
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await onCreateEmployee(formData);
      setCreateModalOpen(false);
      setFormData({});
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    try {
      setActionLoading(true);
      await onUpdateEmployee(selectedEmployee.id, formData);
      setEditModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">HR &amp; OD Employee Directory</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            5 core team members, designated Head of HR, reporting hierarchy &amp; performance profiles
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search employee, designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg w-56 md:w-64 bg-white"
            />
          </div>

          {canManage && (
            <button
              onClick={() => {
                setFormData({
                  employeeCode: `EMP-00${employees.length + 1}`,
                  status: 'active',
                  department: 'Human Resources & OD',
                });
                setCreateModalOpen(true);
              }}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEmployees.map((emp) => {
          const empTasks = tasks.filter((t) => t.assignedEmployeeId === emp.id);
          const empKpis = kpis.filter((k) => k.employeeId === emp.id);
          const empResps = responsibilities.filter((r) => r.employeeId === emp.id);
          const overdueCount = empTasks.filter((t) => t.isOverdue).length;

          return (
            <div
              key={emp.id}
              className={`bg-white rounded-xl border transition shadow-xs hover:shadow-md flex flex-col justify-between ${
                emp.isHeadOfHr
                  ? 'border-purple-300 ring-2 ring-purple-100'
                  : overdueCount > 0
                  ? 'border-red-300'
                  : 'border-slate-200'
              }`}
            >
              <div className="p-5">
                {/* Top Info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                        emp.isHeadOfHr
                          ? 'bg-purple-600 text-white'
                          : 'bg-gradient-to-br from-slate-700 to-indigo-800 text-white'
                      }`}
                    >
                      {emp.avatarInitials || emp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h3 className="font-bold text-sm text-slate-900">{emp.name}</h3>
                        {emp.isHeadOfHr && (
                          <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded uppercase border border-purple-200">
                            Head of HR
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-600">{emp.designation}</p>
                      <span className="font-mono text-[11px] text-slate-400">{emp.employeeCode}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      emp.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {emp.status}
                  </span>
                </div>

                {/* Reporting Line */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center space-x-2 text-xs text-slate-600">
                  <GitBranch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-[11px]">
                    Reports to: <strong className="text-slate-800">{emp.reportingManagerName || 'Board / MD'}</strong>
                  </span>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 mt-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] font-medium text-slate-500">Tasks</span>
                    <div className="text-sm font-bold text-slate-800">{emp.totalTasks || 0}</div>
                    <span className="text-[10px] text-emerald-600">{emp.completedTasks || 0} done</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-slate-500">Overdue</span>
                    <div className={`text-sm font-extrabold ${overdueCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                      {overdueCount}
                    </div>
                    <span className="text-[10px] text-slate-400">tasks</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-slate-500">KPI Avg</span>
                    <div className="text-sm font-bold text-purple-700">
                      {emp.avgKpiAchievement !== null && emp.avgKpiAchievement !== undefined
                        ? `${emp.avgKpiAchievement}%`
                        : '—'}
                    </div>
                    <span className="text-[10px] text-slate-400">weighted</span>
                  </div>
                </div>

                {/* Task Completion Progress Bar */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Task Completion Rate</span>
                    <span className="font-semibold text-slate-700">{emp.taskCompletionRate || 0}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${emp.taskCompletionRate || 0}%` }}
                      className="h-full bg-emerald-500 rounded-full transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="bg-slate-50/70 border-t border-slate-100 px-5 py-2.5 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {empResps.length} Ongoing Responsibilit{empResps.length === 1 ? 'y' : 'ies'}
                </span>
                <div className="flex items-center space-x-2">
                  {canManage && (
                    <button
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setFormData({
                          name: emp.name,
                          designation: emp.designation,
                          department: emp.department,
                          reportingManagerId: emp.reportingManagerId,
                          reportingManagerName: emp.reportingManagerName,
                          status: emp.status,
                          isHeadOfHr: emp.isHeadOfHr,
                        });
                        setEditModalOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 transition"
                      title="Edit Profile"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedEmployee(emp)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1"
                  >
                    <span>Profile Dossier</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* EMPLOYEE DOSSIER DRAWER / MODAL */}
      {selectedEmployee && !editModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-14 h-14 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-lg">
                  {selectedEmployee.avatarInitials}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold">{selectedEmployee.name}</h2>
                    {selectedEmployee.isHeadOfHr && (
                      <span className="text-[10px] bg-purple-500/30 text-purple-200 font-bold px-2 py-0.5 rounded uppercase border border-purple-400">
                        Head of HR
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">{selectedEmployee.designation}</p>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1">
                    <span>ID: {selectedEmployee.employeeCode}</span>
                    <span>•</span>
                    <span>Email: {selectedEmployee.email}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Scrollable details */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs divide-y divide-slate-100">
              {/* Assigned Responsibilities */}
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                  Assigned Ongoing Job Responsibilities
                </h4>
                <div className="space-y-2">
                  {responsibilities
                    .filter((r) => r.employeeId === selectedEmployee.id)
                    .map((resp) => (
                      <div key={resp.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>{resp.title}</span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono">
                            {resp.frequency}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1">{resp.description}</p>
                        <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
                          <span>Deliverable: {resp.expectedDeliverable}</span>
                          <span className="text-slate-400">{resp.category}</span>
                        </div>
                      </div>
                    ))}
                  {responsibilities.filter((r) => r.employeeId === selectedEmployee.id).length === 0 && (
                    <p className="text-slate-400 italic">No responsibilities assigned yet.</p>
                  )}
                </div>
              </div>

              {/* Monthly KPI Targets */}
              <div className="pt-4">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                  Monthly KPI Targets (October 2026)
                </h4>
                <div className="space-y-2">
                  {kpis
                    .filter((k) => k.employeeId === selectedEmployee.id)
                    .map((kpi) => (
                      <div key={kpi.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800">{kpi.title}</div>
                          <div className="text-slate-500 text-[11px]">
                            Target: {kpi.targetValue} {kpi.unit} • Weight: {kpi.weight}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-indigo-700">
                            {kpi.approvedAchievementPercentage !== null ? `${kpi.approvedAchievementPercentage}%` : 'Pending'}
                          </div>
                          <span className="text-[10px] text-slate-400">{kpi.submissionStatus}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Current Tasks */}
              <div className="pt-4">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                  Active Tasks &amp; Status
                </h4>
                <div className="space-y-2">
                  {tasks
                    .filter((t) => t.assignedEmployeeId === selectedEmployee.id)
                    .map((task) => (
                      <div
                        key={task.id}
                        className={`p-3 rounded-lg border flex items-center justify-between ${
                          task.isOverdue ? 'bg-red-50/70 border-red-200' : 'bg-slate-50 border-slate-200/70'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-800 flex items-center space-x-2">
                            <span>{task.title}</span>
                            {task.isOverdue && (
                              <span className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.2 rounded uppercase">
                                Overdue ({task.daysOverdue}d)
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 text-[11px]">Deadline: {task.effectiveDeadline}</div>
                        </div>
                        <span className="font-semibold text-slate-700">{task.status}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE EMPLOYEE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Add New Team Member</h3>
            <p className="text-xs text-slate-500 mt-1">Authorized creation for Renaissance HR &amp; OD</p>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employee ID Code</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeCode || ''}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Corporate Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@renaissance.com.bd"
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={formData.designation || ''}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="Executive, HR"
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department || 'Human Resources & OD'}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reporting Manager</label>
                <select
                  value={formData.reportingManagerId || ''}
                  onChange={(e) => {
                    const manager = employees.find((emp) => emp.id === parseInt(e.target.value, 10));
                    setFormData({
                      ...formData,
                      reportingManagerId: e.target.value,
                      reportingManagerName: manager ? manager.name : '',
                    });
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="">Select Reporting Manager</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="headOfHrCheck"
                  checked={formData.isHeadOfHr || false}
                  onChange={(e) => setFormData({ ...formData, isHeadOfHr: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="headOfHrCheck" className="text-slate-700 font-medium">
                  Assign as Head of HR supervisory role
                </label>
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
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {actionLoading ? 'Saving...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {editModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Edit Employee Profile</h3>
            <p className="text-xs text-slate-500 mt-1">{selectedEmployee.name} ({selectedEmployee.employeeCode})</p>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={formData.designation || ''}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reporting Manager</label>
                <select
                  value={formData.reportingManagerId || ''}
                  onChange={(e) => {
                    const manager = employees.find((emp) => emp.id === parseInt(e.target.value, 10));
                    setFormData({
                      ...formData,
                      reportingManagerId: e.target.value,
                      reportingManagerName: manager ? manager.name : '',
                    });
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="">No Reporting Manager (Top Supervisory)</option>
                  {employees
                    .filter((emp) => emp.id !== selectedEmployee.id)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.designation})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="editHeadCheck"
                  checked={formData.isHeadOfHr || false}
                  onChange={(e) => setFormData({ ...formData, isHeadOfHr: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="editHeadCheck" className="text-slate-700 font-medium">
                  Configured Head of HR supervisory role
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {actionLoading ? 'Updating...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
