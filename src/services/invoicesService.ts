/**
 * INVOICES SERVICE - GESTÃO DE FATURAS
 * ===================================
 * 
 * Serviço responsável por operações de banco de dados relacionadas às faturas.
 * Substitui os dados mock por operações reais com PostgreSQL usando isolamento por tenant.
 * 
 * NOTA: Invoices são restritas a contas COMPOSTA e GERENCIAL (não SIMPLES)
 */

import { tenantDB } from './tenantDatabase';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  tax?: number;
}

export interface Invoice {
  id: string;
  number: string;
  title: string;
  description?: string;
  client_id?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  amount: number;
  currency: 'BRL' | 'USD' | 'EUR';
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  items: InvoiceItem[];
  tags: string[];
  notes?: string;
  payment_status?: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  payment_method?: 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'BOLETO' | 'CASH' | 'CHECK';
  payment_date?: string;
  email_sent: boolean;
  email_sent_at?: string;
  reminders_sent: number;
  last_reminder_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CreateInvoiceData {
  number: string;
  title: string;
  description?: string;
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  amount: number;
  currency?: 'BRL' | 'USD' | 'EUR';
  status?: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  items?: InvoiceItem[];
  tags?: string[];
  notes?: string;
}

export interface UpdateInvoiceData extends Partial<CreateInvoiceData> {
  paymentStatus?: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  paymentMethod?: 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'BOLETO' | 'CASH' | 'CHECK';
  paymentDate?: string;
}

export interface InvoiceFilters {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  search?: string;
  tags?: string[];
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class InvoicesService {
  private tableName = 'invoices';

  /**
   * Cria as tabelas necessárias se não existirem
   */
  async initializeTables(tenantId: string): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \${schema}.${this.tableName} (
        id VARCHAR PRIMARY KEY,
        number VARCHAR NOT NULL UNIQUE,
        title VARCHAR NOT NULL,
        description TEXT,
        client_id VARCHAR,
        client_name VARCHAR NOT NULL,
        client_email VARCHAR,
        client_phone VARCHAR,
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'BRL',
        status VARCHAR DEFAULT 'draft',
        due_date DATE NOT NULL,
        items JSONB DEFAULT '[]',
        tags JSONB DEFAULT '[]',
        notes TEXT,
        payment_status VARCHAR DEFAULT 'pending',
        payment_method VARCHAR,
        payment_date DATE,
        email_sent BOOLEAN DEFAULT FALSE,
        email_sent_at TIMESTAMP,
        reminders_sent INTEGER DEFAULT 0,
        last_reminder_at TIMESTAMP,
        created_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      )
    `;
    
    await tenantDB.executeInTenantSchema(tenantId, createTableQuery);
    
    // Criar índices para performance
    const createIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_number ON \${schema}.${this.tableName}(number)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_client_name ON \${schema}.${this.tableName}(client_name)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status ON \${schema}.${this.tableName}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_payment_status ON \${schema}.${this.tableName}(payment_status)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_due_date ON \${schema}.${this.tableName}(due_date)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_active ON \${schema}.${this.tableName}(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_by ON \${schema}.${this.tableName}(created_by)`
    ];
    
    for (const indexQuery of createIndexes) {
      await tenantDB.executeInTenantSchema(tenantId, indexQuery);
    }
  }

  /**
   * Busca faturas com filtros e paginação
   */
  async getInvoices(tenantId: string, filters: InvoiceFilters = {}): Promise<{
    invoices: Invoice[];
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
    
    // Filtro por status
    if (filters.status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(filters.status);
      paramIndex++;
    }
    
    // Filtro por payment status
    if (filters.paymentStatus) {
      whereConditions.push(`payment_status = $${paramIndex}`);
      queryParams.push(filters.paymentStatus);
      paramIndex++;
    }
    
    // Filtro por busca (número, título ou nome do cliente)
    if (filters.search) {
      whereConditions.push(`(number ILIKE $${paramIndex} OR title ILIKE $${paramIndex} OR client_name ILIKE $${paramIndex})`);
      queryParams.push(`%${filters.search}%`);
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
    
    // Filtro por data (due_date)
    if (filters.dateFrom) {
      whereConditions.push(`due_date >= $${paramIndex}`);
      queryParams.push(filters.dateFrom);
      paramIndex++;
    }
    
    if (filters.dateTo) {
      whereConditions.push(`due_date <= $${paramIndex}`);
      queryParams.push(filters.dateTo);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    // Query para buscar faturas
    const invoicesQuery = `
      SELECT 
        id, number, title, description, client_id, client_name, client_email, client_phone,
        amount, currency, status, due_date, items, tags, notes, payment_status,
        payment_method, payment_date, email_sent, email_sent_at, reminders_sent,
        last_reminder_at, created_by, created_at, updated_at, is_active
      FROM \${schema}.${this.tableName}
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM \${schema}.${this.tableName}
      ${whereClause}
    `;
    
    const [invoices, countResult] = await Promise.all([
      tenantDB.executeInTenantSchema<Invoice>(tenantId, invoicesQuery, [...queryParams, limit, offset]),
      tenantDB.executeInTenantSchema<{total: string}>(tenantId, countQuery, queryParams)
    ]);
    
    const total = parseInt(countResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);
    
    return {
      invoices,
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
   * Busca uma fatura por ID
   */
  async getInvoiceById(tenantId: string, invoiceId: string): Promise<Invoice | null> {
    await this.initializeTables(tenantId);
    
    const query = `
      SELECT 
        id, number, title, description, client_id, client_name, client_email, client_phone,
        amount, currency, status, due_date, items, tags, notes, payment_status,
        payment_method, payment_date, email_sent, email_sent_at, reminders_sent,
        last_reminder_at, created_by, created_at, updated_at, is_active
      FROM \${schema}.${this.tableName}
      WHERE id = $1 AND is_active = TRUE
    `;
    
    const result = await tenantDB.executeInTenantSchema<Invoice>(tenantId, query, [invoiceId]);
    return result[0] || null;
  }

  /**
   * Cria uma nova fatura
   */
  async createInvoice(tenantId: string, invoiceData: CreateInvoiceData, createdBy: string): Promise<Invoice> {
    await this.initializeTables(tenantId);
    
    // Gerar ID único seguindo o mesmo padrão dos outros serviços
    const invoiceId = `invoice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const query = `
      INSERT INTO \${schema}.${this.tableName} (
        id, number, title, description, client_id, client_name, client_email, client_phone,
        amount, currency, status, due_date, items, tags, notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15, $16
      )
      RETURNING 
        id, number, title, description, client_id, client_name, client_email, client_phone,
        amount, currency, status, due_date, items, tags, notes, payment_status,
        payment_method, payment_date, email_sent, email_sent_at, reminders_sent,
        last_reminder_at, created_by, created_at, updated_at, is_active
    `;
    
    const params = [
      invoiceId,
      invoiceData.number,
      invoiceData.title,
      invoiceData.description || null,
      invoiceData.clientId || null,
      invoiceData.clientName,
      invoiceData.clientEmail || null,
      invoiceData.clientPhone || null,
      invoiceData.amount,
      invoiceData.currency || 'BRL',
      invoiceData.status || 'draft',
      invoiceData.dueDate,
      JSON.stringify(invoiceData.items || []),
      JSON.stringify(invoiceData.tags || []),
      invoiceData.notes || null,
      createdBy
    ];
    
    const result = await tenantDB.executeInTenantSchema<Invoice>(tenantId, query, params);
    return result[0];
  }

  /**
   * Atualiza uma fatura existente
   */
  async updateInvoice(tenantId: string, invoiceId: string, updateData: UpdateInvoiceData): Promise<Invoice | null> {
    await this.initializeTables(tenantId);
    
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    // Mapeamento dos campos para atualização
    const fieldMappings = {
      number: 'number',
      title: 'title',
      description: 'description',
      clientId: 'client_id',
      clientName: 'client_name',
      clientEmail: 'client_email',
      clientPhone: 'client_phone',
      amount: 'amount',
      currency: 'currency',
      status: 'status',
      dueDate: 'due_date',
      items: 'items',
      tags: 'tags',
      notes: 'notes',
      paymentStatus: 'payment_status',
      paymentMethod: 'payment_method',
      paymentDate: 'payment_date'
    };
    
    for (const [key, dbField] of Object.entries(fieldMappings)) {
      if (updateData.hasOwnProperty(key)) {
        const value = (updateData as any)[key];
        if (key === 'items' || key === 'tags') {
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
        id, number, title, description, client_id, client_name, client_email, client_phone,
        amount, currency, status, due_date, items, tags, notes, payment_status,
        payment_method, payment_date, email_sent, email_sent_at, reminders_sent,
        last_reminder_at, created_by, created_at, updated_at, is_active
    `;
    
    params.push(invoiceId);
    
    const result = await tenantDB.executeInTenantSchema<Invoice>(tenantId, query, params);
    return result[0] || null;
  }

  /**
   * Exclui uma fatura (soft delete)
   */
  async deleteInvoice(tenantId: string, invoiceId: string): Promise<boolean> {
    await this.initializeTables(tenantId);
    
    const query = `
      UPDATE \${schema}.${this.tableName}
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1 AND is_active = TRUE
    `;
    
    const result = await tenantDB.executeInTenantSchema(tenantId, query, [invoiceId]);
    return result.length > 0;
  }

  /**
   * Obtém estatísticas das faturas
   */
  async getInvoicesStats(tenantId: string): Promise<{
    total: number;
    draft: number;
    pending: number;
    paid: number;
    overdue: number;
    totalAmount: number;
    paidAmount: number;
    thisMonth: number;
  }> {
    await this.initializeTables(tenantId);
    
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE payment_status = 'paid') as paid,
        COUNT(*) FILTER (WHERE payment_status = 'overdue') as overdue,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(amount) FILTER (WHERE payment_status = 'paid'), 0) as paid_amount,
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())) as this_month
      FROM \${schema}.${this.tableName}
      WHERE is_active = TRUE
    `;
    
    const result = await tenantDB.executeInTenantSchema<any>(tenantId, query);
    const stats = result[0];
    
    return {
      total: parseInt(stats.total || '0'),
      draft: parseInt(stats.draft || '0'),
      pending: parseInt(stats.pending || '0'),
      paid: parseInt(stats.paid || '0'),
      overdue: parseInt(stats.overdue || '0'),
      totalAmount: parseFloat(stats.total_amount || '0'),
      paidAmount: parseFloat(stats.paid_amount || '0'),
      thisMonth: parseInt(stats.this_month || '0')
    };
  }

  /**
   * Marca uma fatura como enviada por email
   */
  async markInvoiceAsSent(tenantId: string, invoiceId: string): Promise<boolean> {
    await this.initializeTables(tenantId);
    
    const query = `
      UPDATE \${schema}.${this.tableName}
      SET 
        email_sent = TRUE, 
        email_sent_at = NOW(),
        status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END,
        updated_at = NOW()
      WHERE id = $1 AND is_active = TRUE
    `;
    
    const result = await tenantDB.executeInTenantSchema(tenantId, query, [invoiceId]);
    return result.length > 0;
  }

  /**
   * Incrementa contador de lembretes enviados
   */
  async incrementReminders(tenantId: string, invoiceId: string): Promise<boolean> {
    await this.initializeTables(tenantId);
    
    const query = `
      UPDATE \${schema}.${this.tableName}
      SET 
        reminders_sent = reminders_sent + 1,
        last_reminder_at = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND is_active = TRUE
    `;
    
    const result = await tenantDB.executeInTenantSchema(tenantId, query, [invoiceId]);
    return result.length > 0;
  }
}

export const invoicesService = new InvoicesService();