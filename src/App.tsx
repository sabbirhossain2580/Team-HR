// src/App.tsx
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { OverdueAlertCenter } from './components/OverdueAlertCenter.tsx';
import { EmployeeDirectoryView } from './components/EmployeeDirectoryView.tsx';
import { ResponsibilitiesView } from './components/ResponsibilitiesView.tsx';
import { TaskRegisterView } from './components/TaskRegisterView.tsx';
import { ReportsExportView } from './components/ReportsExportView.tsx';
import { AdminSetupWizardView } from './components/AdminSetupWizardView.tsx';
import { NotificationsModal } from './components/NotificationsModal.tsx';
import { api } from './lib/api.ts';
import {
  Employee,
  Task,
  KPI,
  Responsibility,
  DashboardStats,
  NotificationItem,
  AppSetting,
  PerformanceRankItem,
} from './types/index.ts';

const MainAppContent: React.FC = () => {
  const { activePersona, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Application Data States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>([]);
  const [rankings, setRankings] = useState<PerformanceRankItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);

  // Notifications modal
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Load all data from API
  const loadData = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const [
        dashStatsRes,
        empListRes,
        taskListRes,
        kpiListRes,
        respListRes,
        rankDataRes,
        notifListRes,
        settingsListRes,
      ] = await Promise.allSettled([
        api.getDashboardStats(),
        api.getEmployees(),
        api.getTasks(),
        api.getKpis(),
        api.getResponsibilities(),
        api.getRankings(),
        api.getNotifications(),
        api.getSettings(),
      ]);

      if (dashStatsRes.status === 'fulfilled') setStats(dashStatsRes.value);
      if (empListRes.status === 'fulfilled') setEmployees(empListRes.value);
      if (taskListRes.status === 'fulfilled') setTasks(taskListRes.value);
      if (kpiListRes.status === 'fulfilled') setKpis(kpiListRes.value);
      if (respListRes.status === 'fulfilled') setResponsibilities(respListRes.value);
      if (rankDataRes.status === 'fulfilled') {
        setRankings(rankDataRes.value.rankings || []);
      }
      if (notifListRes.status === 'fulfilled') setNotifications(notifListRes.value || []);
      if (settingsListRes.status === 'fulfilled') setSettings(settingsListRes.value || []);
    } catch (error) {
      console.error('Failed to load portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [activePersona, isAuthenticated]);

  // If not authenticated, require Employee ID & Password entry (no password hints!)
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Overdue, Poked & Assigned counts
  const overdueCount = tasks.filter((t) => t.isOverdue).length;
  const pokedCount = tasks.filter((t) => t.isPoked).length;
  const pendingApprovalCount = tasks.filter(
    (t) => t.status === 'Submitted for Review' || t.approvalStatus === 'Pending Review'
  ).length;

  const currentEmpId = employees.find((e) => e.employeeCode === activePersona.employeeCode)?.id;
  const myTaskCount = tasks.filter(
    (t) =>
      t.employeeCode === activePersona.employeeCode ||
      (currentEmpId != null && t.assignedEmployeeId === currentEmpId) ||
      t.employeeName?.toLowerCase() === activePersona.name.toLowerCase()
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-600 selection:text-white">
      {/* Top Corporate Navbar with Live Asia/Dhaka Status */}
      <Navbar
        overdueCount={overdueCount}
        notifications={notifications}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onNavigateToOverdue={() => setActiveTab('poked-overdue')}
      />

      {/* Main Workspace with Sidebar & Active View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="hidden md:flex">
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            overdueCount={overdueCount}
            pendingApprovalCount={pendingApprovalCount}
            pokedCount={pokedCount}
            myTaskCount={myTaskCount}
          />
        </div>

        {/* Dynamic Main Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                stats={stats}
                tasks={tasks}
                employees={employees}
                loading={loading}
                onNavigateToOverdue={() => setActiveTab('poked-overdue')}
                onNavigateToTasks={() => setActiveTab('tasks')}
                onNavigateToKpis={() => setActiveTab('tasks')}
              />
            )}

            {activeTab === 'tasks' && (
              <TaskRegisterView
                tasks={tasks}
                employees={employees}
                responsibilities={responsibilities}
                viewMode="all"
                onRefresh={loadData}
                onCreateTask={async (data) => {
                  await api.createTask(data);
                  await loadData();
                }}
                onUpdateTask={async (id, data) => {
                  await api.updateTask(id, data);
                  await loadData();
                }}
                onDeleteTask={async (id) => {
                  await api.deleteTask(id);
                  await loadData();
                }}
                onSubmitTask={async (id, data) => {
                  await api.submitTask(id, data);
                  await loadData();
                }}
                onReviewTask={async (id, data) => {
                  await api.reviewTask(id, data);
                  await loadData();
                }}
                onRequestExtension={async (id, data) => {
                  await api.requestExtension(id, data);
                  await loadData();
                }}
                onDecideExtension={async (id, data) => {
                  await api.decideExtension(id, data);
                  await loadData();
                }}
              />
            )}

            {activeTab === 'my-tasks' && (
              <TaskRegisterView
                tasks={tasks}
                employees={employees}
                responsibilities={responsibilities}
                viewMode="my-tasks"
                onRefresh={loadData}
                onCreateTask={async (data) => {
                  await api.createTask(data);
                  await loadData();
                }}
                onUpdateTask={async (id, data) => {
                  await api.updateTask(id, data);
                  await loadData();
                }}
                onDeleteTask={async (id) => {
                  await api.deleteTask(id);
                  await loadData();
                }}
                onSubmitTask={async (id, data) => {
                  await api.submitTask(id, data);
                  await loadData();
                }}
                onReviewTask={async (id, data) => {
                  await api.reviewTask(id, data);
                  await loadData();
                }}
                onRequestExtension={async (id, data) => {
                  await api.requestExtension(id, data);
                  await loadData();
                }}
                onDecideExtension={async (id, data) => {
                  await api.decideExtension(id, data);
                  await loadData();
                }}
              />
            )}

            {activeTab === 'pending-approvals' && (
              <TaskRegisterView
                tasks={tasks}
                employees={employees}
                responsibilities={responsibilities}
                viewMode="pending-approvals"
                onRefresh={loadData}
                onCreateTask={async (data) => {
                  await api.createTask(data);
                  await loadData();
                }}
                onUpdateTask={async (id, data) => {
                  await api.updateTask(id, data);
                  await loadData();
                }}
                onDeleteTask={async (id) => {
                  await api.deleteTask(id);
                  await loadData();
                }}
                onSubmitTask={async (id, data) => {
                  await api.submitTask(id, data);
                  await loadData();
                }}
                onReviewTask={async (id, data) => {
                  await api.reviewTask(id, data);
                  await loadData();
                }}
                onRequestExtension={async (id, data) => {
                  await api.requestExtension(id, data);
                  await loadData();
                }}
                onDecideExtension={async (id, data) => {
                  await api.decideExtension(id, data);
                  await loadData();
                }}
              />
            )}

            {activeTab === 'poked-overdue' && (
              <TaskRegisterView
                tasks={tasks}
                employees={employees}
                responsibilities={responsibilities}
                viewMode="poked-overdue"
                onRefresh={loadData}
                onCreateTask={async (data) => {
                  await api.createTask(data);
                  await loadData();
                }}
                onUpdateTask={async (id, data) => {
                  await api.updateTask(id, data);
                  await loadData();
                }}
                onDeleteTask={async (id) => {
                  await api.deleteTask(id);
                  await loadData();
                }}
                onSubmitTask={async (id, data) => {
                  await api.submitTask(id, data);
                  await loadData();
                }}
                onReviewTask={async (id, data) => {
                  await api.reviewTask(id, data);
                  await loadData();
                }}
                onRequestExtension={async (id, data) => {
                  await api.requestExtension(id, data);
                  await loadData();
                }}
                onDecideExtension={async (id, data) => {
                  await api.decideExtension(id, data);
                  await loadData();
                }}
              />
            )}

            {activeTab === 'employees' && (
              <EmployeeDirectoryView
                employees={employees}
                tasks={tasks}
                kpis={kpis}
                responsibilities={responsibilities}
                onRefresh={loadData}
                onCreateEmployee={async (data) => {
                  await api.createEmployee(data);
                  await loadData();
                }}
                onUpdateEmployee={async (id, data) => {
                  await api.updateEmployee(id, data);
                  await loadData();
                }}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsExportView
                tasks={tasks}
                employees={employees}
                kpis={kpis}
                responsibilities={responsibilities}
                rankings={rankings}
              />
            )}

            {activeTab === 'settings' && (
              <AdminSetupWizardView
                settings={settings}
                employees={employees}
                onRefresh={loadData}
                onUpdateSettings={async (settingsList) => {
                  await api.updateSettings(settingsList);
                  await loadData();
                }}
                onResetSeed={async () => {
                  await api.resetSeed();
                  await loadData();
                }}
              />
            )}
          </div>
        </main>
      </div>

      {/* Notifications Drawer */}
      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkRead={async (id) => {
          await api.markNotificationRead(id);
          loadData();
        }}
        onNavigateToTask={(taskId) => {
          setActiveTab('tasks');
          setNotificationsOpen(false);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
