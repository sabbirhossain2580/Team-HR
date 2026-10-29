// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users, employees } from '../db/schema.ts';
import { eq, or } from 'drizzle-orm';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  name: string;
  role: 'head_of_hr' | 'hr_manager' | 'employee' | 'admin';
  employeeCode?: string;
  employeeId?: number;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const devRoleHeader = req.headers['x-demo-role'] as string | undefined;
  const devEmailHeader = req.headers['x-demo-email'] as string | undefined;

  let email = '';
  let name = '';
  let uid = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
      email = decoded.email || '';
      name = decoded.name || email.split('@')[0];
    } catch {
      // In case token verification fails or fallback is provided
      if (devEmailHeader) {
        email = devEmailHeader;
        name = devEmailHeader.split('@')[0];
        uid = `demo-${email}`;
      } else {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
    }
  } else if (devEmailHeader || devRoleHeader) {
    // Authenticated demo / role selector for quick testing across the 4 specified roles
    email = devEmailHeader || 'admin@renaissance.com.bd';
    name = email.split('@')[0].replace('.', ' ').toUpperCase();
    uid = `demo-${email}`;
  } else {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  try {
    // Fetch user or associate with employee
    const existingUsers = await db.select().from(users).where(eq(users.email, email));
    let currentUser = existingUsers[0];

    // Find matching employee by email if exists
    const matchingEmployees = await db.select().from(employees).where(eq(employees.email, email));
    const matchingEmp = matchingEmployees[0];

    if (!currentUser) {
      // Determine default role
      let role: 'head_of_hr' | 'hr_manager' | 'employee' | 'admin' = 'employee';
      if (devRoleHeader && ['head_of_hr', 'hr_manager', 'employee', 'admin'].includes(devRoleHeader)) {
        role = devRoleHeader as any;
      } else if (email.includes('admin')) {
        role = 'admin';
      } else if (matchingEmp?.isHeadOfHr) {
        role = 'head_of_hr';
      } else if (matchingEmp?.designation.toLowerCase().includes('manager')) {
        role = 'hr_manager';
      }

      const inserted = await db.insert(users).values({
        uid: uid || `usr-${Date.now()}`,
        email,
        name: matchingEmp ? matchingEmp.name : name,
        role,
        employeeCode: matchingEmp ? matchingEmp.employeeCode : undefined,
      }).returning();
      currentUser = inserted[0];
    } else if (devRoleHeader && ['head_of_hr', 'hr_manager', 'employee', 'admin'].includes(devRoleHeader)) {
      // If client explicitly switched active testing role
      currentUser.role = devRoleHeader;
    }

    req.user = {
      uid: currentUser.uid,
      email: currentUser.email,
      name: currentUser.name,
      role: (devRoleHeader as any) || currentUser.role as any,
      employeeCode: currentUser.employeeCode || matchingEmp?.employeeCode,
      employeeId: matchingEmp?.id,
    };

    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(500).json({ error: 'Internal authentication error' });
  }
};
