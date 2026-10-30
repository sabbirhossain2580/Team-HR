import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Bell,
  AlertTriangle,
  ChevronDown,
  Clock,
  LogOut,
  Building2,
  ShieldCheck,
  User,
} from 'lucide-react';
import { NotificationItem } from '../types/index.ts';

interface NavbarProps {
  overdueCount: number;
  notifications: NotificationItem[];
  onOpenNotifications: () => void;
  onNavigateToOverdue: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  overdueCount,
  notifications,
  onOpenNotifications,
  onNavigateToOverdue,
}) => {
  const {
    activePersona,
    logout,
  } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const roleLabelMap: Record<string, { label: string; bg: string; text: string }> = {
    head_of_hr: { label: 'Head of HR', bg: 'bg-purple-100 text-purple-900 border-purple-300', text: 'text-purple-700' },
    hr_manager: { label: 'HR Manager', bg: 'bg-blue-100 text-blue-900 border-blue-300', text: 'text-blue-700' },
    employee: { label: 'HR Executive', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300', text: 'text-emerald-700' },
    admin: { label: 'System Admin', bg: 'bg-rose-100 text-rose-900 border-rose-300', text: 'text-rose-700' },
  };

  const currentRoleStyle = roleLabelMap[activePersona.role] || roleLabelMap.employee;

  return (
    <header className="h-16 bg-slate-900 text-white border-b border-slate-800 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Brand & Department */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold tracking-tight text-base md:text-lg text-slate-100">RENAISSANCE GROUP</span>
            <span className="text-xs bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
              HR &amp; OD
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">Task &amp; Follow-up Management System</p>
        </div>
      </div>

      {/* Middle Status / Timezone info */}
      <div className="hidden lg:flex items-center space-x-4 bg-slate-800/70 border border-slate-700/60 rounded-full px-4 py-1.5 text-xs text-slate-300">
        <div className="flex items-center space-x-1.5 text-amber-400">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-medium">Asia/Dhaka</span>
        </div>
        <span className="text-slate-500">•</span>
        <span>Cutoff: 23:59</span>
        <span className="text-slate-500">•</span>
        <span className="text-slate-200 font-medium">Logged in ID: <span className="font-mono text-amber-400 font-bold">{activePersona.employeeCode}</span></span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Critical Overdue Alert Trigger */}
        {overdueCount > 0 && (
          <button
            onClick={onNavigateToOverdue}
            className="flex items-center space-x-1.5 bg-red-600/90 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition animate-pulse border border-red-500"
            title="View Critical Overdue Tasks"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{overdueCount} Overdue</span>
          </button>
        )}

        {/* Notifications */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-amber-500 text-slate-900 font-bold rounded-full text-[10px] flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Current Active Persona / Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 transition"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[11px]">
              {activePersona.avatarInitials}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold leading-tight">
                {activePersona.name}
              </div>
              <div className="text-[10px] text-amber-300 font-mono">ID: {activePersona.employeeCode}</div>
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${currentRoleStyle.bg}`}>
              {currentRoleStyle.label}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User Menu Dropdown: Clean Profile Card & Sign Out (No employee switcher) */}
          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-72 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2"
              onMouseLeave={() => setDropdownOpen(false)}
            >
              {/* Profile Card Header */}
              <div className="px-4 pb-3 border-b border-slate-100 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
                  {activePersona.avatarInitials}
                </div>
                <div className="flex-1 truncate">
                  <div className="text-xs font-bold text-slate-900 truncate">{activePersona.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{activePersona.designation}</div>
                  <div className="text-[10px] text-indigo-700 font-mono font-bold mt-0.5">
                    ID: {activePersona.employeeCode}
                  </div>
                </div>
              </div>

              {/* Profile details */}
              <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Department:</span>
                  <strong className="text-slate-800">Human Resources (HR)</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Role:</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${currentRoleStyle.bg}`}>
                    {currentRoleStyle.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Session:</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 inline mr-0.5" />
                    <span>Authenticated</span>
                  </span>
                </div>
              </div>

              {/* Sign Out Button */}
              <div className="pt-2 px-3 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Renaissance HR</span>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
