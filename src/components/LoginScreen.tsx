// src/components/LoginScreen.tsx
import React, { useState } from 'react';
import { Building2, Lock, User, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const LoginScreen: React.FC = () => {
  const { loginWithCredentials } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = loginWithCredentials(employeeId, password);
    if (!result.success) {
      setError(result.message || 'Invalid Employee ID or Password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center items-center p-4 selection:bg-indigo-600 selection:text-white">
      {/* Background Subtle Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-slate-900 text-white p-6 sm:p-8 text-center relative border-b border-slate-800">
            <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-100">
              RENAISSANCE GROUP
            </h1>
            <div className="inline-block mt-1 bg-slate-800 text-amber-400 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
              Department of Human Resources (HR)
            </div>
            <p className="text-xs text-slate-400 mt-2">
              HR Task &amp; Responsibility Performance System
            </p>
          </div>

          {/* Form Body */}
          <div className="p-6 sm:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-base font-bold text-slate-900">Sign In to Your Account</h2>
              <p className="text-xs text-slate-500 mt-1">
                Please enter your Employee ID &amp; Password
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-xs text-red-700 font-medium animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Employee ID
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Enter your Employee ID"
                    value={employeeId}
                    onChange={(e) => {
                      setEmployeeId(e.target.value);
                      setError('');
                    }}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-sm disabled:opacity-70 mt-2"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center space-x-2 text-slate-400 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Confidential &amp; Proprietary • Renaissance Group</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 text-center text-xs text-slate-400">
          For technical or password issues, contact your HR System Administrator.
        </div>
      </div>
    </div>
  );
};
