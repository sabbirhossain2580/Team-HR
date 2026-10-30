// src/components/Sidebar.tsx
import React from 'react';
import {
  LayoutDashboard,
  AlertOctagon,
  Users,
  CheckSquare,
  Clock,
  History,
  FileCheck,
  Settings,
  ShieldAlert,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export type NavTab =
  | 'dashboard'
  | 'tasks'
  | 'my-tasks'
  | 'pending-approvals'
  | 'poked-overdue'
  | 'employees'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  overdueCount: number;
  pendingApprovalCount: number;
  pokedCount: number;
  myTaskCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  overdueCount,
  pendingApprovalCount,
  pokedCount,
  myTaskCount,
}) => {
  const { activePersona } = useAuth();

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | null;
    badgeColor?: string;
    subtext?: string;
    adminOnly?: boolean;
  }> = [
    {
      id: 'dashboard',
      label: 'Main Dashboard',
      icon: LayoutDashboard,
      subtext: 'Task overview & metrics',
    },
    {
      id: 'tasks',
      label: 'All Tasks Register',
      icon: CheckSquare,
      subtext: 'Assignments, progress & reviews',
    },
    {
      id: 'my-tasks',
      label: 'My Assigned Tasks',
      icon: UserCheck,
      badge: myTaskCount > 0 ? myTaskCount : null,
      badgeColor: 'bg-indigo-600 text-white',
      subtext: `Tasks for ${activePersona.name.split(' ')[0]}`,
    },
    {
      id: 'pending-approvals',
      label: 'Pending Approvals',
      icon: FileCheck,
      badge: pendingApprovalCount > 0 ? pendingApprovalCount : null,
      badgeColor: 'bg-amber-500 text-slate-900 font-bold',
      subtext: 'Submitted tasks for review',
    },
    {
      id: 'poked-overdue',
      label: 'Poked & Overdue (লাল তালিকা)',
      icon: ShieldAlert,
      badge: pokedCount + overdueCount > 0 ? pokedCount + overdueCount : null,
      badgeColor: 'bg-red-600 text-white animate-pulse font-bold',
      subtext: 'Urgent follow-ups & delays',
    },
    {
      id: 'employees',
      label: 'HR Team Directory',
      icon: Users,
      subtext: '6 HR members & workloads',
    },
    {
      id: 'reports',
      label: 'Reports & Export',
      icon: FileSpreadsheet,
      subtext: 'Export Excel & CSV reports',
    },
    {
      id: 'settings',
      label: 'System Admin Settings',
      icon: Settings,
      subtext: 'Organization configuration',
      adminOnly: true,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between py-4 text-slate-300">
      <div className="space-y-1 px-3">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Task Management
        </div>

        {navItems.map((item) => {
          if (item.adminOnly && activePersona.role !== 'admin') {
            return null;
          }

          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs transition group ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'hover:bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 transition ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                  }`}
                />
                <div className="truncate">
                  <div className="leading-tight truncate">{item.label}</div>
                  {item.subtext && (
                    <div
                      className={`text-[10px] truncate ${
                        isActive ? 'text-indigo-200' : 'text-slate-500'
                      }`}
                    >
                      {item.subtext}
                    </div>
                  )}
                </div>
              </div>

              {item.badge != null && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-2 shrink-0 ${
                    item.badgeColor || 'bg-slate-800 text-slate-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Logged in Employee Quick Profile Card */}
      <div className="px-3 pt-4 border-t border-slate-800">
        <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/60">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Current Session
          </div>
          <div className="font-bold text-slate-100 text-xs mt-0.5 truncate">
            {activePersona.name}
          </div>
          <div className="text-[11px] text-indigo-400 truncate">{activePersona.designation}</div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
            <span>ID:</span>
            <span className="font-mono text-amber-400 font-bold">{activePersona.employeeCode}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {activePersona.canDelete ? (
              <span className="text-[9px] bg-red-900/60 text-red-200 px-1.5 py-0.5 rounded font-mono">
                Can Delete
              </span>
            ) : (
              <span className="text-[9px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                No Delete Access
              </span>
            )}
            {activePersona.canPoke && (
              <span className="text-[9px] bg-amber-900/60 text-amber-200 px-1.5 py-0.5 rounded font-mono">
                Can Poke
              </span>
            )}
            {activePersona.canApprove ? (
              <span className="text-[9px] bg-purple-900/60 text-purple-200 px-1.5 py-0.5 rounded font-mono">
                Approver
              </span>
            ) : (
              <span className="text-[9px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                Submit Only
              </span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
