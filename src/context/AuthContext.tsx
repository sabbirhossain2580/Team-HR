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
  employeeCode?: string;
  avatarInitials: string;
}

export const PRESET_PERSONAS: PersonaOption[] = [
  {
    id: 'head-hr',
    name: 'Dr. Kazi Mahbubur Rahman',
    designation: 'Head of HR & OD',
    role: 'head_of_hr',
    email: 'head.hr@renaissance.com.bd',
    employeeCode: 'EMP-000',
    avatarInitials: 'KM',
  },
  {
    id: 'mgr-shahriyar',
    name: 'Shahriyar Naiem',
    designation: 'Manager, HR & OD',
    role: 'hr_manager',
    email: 'shahriyar.naiem@renaissance.com.bd',
    employeeCode: 'EMP-001',
    avatarInitials: 'SN',
  },
  {
    id: 'exec-nuzhat',
    name: 'Quazi Nuzhat Rahman',
    designation: 'Senior Executive, HR',
    role: 'employee',
    email: 'quazi.nuzhat@renaissance.com.bd',
    employeeCode: 'EMP-002',
    avatarInitials: 'QN',
  },
  {
    id: 'exec-sabbir',
    name: 'Sabbir Hossain',
    designation: 'Executive, HR',
    role: 'employee',
    email: 'sabbir.hossain@renaissance.com.bd',
    employeeCode: 'EMP-003',
    avatarInitials: 'SH',
  },
  {
    id: 'asst-maisha',
    name: 'Maisha Islam',
    designation: 'Assistant Executive, HR',
    role: 'employee',
    email: 'maisha.islam@renaissance.com.bd',
    employeeCode: 'EMP-004',
    avatarInitials: 'MI',
  },
  {
    id: 'asst-fariha',
    name: 'Fariha Nasmi',
    designation: 'Assistant Executive, HR',
    role: 'employee',
    email: 'fariha.nasmi@renaissance.com.bd',
    employeeCode: 'EMP-005',
    avatarInitials: 'FN',
  },
  {
    id: 'admin',
    name: 'System Administrator',
    designation: 'IT & System Admin',
    role: 'admin',
    email: 'admin@renaissance.com.bd',
    employeeCode: 'ADMIN-01',
    avatarInitials: 'SA',
  },
];

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  activePersona: PersonaOption;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  switchPersona: (persona: PersonaOption) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePersona, setActivePersona] = useState<PersonaOption>(() => {
    const savedEmail = localStorage.getItem('hr_active_email');
    const matched = PRESET_PERSONAS.find((p) => p.email === savedEmail);
    return matched || PRESET_PERSONAS[0];
  });

  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.getMe();
      setUser(res.user);
      setEmployee(res.employee);
    } catch (err) {
      console.error('Error loading current profile:', err);
      // Fallback to active persona
      setUser({
        uid: `demo-${activePersona.email}`,
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
    // Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const token = await fbUser.getIdToken();
        sessionStorage.setItem('hr_firebase_id_token', token);
      } else {
        sessionStorage.removeItem('hr_firebase_id_token');
      }
      fetchProfile();
    });

    return () => unsubscribe();
  }, [activePersona]);

  const switchPersona = (persona: PersonaOption) => {
    localStorage.setItem('hr_active_role', persona.role);
    localStorage.setItem('hr_active_email', persona.email);
    setActivePersona(persona);
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const token = await result.user.getIdToken();
      sessionStorage.setItem('hr_firebase_id_token', token);
      await fetchProfile();
    } catch (error) {
      console.error('Google Sign In failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
      sessionStorage.removeItem('hr_firebase_id_token');
      await fetchProfile();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        activePersona,
        loading,
        loginWithGoogle,
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
