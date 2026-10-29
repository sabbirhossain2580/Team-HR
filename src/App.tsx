// src/App.tsx
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { OverdueAlertCenter } from './components/OverdueAlertCenter.tsx';
import { EmployeeDirectoryView } from './components/EmployeeDirectoryView.tsx';
import { ResponsibilitiesView } from './components/ResponsibilitiesView.tsx';
import { TaskRegisterView } from './components/TaskRegisterView.tsx';
import { KpiManagementView } from './components/KpiManagementView.tsx';
import { MonthlyPerformanceView } from './components/MonthlyPerformanceView.tsx';
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
  DelayCategory,
} from './types/index.ts';

const MainAppContent: React.FC = () => {
  const { activePersona } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Application Data States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>([]);
  const [rankings, setRankings] = useState<PerformanceRankItem[]>([]);
  const [methodology, setMethodology] = useState<any>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);

  // Notifications modal
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Load all data from API
  const loadData = async () => {
    try {
      setLoading(true);
      const [
        dashStats,
        empList,
        taskList,
        kpiList,
        respList,
        rankData,
        notifList,
        settingsList,
      ] = await Promise.all([
        api.getDashboardStats(),
        api.getEmployees(),
        api.getTasks(),
        api.getKpis(),
        api.getResponsibilities(),
        api.getRankings(),
        api.getNotifications(),
        api.getSettings(),
      ]);

      setStats(dashStats);
      setEmployees(empList);
      setTasks(taskList);
      setKpis(kpiList);
      setResponsibilities(respList);
      setRankings(rankData.rankings);
      setMethodology(rankData.methodology);
      setNotifications(notifList);
      setSettings(settingsList);
    } catch (error) {
      console.error('Failed to load portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activePersona]);

  // Overdue count calculation
  const overdueCount = tasks.filter((t) => t.isOverdue).length;
  const pendingApprovalCount = tasks.filter(
    (t) => t.status === 'Submitted for Review' || t.approvalStatus === 'Pending Review'
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-600 selection:text-white">
      {/* Top Corporate Navbar with Live Asia/Dhaka Status & Multi-Role Switcher */}
      <Navbar
        overdueCount={overdueCount}
        notifications={notifications}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onNavigateToOverdue={() => setActiveTab('overdue')}
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
                onNavigateToOverdue={() => setActiveTab('overdue')}
                onNavigateToTasks={() => setActiveTab('tasks')}
                onNavigateToKpis={() => setActiveTab('kpis')}
              />
            )}

            {activeTab === 'overdue' && (
              <OverdueAlertCenter
                tasks={tasks}
                onRefresh={loadData}
                onSubmitDelayReason={async (taskId, reason, category) => {
                  await api.updateTask(taskId, {
                    delayReason: reason,
                    delayCategory: category,
                  });
                }}
                onRequestExtension={async (taskId, newDeadline, category, reason) => {
                  await api.requestExtension(taskId, {
                    requestedDeadline: newDeadline,
                    reasonCategory: category,
                    detailedReason: reason,
                  });
                }}
                onAddManagerComment={async (taskId, comment) => {
                  await api.updateTask(taskId, { managerComments: comment });
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
                }}
                onUpdateEmployee={async (id, data) => {
                  await api.updateEmployee(id, data);
                }}
              />
            )}

            {activeTab === 'responsibilities' && (
              <ResponsibilitiesView
                responsibilities={responsibilities}
                employees={employees}
                onRefresh={loadData}
                onCreateResponsibility={async (data) => {
                  await api.createResponsibility(data);
                }}
                onUpdateResponsibility={async (id, data) => {
                  await api.updateResponsibility(id, data);
                }}
              />
            )}

            {activeTab === 'tasks' && (
              <TaskRegisterView
                tasks={tasks}
                employees={employees}
                responsibilities={responsibilities}
                onRefresh={loadData}
                onCreateTask={async (data) => {
                  await api.createTask(data);
                }}
                onUpdateTask={async (id, data) => {
                  await api.updateTask(id, data);
                }}
                onSubmitTask={async (id, data) => {
                  await api.submitTask(id, data);
                }}
                onReviewTask={async (id, data) => {
                  await api.reviewTask(id, data);
                }}
                onRequestExtension={async (id, data) => {
                  await api.requestExtension(id, data);
                }}
                onDecideExtension={async (id, data) => {
                  await api.decideExtension(id, data);
                }}
              />
            )}

            {activeTab === 'kpis' && (
              <KpiManagementView
                kpis={kpis}
                employees={employees}
                onRefresh={loadData}
                onCreateKpi={async (data) => {
                  await api.createKpi(data);
                }}
                onSubmitKpi={async (id, data) => {
                  await api.submitKpi(id, data);
                }}
                onReviewKpi={async (id, data) => {
                  await api.reviewKpi(id, data);
                }}
                onApproveKpi={async (id, data) => {
                  await api.approveKpi(id, data);
                }}
              />
            )}

            {activeTab === 'ranking' && (
              <MonthlyPerformanceView
                rankings={rankings}
                methodology={methodology}
                onRefresh={loadData}
                onUpdateWeights={async (kpiWeight, taskWeight) => {
                  await api.updateSettings([
                    { settingKey: 'scoring_kpi_weight', settingValue: String(kpiWeight) },
                    { settingKey: 'scoring_task_weight', settingValue: String(taskWeight) },
                  ]);
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
                }}
                onResetSeed={async () => {
                  await api.resetSeed();
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
