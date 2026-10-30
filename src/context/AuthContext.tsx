// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Employee } from '../types/index.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';
import { api } from '../lib/api.ts';

export interface PersonaOption {
  id: string;
  name: string;
  designation: string;
  role: UserRole;
  email: string;
  employeeCode: string;
  avatarInitials: string;
  canDelete: boolean;
  canPoke: boolean;
  canApprove: boolean;
  isRestrictedAdmin?: boolean;
  password: string;
}

export const PRESET_PERSONAS: PersonaOption[] = [
  {
    id: '01-02-0440',
    name: 'Syeda Shaila Ashraf',
    designation: 'Head of HR',
    role: 'head_of_hr',
    email: 'syeda.shaila@renaissance.com.bd',
    employeeCode: '01-02-0440',
    avatarInitials: 'SA',
    canDelete: true,
    canPoke: true,
    canApprove: true,
    password: 'shaila#nexus940821',
  },
  {
    id: '22-02-1826',
    name: 'Shahriyar Naiem',
    designation: 'Manager, HR & OD',
    role: 'hr_manager',
    email: 'shahriyar.naiem@renaissance.com.bd',
    employeeCode: '22-02-1826',
    avatarInitials: 'SN',
    canDelete: true,
    canPoke: true,
    canApprove: true,
    password: 'naiem!falcon718305',
  },
  {
    id: '22-02-1330',
    name: 'Quazi Nuzhat Rahman',
    designation: 'Senior Executive, HR',
    role: 'employee',
    email: 'quazi.nuzhat@renaissance.com.bd',
    employeeCode: '22-02-1330',
    avatarInitials: 'QN',
    canDelete: false,
    canPoke: false,
    canApprove: false,
    password: 'nuzhat$zenith649218',
  },
  {
    id: '22-02-1642',
    name: 'Sabbir Hossain',
    designation: 'Executive, HR',
    role: 'employee',
    email: 'sabbir.hossain@renaissance.com.bd',
    employeeCode: '22-02-1642',
    avatarInitials: 'SH',
    canDelete: false,
    canPoke: false,
    canApprove: false,
    password: 'sabbir@hulk2874026',
  },
  {
    id: '02-02-2059',
    name: 'Fariha Nasmi',
    designation: 'Assistant Executive, HR',
    role: 'employee',
    email: 'fariha.nasmi@renaissance.com.bd',
    employeeCode: '02-02-2059',
    avatarInitials: 'FN',
    canDelete: false,
    canPoke: false,
    canApprove: false,
    password: 'fariha@rg5578926',
  },
  {
    id: '22-02-1551',
    name: 'Maisha Islam',
    designation: 'Assistant Executive, HR',
    role: 'employee',
    email: 'maisha.islam@renaissance.com.bd',
    employeeCode: '22-02-1551',
    avatarInitials: 'MI',
    canDelete: false,
    canPoke: false,
    canApprove: false,
    password: 'maisha*aurora392150',
  },
  {
    id: '02-02-2222',
    name: 'System Administrator',
    designation: 'System Administrator (IT & HR Systems)',
    role: 'admin',
    email: 'admin@renaissance.com.bd',
    employeeCode: '02-02-2222',
    avatarInitials: 'SA',
    canDelete: true,
    canPoke: true,
    canApprove: true,
    isRestrictedAdmin: true,
    password: 'admin#rgRoot992026!',
  },
];

// Helper to normalize employee codes for comparisons
export function normalizeEmpCode(code: string): string {
  return code.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  activePersona: PersonaOption;
  isAuthenticated: boolean;
  loading: boolean;
  canDelete: boolean;
  canPoke: boolean;
  canApprove: boolean;
  isAdmin: boolean;
  loginWithCredentials: (empId: string, password: string) => { success: boolean; message?: string };
  logout: () => Promise<void>;
  switchPersona: (persona: PersonaOption) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check if previously authenticated in this session
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('hr_authenticated');
      return stored === 'true';
    }
    return false;
  });

  const [activePersona, setActivePersona] = useState<PersonaOption>(() => {
    if (typeof window !== 'undefined') {
      const savedCode = sessionStorage.getItem('hr_active_emp_code') || localStorage.getItem('hr_active_emp_code');
      if (savedCode) {
        const match = PRESET_PERSONAS.find(
          (p) => normalizeEmpCode(p.employeeCode) === normalizeEmpCode(savedCode)
        );
        if (match) return match;
      }
    }
    return PRESET_PERSONAS[0];
  });

  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await api.getMe();
      setUser(res.user);
      setEmployee(res.employee);
    } catch (err) {
      console.error('Error loading current profile:', err);
      setUser({
        uid: `user-${activePersona.employeeCode}`,
        email: activePersona.email,
        name: activePersona.name,
        role: activePersona.role,
        employeeCode: activePersona.employeeCode,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('hr_active_role', activePersona.role);
      localStorage.setItem('hr_active_email', activePersona.email);
      localStorage.setItem('hr_active_emp_code', activePersona.employeeCode);
      sessionStorage.setItem('hr_active_emp_code', activePersona.employeeCode);
      fetchProfile();
    }
  }, [activePersona, isAuthenticated]);

  const loginWithCredentials = (inputCode: string, inputPassword: string): { success: boolean; message?: string } => {
    const rawCode = inputCode.trim();
    const normalizedCode = normalizeEmpCode(rawCode);
    const rawPass = inputPassword.trim();

    if (!rawCode || !rawPass) {
      return {
        success: false,
        message: 'Please enter both your Employee ID and Password.',
      };
    }

    // Find persona matching the employee code
    const matched = PRESET_PERSONAS.find(
      (p) =>
        normalizeEmpCode(p.employeeCode) === normalizedCode ||
        p.employeeCode.toLowerCase() === rawCode.toLowerCase()
    );

    if (!matched) {
      return {
        success: false,
        message: 'Invalid Employee ID. Please check and try again.',
      };
    }

    // Verify individual password
    if (matched.password !== rawPass) {
      return {
        success: false,
        message: 'Incorrect password. Access denied.',
      };
    }

    // Authentication succeeded
    setActivePersona(matched);
    setIsAuthenticated(true);
    sessionStorage.setItem('hr_authenticated', 'true');
    sessionStorage.setItem('hr_active_emp_code', matched.employeeCode);
    localStorage.setItem('hr_active_role', matched.role);
    localStorage.setItem('hr_active_email', matched.email);
    localStorage.setItem('hr_active_emp_code', matched.employeeCode);

    return { success: true };
  };

  const switchPersona = (persona: PersonaOption) => {
    // Only Admin can switch between accounts!
    if (activePersona.role !== 'admin' && activePersona.employeeCode !== '02-02-2222') {
      console.warn('Unauthorized persona switch blocked. Only Admin can switch accounts.');
      return;
    }
    setActivePersona(persona);
    localStorage.setItem('hr_active_role', persona.role);
    localStorage.setItem('hr_active_email', persona.email);
    localStorage.setItem('hr_active_emp_code', persona.employeeCode);
    sessionStorage.setItem('hr_active_emp_code', persona.employeeCode);
  };

  const logout = async () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('hr_authenticated');
    sessionStorage.removeItem('hr_active_emp_code');
    sessionStorage.removeItem('hr_firebase_id_token');
    try {
      await fbSignOut(auth);
    } catch (e) {
      // ignore
    }
  };

  const isAdmin = activePersona.role === 'admin' || activePersona.employeeCode === '02-02-2222';

  const canDelete =
    isAdmin ||
    activePersona.role === 'head_of_hr' ||
    activePersona.role === 'hr_manager' ||
    activePersona.employeeCode === '01-02-0440' ||
    activePersona.employeeCode === '22-02-1826';

  const canPoke =
    isAdmin ||
    activePersona.role === 'head_of_hr' ||
    activePersona.role === 'hr_manager' ||
    activePersona.employeeCode === '01-02-0440' ||
    activePersona.employeeCode === '22-02-1826';

  const canApprove =
    isAdmin ||
    activePersona.role === 'head_of_hr' ||
    activePersona.role === 'hr_manager' ||
    activePersona.employeeCode === '01-02-0440' ||
    activePersona.employeeCode === '22-02-1826';

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        activePersona,
        isAuthenticated,
        loading,
        canDelete,
        canPoke,
        canApprove,
        isAdmin,
        loginWithCredentials,
        logout,
        switchPersona,
        refreshUser: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
