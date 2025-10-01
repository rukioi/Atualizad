/**
 * TRANSACTIONS SERVICE - Gestão de Fluxo de Caixa
 * ================================================
 * 
 * ✅ ISOLAMENTO TENANT: Usa TenantDatabase e helpers de isolamento
 * ✅ SEM DADOS MOCK: Operações reais no PostgreSQL
 * ✅ CONTROLE DE ACESSO: Restrito a contas COMPOSTA e GERENCIAL (não SIMPLES)
 */

import { TenantDatabase } from '../config/database';
import {
  queryTenantSchema,
  insertInTenantSchema,
  updateInTenantSchema,
  softDeleteInTenantSchema
} from '../utils/tenantHelpers';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  category: string;
  description: string;
  date: string;
  payment_method?: 'pix' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'boleto' | 'cash' | 'check';
  status: 'pending' | 'confirmed' | 'cancelled';
  project_id?: string;
  project_title?: string;
  client_id?: string;
  client_name?: string;
  tags: string[];
  notes?: string;
  is_recurring: boolean;
  recurring_frequency?: 'monthly' | 'quarterly' | 'yearly';
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CreateTransactionData {
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;
  category: string;
  description: string;
  date: string;
  paymentMethod?: 'pix' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'boleto' | 'cash' | 'check';
  status?: 'pending' | 'confirmed' | 'cancelled';
  projectId?: string;
  projectTitle?: string;
  clientId?: string;
  clientName?: string;
  tags?: string[];
  notes?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'monthly' | 'quarterly' | 'yearly';
}

export interface UpdateTransactionData extends Partial<CreateTransactionData> {}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: 'income' | 'expense';
  status?: string;
  categoryId?: string;
  search?: string;
  tags?: string[];
  projectId?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: string;
  isRecurring?: boolean;
}

export class TransactionsService {
  private tableName = 'transactions';

  /**
   * Cria as tabelas necessárias se não existirem
   */
  private async ensureTables(tenantDB: TenantDatabase): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \${schema}.${this.tableName} (
        id VARCHAR PRIMARY KEY,
        type VARCHAR NOT NULL CHECK (type IN ('income', 'expense')),
        amount DECIMAL(15,2) NOT NULL,
        category_id VARCHAR NOT NULL,
        category VARCHAR NOT NULL,
        description VARCHAR NOT NULL,
        date DATE NOT NULL,
        payment_method VARCHAR CHECK (payment_method IN ('pix', 'credit_card', 'debit_card', 'bank_transfer', 'boleto', 'cash', 'check')),
        status VARCHAR DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
        project_id VARCHAR,
        project_title VARCHAR,
        client_id VARCHAR,
        client_name VARCHAR,
        tags JSONB DEFAULT '[]',
        notes TEXT,
        is_recurring BOOLEAN DEFAULT FALSE,
        recurring_frequency VARCHAR CHECK (recurring_frequency IN ('monthly', 'quarterly', 'yearly')),
        created_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      )
    `;
    
    await queryTenantSchema(tenantDB, createTableQuery);
    
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_type ON \${schema}.${this.tableName}(type)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_category_id ON \${schema}.${this.tableName}(category_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status ON \${schema}.${this.tableName}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_date ON \${schema}.${this.tableName}(date)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_project_id ON \${schema}.${this.tableName}(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_client_id ON \${schema}.${this.tableName}(client_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_recurring ON \${schema}.${this.tableName}(is_recurring)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_active ON \${schema}.${this.tableName}(is_active)`
    ];
    
    for (const indexQuery of indexes) {
      await queryTenantSchema(tenantDB, indexQuery);
    }
  }

  /**
   * Busca transações com filtros e paginação
   */
  async getTransactions(tenantDB: TenantDatabase, filters: TransactionFilters = {}): Promise<{
    transactions: Transaction[];
    pagination: any;
  }> {
    await this.ensureTables(tenantDB);
    
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;
    
    let whereConditions = ['is_active = TRUE'];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    if (filters.type) {
      whereConditions.push(`type = $${paramIndex}`);
      queryParams.push(filters.type);
      paramIndex++;
    }
    
    if (filters.status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(filters.status);
      paramIndex++;
    }
    
    if (filters.categoryId) {
      whereConditions.push(`category_id = $${paramIndex}`);
      queryParams.push(filters.categoryId);
      paramIndex++;
    }
    
    if (filters.search) {
      whereConditions.push(`(description ILIKE $${paramIndex} OR category ILIKE $${paramIndex})`);
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }
    
    if (filters.projectId) {
      whereConditions.push(`project_id = $${paramIndex}`);
      queryParams.push(filters.projectId);
      paramIndex++;
    }
    
    if (filters.clientId) {
      whereConditions.push(`client_id = $${paramIndex}`);
      queryParams.push(filters.clientId);
      paramIndex++;
    }
    
    if (filters.tags && filters.tags.length > 0) {
      whereConditions.push(`tags ?| $${paramIndex}`);
      queryParams.push(filters.tags);
      paramIndex++;
    }
    
    if (filters.dateFrom) {
      whereConditions.push(`date >= $${paramIndex}`);
      queryParams.push(filters.dateFrom);
      paramIndex++;
    }
    
    if (filters.dateTo) {
      whereConditions.push(`date <= $${paramIndex}`);
      queryParams.push(filters.dateTo);
      paramIndex++;
    }
    
    if (filters.paymentMethod) {
      whereConditions.push(`payment_method = $${paramIndex}`);
      queryParams.push(filters.paymentMethod);
      paramIndex++;
    }
    
    if (filters.isRecurring !== undefined) {
      whereConditions.push(`is_recurring = $${paramIndex}`);
      queryParams.push(filters.isRecurring);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const transactionsQuery = `
      SELECT * FROM \${schema}.${this.tableName}
      ${whereClause}
      ORDER BY date DESC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const countQuery = `SELECT COUNT(*) as total FROM \${schema}.${this.tableName} ${whereClause}`;
    
    const [transactions, countResult] = await Promise.all([
      queryTenantSchema<Transaction>(tenantDB, transactionsQuery, [...queryParams, limit, offset]),
      queryTenantSchema<{total: string}>(tenantDB, countQuery, queryParams)
    ]);
    
    const total = parseInt(countResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);
    
    return {
      transactions,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
    };
  }

  /**
   * Busca transação por ID
   */
  async getTransactionById(tenantDB: TenantDatabase, transactionId: string): Promise<Transaction | null> {
    await this.ensureTables(tenantDB);
    
    const query = `SELECT * FROM \${schema}.${this.tableName} WHERE id = $1 AND is_active = TRUE`;
    const result = await queryTenantSchema<Transaction>(tenantDB, query, [transactionId]);
    return result[0] || null;
  }

  /**
   * Cria nova transação
   */
  async createTransaction(tenantDB: TenantDatabase, transactionData: CreateTransactionData, createdBy: string): Promise<Transaction> {
    await this.ensureTables(tenantDB);
    
    const transactionId = `transaction_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const data = {
      id: transactionId,
      type: transactionData.type,
      amount: transactionData.amount,
      category_id: transactionData.categoryId,
      category: transactionData.category,
      description: transactionData.description,
      date: transactionData.date,
      payment_method: transactionData.paymentMethod || null,
      status: transactionData.status || 'confirmed',
      project_id: transactionData.projectId || null,
      project_title: transactionData.projectTitle || null,
      client_id: transactionData.clientId || null,
      client_name: transactionData.clientName || null,
      tags: JSON.stringify(transactionData.tags || []),
      notes: transactionData.notes || null,
      is_recurring: transactionData.isRecurring || false,
      recurring_frequency: transactionData.recurringFrequency || null,
      created_by: createdBy
    };
    
    return await insertInTenantSchema<Transaction>(tenantDB, this.tableName, data);
  }

  /**
   * Atualiza transação existente
   */
  async updateTransaction(tenantDB: TenantDatabase, transactionId: string, updateData: UpdateTransactionData): Promise<Transaction | null> {
    await this.ensureTables(tenantDB);
    
    const data: Record<string, any> = {};
    
    if (updateData.type !== undefined) data.type = updateData.type;
    if (updateData.amount !== undefined) data.amount = updateData.amount;
    if (updateData.categoryId !== undefined) data.category_id = updateData.categoryId;
    if (updateData.category !== undefined) data.category = updateData.category;
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.date !== undefined) data.date = updateData.date;
    if (updateData.paymentMethod !== undefined) data.payment_method = updateData.paymentMethod;
    if (updateData.status !== undefined) data.status = updateData.status;
    if (updateData.projectId !== undefined) data.project_id = updateData.projectId;
    if (updateData.projectTitle !== undefined) data.project_title = updateData.projectTitle;
    if (updateData.clientId !== undefined) data.client_id = updateData.clientId;
    if (updateData.clientName !== undefined) data.client_name = updateData.clientName;
    if (updateData.tags !== undefined) data.tags = JSON.stringify(updateData.tags);
    if (updateData.notes !== undefined) data.notes = updateData.notes;
    if (updateData.isRecurring !== undefined) data.is_recurring = updateData.isRecurring;
    if (updateData.recurringFrequency !== undefined) data.recurring_frequency = updateData.recurringFrequency;
    
    if (Object.keys(data).length === 0) {
      throw new Error('No fields to update');
    }
    
    return await updateInTenantSchema<Transaction>(tenantDB, this.tableName, transactionId, data);
  }

  /**
   * Remove transação (soft delete)
   */
  async deleteTransaction(tenantDB: TenantDatabase, transactionId: string): Promise<boolean> {
    await this.ensureTables(tenantDB);
    const transaction = await softDeleteInTenantSchema<Transaction>(tenantDB, this.tableName, transactionId);
    return !!transaction;
  }

  /**
   * Obtém estatísticas financeiras
   */
  async getTransactionsStats(tenantDB: TenantDatabase, dateFrom?: string, dateTo?: string): Promise<{
    totalIncome: number;
    totalExpense: number;
    netAmount: number;
    totalTransactions: number;
    confirmedTransactions: number;
    pendingTransactions: number;
    thisMonthIncome: number;
    thisMonthExpense: number;
    recurringTransactions: number;
  }> {
    await this.ensureTables(tenantDB);
    
    let whereClause = 'WHERE is_active = TRUE';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (dateFrom) {
      whereClause += ` AND date >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }
    
    if (dateTo) {
      whereClause += ` AND date <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }
    
    const query = `
      SELECT 
        COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) as total_income,
        COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) as total_expense,
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_transactions,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_transactions,
        COALESCE(SUM(amount) FILTER (WHERE type = 'income' AND date >= DATE_TRUNC('month', NOW())), 0) as this_month_income,
        COALESCE(SUM(amount) FILTER (WHERE type = 'expense' AND date >= DATE_TRUNC('month', NOW())), 0) as this_month_expense,
        COUNT(*) FILTER (WHERE is_recurring = true) as recurring_transactions
      FROM \${schema}.${this.tableName}
      ${whereClause}
    `;
    
    const result = await queryTenantSchema<any>(tenantDB, query, params);
    const stats = result[0];
    
    const totalIncome = parseFloat(stats.total_income || '0');
    const totalExpense = parseFloat(stats.total_expense || '0');
    
    return {
      totalIncome,
      totalExpense,
      netAmount: totalIncome - totalExpense,
      totalTransactions: parseInt(stats.total_transactions || '0'),
      confirmedTransactions: parseInt(stats.confirmed_transactions || '0'),
      pendingTransactions: parseInt(stats.pending_transactions || '0'),
      thisMonthIncome: parseFloat(stats.this_month_income || '0'),
      thisMonthExpense: parseFloat(stats.this_month_expense || '0'),
      recurringTransactions: parseInt(stats.recurring_transactions || '0')
    };
  }

  /**
   * Busca transações por categoria (para relatórios)
   */
  async getTransactionsByCategory(tenantDB: TenantDatabase, type?: 'income' | 'expense', dateFrom?: string, dateTo?: string): Promise<{
    categoryId: string;
    category: string;
    amount: number;
    count: number;
  }[]> {
    await this.ensureTables(tenantDB);
    
    let whereConditions = ['is_active = TRUE'];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (type) {
      whereConditions.push(`type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }
    
    if (dateFrom) {
      whereConditions.push(`date >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }
    
    if (dateTo) {
      whereConditions.push(`date <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    const query = `
      SELECT 
        category_id,
        category,
        SUM(amount) as amount,
        COUNT(*) as count
      FROM \${schema}.${this.tableName}
      ${whereClause}
      GROUP BY category_id, category
      ORDER BY amount DESC
    `;
    
    const result = await queryTenantSchema<any>(tenantDB, query, params);
    
    return result.map(row => ({
      categoryId: row.category_id,
      category: row.category,
      amount: parseFloat(row.amount || '0'),
      count: parseInt(row.count || '0')
    }));
  }

  /**
   * Busca transações recorrentes
   */
  async getRecurringTransactionsDue(tenantDB: TenantDatabase): Promise<Transaction[]> {
    await this.ensureTables(tenantDB);
    
    const query = `
      SELECT * FROM \${schema}.${this.tableName}
      WHERE is_active = TRUE AND is_recurring = TRUE
      ORDER BY date ASC
    `;
    
    return await queryTenantSchema<Transaction>(tenantDB, query);
  }
}

export const transactionsService = new TransactionsService();
