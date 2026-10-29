// src/components/Sidebar.tsx
import React from 'react';
import {
  LayoutDashboard,
  AlertOctagon,
  Users,
  BookOpen,
  CheckSquare,
  Target,
  Trophy,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export type NavTab =
  | 'dashboard'
  | 'overdue'
  | 'employees'
  | 'responsibilities'
  | 'tasks'
  | 'kpis'
  | 'ranking'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  overdueCount: number;
  pendingApprovalCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  overdueCount,
  pendingApprovalCount,
}) => {
  const { activePersona } = useAuth();

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | null;
    badgeColor?: string;
    subtext?: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Main Dashboard',
      icon: LayoutDashboard,
      subtext: 'Executive metrics & analytics',
    },
    {
      id: 'overdue',
      label: 'Critical Overdue Alert',
      icon: AlertOctagon,
      badge: overdueCount > 0 ? overdueCount : null,
      badgeColor: 'bg-red-600 text-white animate-pulse',
      subtext: 'Accountability & delay reasons',
    },
    {
      id: 'employees',
      label: 'Employee Directory',
      icon: Users,
      subtext: '5 team members & Head of HR',
    },
    {
      id: 'responsibilities',
      label: 'Job Responsibilities',
      icon: BookOpen,
      subtext: 'Recurring duty register',
    },
    {
      id: 'tasks',
      label: 'Task Management',
      icon: CheckSquare,
      badge: pendingApprovalCount > 0 ? pendingApprovalCount : null,
      badgeColor: 'bg-amber-500 text-slate-900',
      subtext: 'Assignments, progress & reviews',
    },
    {
      id: 'kpis',
      label: 'KPI Management',
      icon: Target,
      subtext: 'Monthly targets & evaluations',
    },
    {
      id: 'ranking',
      label: 'Monthly Performance',
      icon: Trophy,
      subtext: 'Configurable ranking & scoring',
    },
    {
      id: 'reports',
      label: 'Reports & Exports',
      icon: FileSpreadsheet,
      subtext: 'Excel & PDF corporate exports',
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Settings,
      subtext: 'Scoring, roles & setup wizard',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
      <div className="py-4">
        {/* Navigation list */}
        <div className="px-3 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3">
            Core Management
          </span>
        </div>
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center space-x-3 text-left truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <div className="truncate">
                    <div className="leading-tight truncate">{item.label}</div>
                  </div>
                </div>
                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                      item.badgeColor || 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Role permission info card */}
      <div className="p-3 m-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
        <div className="flex items-center space-x-2 text-slate-300 mb-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-[11px] text-slate-200">Active Permissions</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
          Logged in as <strong className="text-slate-200">{activePersona.name}</strong> ({activePersona.designation})
        </p>
        <div className="text-[10px] text-slate-400 border-t border-slate-700/60 pt-2 flex items-center justify-between">
          <span>Enterprise Database</span>
          <span className="text-emerald-400 font-mono">PostgreSQL</span>
        </div>
      </div>
    </aside>
  );
};
