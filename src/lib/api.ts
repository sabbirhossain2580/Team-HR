// src/lib/api.ts
import {
  Employee,
  Responsibility,
  Task,
  KPI,
  DashboardStats,
  NotificationItem,
  AppSetting,
  PerformanceRankItem,
  User,
} from '../types/index.ts';

// Get current auth headers
function getHeaders(customRole?: string, customEmail?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const idToken = sessionStorage.getItem('hr_firebase_id_token');
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const role = customRole || localStorage.getItem('hr_active_role') || 'head_of_hr';
  const email = customEmail || localStorage.getItem('hr_active_email') || 'syeda.shaila@renaissance.com.bd';
  const empCode = localStorage.getItem('hr_active_emp_code') || '01-02-0440';

  headers['x-demo-role'] = role;
  headers['x-demo-email'] = email;
  headers['x-demo-employee-code'] = empCode;

  return headers;
}

export const api = {
  // Current user
  async getMe(): Promise<{ user: User; employee: Employee | null }> {
    const res = await fetch('/api/me', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to get user profile');
    return res.json();
  },

  // Employees
  async getEmployees(): Promise<Employee[]> {
    const res = await fetch('/api/employees', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch employees');
    return res.json();
  },

  async createEmployee(data: Partial<Employee>): Promise<Employee> {
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create employee');
    }
    return res.json();
  },

  async updateEmployee(id: number, data: Partial<Employee>): Promise<Employee> {
    const res = await fetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update employee');
    }
    return res.json();
  },

  // Responsibilities
  async getResponsibilities(): Promise<Responsibility[]> {
    const res = await fetch('/api/responsibilities', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch responsibilities');
    return res.json();
  },

  async createResponsibility(data: Partial<Responsibility>): Promise<Responsibility> {
    const res = await fetch('/api/responsibilities', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create responsibility');
    }
    return res.json();
  },

  async updateResponsibility(id: number, data: Partial<Responsibility>): Promise<Responsibility> {
    const res = await fetch(`/api/responsibilities/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update responsibility');
    }
    return res.json();
  },

  // Tasks
  async getTasks(): Promise<Task[]> {
    const res = await fetch('/api/tasks', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async createTask(data: any): Promise<Task> {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create task');
    }
    return res.json();
  },

  async updateTask(id: number, data: any): Promise<Task> {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update task');
    }
    return res.json();
  },

  async deleteTask(id: number): Promise<void> {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete task');
    }
  },

  async submitTask(id: number, data: { completionNotes: string; attachments?: string }): Promise<Task> {
    const res = await fetch(`/api/tasks/${id}/submit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit task');
    }
    return res.json();
  },

  async reviewTask(id: number, data: { decision: 'approve' | 'reject' | 'revision'; managerComments: string }): Promise<Task> {
    const res = await fetch(`/api/tasks/${id}/review`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to review task');
    }
    return res.json();
  },

  async pokeTask(id: number): Promise<Task> {
    const res = await fetch(`/api/tasks/${id}/poke`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to poke task');
    }
    return res.json();
  },

  async unpokeTask(id: number): Promise<Task> {
    const res = await fetch(`/api/tasks/${id}/unpoke`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to clear poke');
    }
    return res.json();
  },

  async requestExtension(id: number, data: { requestedDeadline: string; reasonCategory: string; detailedReason: string }): Promise<any> {
    const res = await fetch(`/api/tasks/${id}/request-extension`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to request extension');
    }
    return res.json();
  },

  async decideExtension(id: number, data: { requestId?: number; decision: 'approve' | 'reject'; reviewerComments?: string; approvedDeadline?: string }): Promise<any> {
    const res = await fetch(`/api/tasks/${id}/decide-extension`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to decide on extension');
    }
    return res.json();
  },

  async getTaskHistory(id: number): Promise<{ logs: any[]; extensions: any[] }> {
    const res = await fetch(`/api/tasks/${id}/history`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to get task history');
    return res.json();
  },

  // KPIs
  async getKpis(): Promise<KPI[]> {
    const res = await fetch('/api/kpis', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch KPIs');
    return res.json();
  },

  async createKpi(data: any): Promise<KPI> {
    const res = await fetch('/api/kpis', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create KPI');
    }
    return res.json();
  },

  async submitKpi(id: number, data: { actualValue: number; evidenceNotes?: string }): Promise<KPI> {
    const res = await fetch(`/api/kpis/${id}/submit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit KPI actuals');
    }
    return res.json();
  },

  async reviewKpi(id: number, data: { status: 'Recommended' | 'Revision Requested'; comments?: string }): Promise<KPI> {
    const res = await fetch(`/api/kpis/${id}/review`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to review KPI');
    }
    return res.json();
  },

  async approveKpi(id: number, data: { approvedPercentage: number; reviewStatus?: string }): Promise<KPI> {
    const res = await fetch(`/api/kpis/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to approve KPI');
    }
    return res.json();
  },

  async deleteKpi(id: number): Promise<any> {
    const res = await fetch(`/api/kpis/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete KPI');
    }
    return res.json();
  },

  // Rankings
  async getRankings(): Promise<{ methodology: any; rankings: PerformanceRankItem[] }> {
    const res = await fetch('/api/performance/ranking', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch performance rankings');
    return res.json();
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch('/api/dashboard/stats', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const res = await fetch('/api/notifications', { headers: getHeaders() });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async markNotificationRead(id: number): Promise<void> {
    await fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: getHeaders(),
    });
  },

  // Settings
  async getSettings(): Promise<AppSetting[]> {
    const res = await fetch('/api/settings', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: Array<{ settingKey: string; settingValue: string }>): Promise<void> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ settings }),
    });
    if (!res.ok) throw new Error('Failed to update settings');
  },

  // Reset seed
  async resetSeed(): Promise<void> {
    const res = await fetch('/api/admin/reset-seed', {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to reset demo data');
  },
};
