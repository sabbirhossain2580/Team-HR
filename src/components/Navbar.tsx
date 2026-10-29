// src/components/Navbar.tsx
import React, { useState } from 'react';
import { useAuth, PRESET_PERSONAS, PersonaOption } from '../context/AuthContext.tsx';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  ChevronDown,
  Shield,
  Clock,
  Sparkles,
  LogOut,
  Building2,
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
  const { user, activePersona, switchPersona, loginWithGoogle, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const roleLabelMap: Record<string, { label: string; bg: string; text: string }> = {
    head_of_hr: { label: 'Head of HR', bg: 'bg-purple-100 text-purple-900 border-purple-300', text: 'text-purple-700' },
    hr_manager: { label: 'HR Manager', bg: 'bg-blue-100 text-blue-900 border-blue-300', text: 'text-blue-700' },
    employee: { label: 'HR Employee', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300', text: 'text-emerald-700' },
    admin: { label: 'System Admin', bg: 'bg-slate-100 text-slate-900 border-slate-300', text: 'text-slate-700' },
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
          <p className="text-xs text-slate-400 hidden sm:block">Task, Responsibility &amp; KPI Performance Management System</p>
        </div>
      </div>

      {/* Middle Status / Timezone info */}
      <div className="hidden lg:flex items-center space-x-4 bg-slate-800/70 border border-slate-700/60 rounded-full px-4 py-1.5 text-xs text-slate-300">
        <div className="flex items-center space-x-1.5 text-amber-400">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-medium">Asia/Dhaka</span>
        </div>
        <span className="text-slate-500">•</span>
        <span>Corporate Cutoff: 23:59</span>
        <span className="text-slate-500">•</span>
        <span className="text-slate-200 font-medium">Cycle: October 2026</span>
      </div>

      {/* Right Controls: Overdue Alert button, Notifications, Persona Switcher */}
      <div className="flex items-center space-x-3">
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

        {/* Quick Persona / Role Switcher for Multi-Role Verification */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 transition"
          >
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
              {activePersona.avatarInitials}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold leading-tight">{activePersona.name}</div>
              <div className="text-[10px] text-slate-400">{activePersona.designation}</div>
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${currentRoleStyle.bg}`}>
              {currentRoleStyle.label}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Persona Selection Dropdown */}
          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-80 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2"
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Switch Active Role / User</span>
                  <p className="text-[11px] text-slate-500">Test multi-role permissions &amp; access control</p>
                </div>
                <Shield className="w-4 h-4 text-indigo-600" />
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {PRESET_PERSONAS.map((persona) => {
                  const isSelected = activePersona.email === persona.email;
                  const roleBadge = roleLabelMap[persona.role];
                  return (
                    <button
                      key={persona.id}
                      onClick={() => {
                        switchPersona(persona);
                        setDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition ${
                        isSelected ? 'bg-indigo-50/70' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {persona.avatarInitials}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                            <span>{persona.name}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                          </div>
                          <div className="text-[11px] text-slate-500">{persona.designation}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{persona.email}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${roleBadge.bg}`}>
                        {roleBadge.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 px-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={loginWithGoogle}
                  className="flex items-center space-x-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Google Sign-In</span>
                </button>
                <button
                  onClick={logout}
                  className="flex items-center space-x-1 text-xs text-slate-500 hover:text-red-600 font-medium px-2 py-1 rounded"
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
