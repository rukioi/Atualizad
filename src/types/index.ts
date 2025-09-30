import { AccountType } from '@prisma/client';

// Request/Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  key: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    accountType: AccountType;
    tenantId: string;
    tenantName: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

// Dashboard types
export interface DashboardMetrics {
  revenue: number;
  expenses: number;
  balance: number;
  clients: number;
  projects: number;
  tasks: number;
  revenueGrowth: number;
  clientGrowth: number;
}

export interface FinancialData {
  revenue: number;
  expenses: number;
  balance: number;
  transactionCount: number;
  trends: MonthlyTrend[];
  categories: CategoryBreakdown[];
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  expenses: number;
  balance: number;
}

export interface CategoryBreakdown {
  category: string;
  type: 'income' | 'expense';
  total: number;
  count: number;
}

// Client types
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone: string;
  organization?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  budget?: number;
  currency: string;
  status: string;
  tags: string[];
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Project types
export interface Project {
  id: string;
  title: string;
  description?: string;
  clientName: string;
  clientId?: string;
  organization?: string;
  address?: string;
  budget?: number;
  currency: string;
  status: 'contacted' | 'proposal' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: number;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  tags: string[];
  assignedTo: string[];
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Task types
export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  projectTitle?: string;
  clientId?: string;
  clientName?: string;
  assignedTo: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: number;
  startDate?: string;
  endDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  notes?: string;
  subtasks: Subtask[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

// Transaction types
export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;
  category: string;
  description: string;
  date: string;
  paymentMethod?: 'pix' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'boleto' | 'cash' | 'check';
  status: 'pending' | 'confirmed' | 'cancelled';
  projectId?: string;
  projectTitle?: string;
  clientId?: string;
  clientName?: string;
  tags: string[];
  notes?: string;
  isRecurring: boolean;
  recurringFrequency?: 'monthly' | 'quarterly' | 'yearly';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Invoice types
export interface Invoice {
  id: string;
  number: string;
  title: string;
  description?: string;
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  paidAt?: string;
  paymentMethod?: string;
  items: InvoiceItem[];
  tags: string[];
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  tax?: number;
}

// Error types
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message, 400, code);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, code: string = 'AUTH_ERROR') {
    super(message, 401, code);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, code: string = 'AUTHORIZATION_ERROR') {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code: string = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class TenantError extends AppError {
  constructor(message: string, code: string = 'TENANT_ERROR') {
    super(message, 400, code);
  }
}