/**
 * INVOICES SERVICE - Gestão de Faturas
 * =====================================
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
  private async ensureTables(tenantDB: TenantDatabase): Promise<void> {
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
    
    await queryTenantSchema(tenantDB, createTableQuery);
    
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_number ON \${schema}.${this.tableName}(number)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_client_name ON \${schema}.${this.tableName}(client_name)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status ON \${schema}.${this.tableName}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_payment_status ON \${schema}.${this.tableName}(payment_status)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_due_date ON \${schema}.${this.tableName}(due_date)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_active ON \${schema}.${this.tableName}(is_active)`
    ];
    
    for (const indexQuery of indexes) {
      await queryTenantSchema(tenantDB, indexQuery);
    }
  }

  /**
   * Busca faturas com filtros e paginação
   */
  async getInvoices(tenantDB: TenantDatabase, filters: InvoiceFilters = {}): Promise<{
    invoices: Invoice[];
    pagination: any;
  }> {
    await this.ensureTables(tenantDB);
    
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;
    
    let whereConditions = ['is_active = TRUE'];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    if (filters.status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(filters.status);
      paramIndex++;
    }
    
    if (filters.paymentStatus) {
      whereConditions.push(`payment_status = $${paramIndex}`);
      queryParams.push(filters.paymentStatus);
      paramIndex++;
    }
    
    if (filters.search) {
      whereConditions.push(`(number ILIKE $${paramIndex} OR title ILIKE $${paramIndex} OR client_name ILIKE $${paramIndex})`);
      queryParams.push(`%${filters.search}%`);
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
      whereConditions.push(`due_date >= $${paramIndex}`);
      queryParams.push(filters.dateFrom);
      paramIndex++;
    }
    
    if (filters.dateTo) {
      whereConditions.push(`due_date <= $${paramIndex}`);
      queryParams.push(filters.dateTo);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const invoicesQuery = `
      SELECT * FROM \${schema}.${this.tableName}
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const countQuery = `SELECT COUNT(*) as total FROM \${schema}.${this.tableName} ${whereClause}`;
    
    const [invoices, countResult] = await Promise.all([
      queryTenantSchema<Invoice>(tenantDB, invoicesQuery, [...queryParams, limit, offset]),
      queryTenantSchema<{total: string}>(tenantDB, countQuery, queryParams)
    ]);
    
    const total = parseInt(countResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);
    
    return {
      invoices,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
    };
  }

  /**
   * Busca fatura por ID
   */
  async getInvoiceById(tenantDB: TenantDatabase, invoiceId: string): Promise<Invoice | null> {
    await this.ensureTables(tenantDB);
    
    const query = `SELECT * FROM \${schema}.${this.tableName} WHERE id = $1 AND is_active = TRUE`;
    const result = await queryTenantSchema<Invoice>(tenantDB, query, [invoiceId]);
    return result[0] || null;
  }

  /**
   * Cria nova fatura
   */
  async createInvoice(tenantDB: TenantDatabase, invoiceData: CreateInvoiceData, createdBy: string): Promise<Invoice> {
    await this.ensureTables(tenantDB);
    
    const invoiceId = `invoice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const data = {
      id: invoiceId,
      number: invoiceData.number,
      title: invoiceData.title,
      description: invoiceData.description || null,
      client_id: invoiceData.clientId || null,
      client_name: invoiceData.clientName,
      client_email: invoiceData.clientEmail || null,
      client_phone: invoiceData.clientPhone || null,
      amount: invoiceData.amount,
      currency: invoiceData.currency || 'BRL',
      status: invoiceData.status || 'draft',
      due_date: invoiceData.dueDate,
      items: JSON.stringify(invoiceData.items || []),
      tags: JSON.stringify(invoiceData.tags || []),
      notes: invoiceData.notes || null,
      created_by: createdBy
    };
    
    return await insertInTenantSchema<Invoice>(tenantDB, this.tableName, data);
  }

  /**
   * Atualiza fatura existente
   */
  async updateInvoice(tenantDB: TenantDatabase, invoiceId: string, updateData: UpdateInvoiceData): Promise<Invoice | null> {
    await this.ensureTables(tenantDB);
    
    const data: Record<string, any> = {};
    
    if (updateData.number !== undefined) data.number = updateData.number;
    if (updateData.title !== undefined) data.title = updateData.title;
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.clientId !== undefined) data.client_id = updateData.clientId;
    if (updateData.clientName !== undefined) data.client_name = updateData.clientName;
    if (updateData.clientEmail !== undefined) data.client_email = updateData.clientEmail;
    if (updateData.clientPhone !== undefined) data.client_phone = updateData.clientPhone;
    if (updateData.amount !== undefined) data.amount = updateData.amount;
    if (updateData.currency !== undefined) data.currency = updateData.currency;
    if (updateData.status !== undefined) data.status = updateData.status;
    if (updateData.dueDate !== undefined) data.due_date = updateData.dueDate;
    if (updateData.items !== undefined) data.items = JSON.stringify(updateData.items);
    if (updateData.tags !== undefined) data.tags = JSON.stringify(updateData.tags);
    if (updateData.notes !== undefined) data.notes = updateData.notes;
    if (updateData.paymentStatus !== undefined) data.payment_status = updateData.paymentStatus;
    if (updateData.paymentMethod !== undefined) data.payment_method = updateData.paymentMethod;
    if (updateData.paymentDate !== undefined) data.payment_date = updateData.paymentDate;
    
    if (Object.keys(data).length === 0) {
      throw new Error('No fields to update');
    }
    
    return await updateInTenantSchema<Invoice>(tenantDB, this.tableName, invoiceId, data);
  }

  /**
   * Remove fatura (soft delete)
   */
  async deleteInvoice(tenantDB: TenantDatabase, invoiceId: string): Promise<boolean> {
    await this.ensureTables(tenantDB);
    const invoice = await softDeleteInTenantSchema<Invoice>(tenantDB, this.tableName, invoiceId);
    return !!invoice;
  }

  /**
   * Obtém estatísticas das faturas
   */
  async getInvoicesStats(tenantDB: TenantDatabase): Promise<{
    total: number;
    draft: number;
    pending: number;
    paid: number;
    overdue: number;
    totalAmount: number;
    paidAmount: number;
    thisMonth: number;
  }> {
    await this.ensureTables(tenantDB);
    
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
    
    const result = await queryTenantSchema<any>(tenantDB, query);
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
   * Marca fatura como enviada por email
   */
  async markInvoiceAsSent(tenantDB: TenantDatabase, invoiceId: string): Promise<boolean> {
    await this.ensureTables(tenantDB);
    
    const query = `
      UPDATE \${schema}.${this.tableName}
      SET 
        email_sent = TRUE, 
        email_sent_at = NOW(),
        status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END,
        updated_at = NOW()
      WHERE id = $1 AND is_active = TRUE
    `;
    
    const result = await queryTenantSchema(tenantDB, query, [invoiceId]);
    return result.length > 0;
  }

  /**
   * Incrementa contador de lembretes
   */
  async incrementReminders(tenantDB: TenantDatabase, invoiceId: string): Promise<boolean> {
    await this.ensureTables(tenantDB);
    
    const query = `
      UPDATE \${schema}.${this.tableName}
      SET 
        reminders_sent = reminders_sent + 1,
        last_reminder_at = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND is_active = TRUE
    `;
    
    const result = await queryTenantSchema(tenantDB, query, [invoiceId]);
    return result.length > 0;
  }
}

export const invoicesService = new InvoicesService();
