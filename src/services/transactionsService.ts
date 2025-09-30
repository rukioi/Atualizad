/**
 * TRANSACTIONS SERVICE - GESTÃO DE FLUXO DE CAIXA
 * ===============================================
 * 
 * Serviço responsável por operações de banco de dados relacionadas às transações financeiras.
 * Substitui os dados mock por operações reais com PostgreSQL usando isolamento por tenant.
 * 
 * NOTA: Transactions são restritas a contas COMPOSTA e GERENCIAL (não SIMPLES)
 */

import { tenantDB } from './tenantDatabase';

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
  async initializeTables(tenantId: string): Promise<void> {
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
    
    await tenantDB.executeInTenantSchema(tenantId, createTableQuery);
    
    // Criar índices para performance
    const createIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_type ON \${schema}.${this.tableName}(type)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_category_id ON \${schema}.${this.tableName}(category_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status ON \${schema}.${this.tableName}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_date ON \${schema}.${this.tableName}(date)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_project_id ON \${schema}.${this.tableName}(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_client_id ON \${schema}.${this.tableName}(client_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_recurring ON \${schema}.${this.tableName}(is_recurring)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_active ON \${schema}.${this.tableName}(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_by ON \${schema}.${this.tableName}(created_by)`
    ];
    
    for (const indexQuery of createIndexes) {
      await tenantDB.executeInTenantSchema(tenantId, indexQuery);
    }
  }

  /**
   * Busca transações com filtros e paginação
   */
  async getTransactions(tenantId: string, filters: TransactionFilters = {}): Promise<{
    transactions: Transaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    await this.initializeTables(tenantId);
    
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;
    
    let whereConditions = ['is_active = TRUE'];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    // Filtro por tipo (income/expense)
    if (filters.type) {
      whereConditions.push(`type = $${paramIndex}`);
      queryParams.push(filters.type);
      paramIndex++;
    }
    
    // Filtro por status
    if (filters.status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(filters.status);
      paramIndex++;
    }
    
    // Filtro por categoria
    if (filters.categoryId) {
      whereConditions.push(`category_id = $${paramIndex}`);
      queryParams.push(filters.categoryId);
      paramIndex++;
    }
    
    // Filtro por busca (descrição ou categoria)
    if (filters.search) {
      whereConditions.push(`(description ILIKE $${paramIndex} OR category ILIKE $${paramIndex})`);
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }
    
    // Filtro por projeto
    if (filters.projectId) {
      whereConditions.push(`project_id = $${paramIndex}`);
      queryParams.push(filters.projectId);
      paramIndex++;
    }
    
    // Filtro por cliente
    if (filters.clientId) {
      whereConditions.push(`client_id = $${paramIndex}`);
      queryParams.push(filters.clientId);
      paramIndex++;
    }
    
    // Filtro por tags
    if (filters.tags && filters.tags.length > 0) {
      whereConditions.push(`tags ?| $${paramIndex}`);
      queryParams.push(filters.tags);
      paramIndex++;
    }
    
    // Filtro por data (intervalo)
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
    
    // Filtro por método de pagamento
    if (filters.paymentMethod) {
      whereConditions.push(`payment_method = $${paramIndex}`);
      queryParams.push(filters.paymentMethod);
      paramIndex++;
    }
    
    // Filtro por transações recorrentes
    if (filters.isRecurring !== undefined) {
      whereConditions.push(`is_recurring = $${paramIndex}`);
      queryParams.push(filters.isRecurring);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    // Query para buscar transações
    const transactionsQuery = `
      SELECT 
        id, type, amount, category_id, category, description, date, payment_method,
        status, project_id, project_title, client_id, client_name, tags, notes,
        is_recurring, recurring_frequency, created_by, created_at, updated_at, is_active
      FROM \${schema}.${this.tableName}
      ${whereClause}
      ORDER BY date DESC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM \${schema}.${this.tableName}
      ${whereClause}
    `;
    
    const [transactions, countResult] = await Promise.all([
      tenantDB.executeInTenantSchema<Transaction>(tenantId, transactionsQuery, [...queryParams, limit, offset]),
      tenantDB.executeInTenantSchema<{total: string}>(tenantId, countQuery, queryParams)
    ]);
    
    const total = parseInt(countResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);
    
    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Busca uma transação por ID
   */
  async getTransactionById(tenantId: string, transactionId: string): Promise<Transaction | null> {
    await this.initializeTables(tenantId);
    
    const query = `
      SELECT 
        id, type, amount, category_id, category, description, date, payment_method,
        status, project_id, project_title, client_id, client_name, tags, notes,
        is_recurring, recurring_frequency, created_by, created_at, updated_at, is_active
      FROM \${schema}.${this.tableName}
      WHERE id = $1 AND is_active = TRUE
    `;
    
    const result = await tenantDB.executeInTenantSchema<Transaction>(tenantId, query, [transactionId]);
    return result[0] || null;
  }

  /**
   * Cria uma nova transação
   */
  async createTransaction(tenantId: string, transactionData: CreateTransactionData, createdBy: string): Promise<Transaction> {
    await this.initializeTables(tenantId);
    
    // Gerar ID único seguindo o mesmo padrão dos outros serviços
    const transactionId = `transaction_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const query = `
      INSERT INTO \${schema}.${this.tableName} (
        id, type, amount, category_id, category, description, date, payment_method,
        status, project_id, project_title, client_id, client_name, tags, notes,
        is_recurring, recurring_frequency, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16, $17, $18
      )
      RETURNING 
        id, type, amount, category_id, category, description, date, payment_method,
        status, project_id, project_title, client_id, client_name, tags, notes,
        is_recurring, recurring_frequency, created_by, created_at, updated_at, is_active
    `;
    
    const params = [
      transactionId,
      transactionData.type,
      transactionData.amount,
      transactionData.categoryId,
      transactionData.category,
      transactionData.description,
      transactionData.date,
      transactionData.paymentMethod || null,
      transactionData.status || 'confirmed',
      transactionData.projectId || null,
      transactionData.projectTitle || null,
      transactionData.clientId || null,
      transactionData.clientName || null,
      JSON.stringify(transactionData.tags || []),
      transactionData.notes || null,
      transactionData.isRecurring || false,
      transactionData.recurringFrequency || null,
      createdBy
    ];
    
    const result = await tenantDB.executeInTenantSchema<Transaction>(tenantId, query, params);
    return result[0];
  }

  /**
   * Atualiza uma transação existente
   */
  async updateTransaction(tenantId: string, transactionId: string, updateData: UpdateTransactionData): Promise<Transaction | null> {
    await this.initializeTables(tenantId);
    
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    // Mapeamento dos campos para atualização
    const fieldMappings = {
      type: 'type',
      amount: 'amount',
      categoryId: 'category_id',
      category: 'category',
      description: 'description',
      date: 'date',
      paymentMethod: 'payment_method',
      status: 'status',
      projectId: 'project_id',
      projectTitle: 'project_title',
      clientId: 'client_id',
      clientName: 'client_name',
      tags: 'tags',
      notes: 'notes',
      isRecurring: 'is_recurring',
      recurringFrequency: 'recurring_frequency'
    };
    
    for (const [key, dbField] of Object.entries(fieldMappings)) {
      if (updateData.hasOwnProperty(key)) {
        const value = (updateData as any)[key];
        if (key === 'tags') {
          updateFields.push(`${dbField} = $${paramIndex}::jsonb`);
          params.push(JSON.stringify(value));
        } else {
          updateFields.push(`${dbField} = $${paramIndex}`);
          params.push(value);
        }
        paramIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }
    
    // Adicionar updated_at
    updateFields.push(`updated_at = NOW()`);
    
    const query = `
      UPDATE \${schema}.${this.tableName}
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND is_active = TRUE
      RETURNING 
        id, type, amount, category_id, category, description, date, payment_method,
        status, project_id, project_title, client_id, client_name, tags, notes,
        is_recurring, recurring_frequency, created_by, created_at, updated_at, is_active
    `;
    
    params.push(transactionId);
    
    const result = await tenantDB.executeInTenantSchema<Transaction>(tenantId, query, params);
    return result[0] || null;
  }

  /**
   * Exclui uma transação (soft delete)
   */
  async deleteTransaction(tenantId: string, transactionId: string): Promise<boolean> {
    await this.initializeTables(tenantId);
    
    const query = `
      UPDATE \${schema}.${this.tableName}
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1 AND is_active = TRUE
    `;
    
    const result = await tenantDB.executeInTenantSchema(tenantId, query, [transactionId]);
    return result.length > 0;
  }

  /**
   * Obtém estatísticas financeiras
   */
  async getTransactionsStats(tenantId: string, dateFrom?: string, dateTo?: string): Promise<{
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
    await this.initializeTables(tenantId);
    
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
    
    const result = await tenantDB.executeInTenantSchema<any>(tenantId, query, params);
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
  async getTransactionsByCategory(tenantId: string, type?: 'income' | 'expense', dateFrom?: string, dateTo?: string): Promise<{
    categoryId: string;
    category: string;
    amount: number;
    count: number;
  }[]> {
    await this.initializeTables(tenantId);
    
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
    
    const result = await tenantDB.executeInTenantSchema<any>(tenantId, query, params);
    
    return result.map(row => ({
      categoryId: row.category_id,
      category: row.category,
      amount: parseFloat(row.amount || '0'),
      count: parseInt(row.count || '0')
    }));
  }

  /**
   * Busca transações recorrentes que precisam ser processadas
   */
  async getRecurringTransactionsDue(tenantId: string): Promise<Transaction[]> {
    await this.initializeTables(tenantId);
    
    const query = `
      SELECT 
        id, type, amount, category_id, category, description, date, payment_method,
        status, project_id, project_title, client_id, client_name, tags, notes,
        is_recurring, recurring_frequency, created_by, created_at, updated_at, is_active
      FROM \${schema}.${this.tableName}
      WHERE is_active = TRUE AND is_recurring = TRUE
      ORDER BY date ASC
    `;
    
    const result = await tenantDB.executeInTenantSchema<Transaction>(tenantId, query);
    return result;
  }
}

export const transactionsService = new TransactionsService();