/**
 * NOTIFICATIONS SERVICE - Gestão de Notificações
 * ==============================================
 * 
 * ✅ ISOLAMENTO TENANT: Usa TenantDatabase e helpers de isolamento
 * ✅ ISOLAMENTO POR USUÁRIO: Notificações são isoladas por usuário
 * ✅ SEM DADOS MOCK: Operações reais no PostgreSQL
 */

import { TenantDatabase } from '../config/database';
import {
  queryTenantSchema,
  insertInTenantSchema,
  updateInTenantSchema,
  softDeleteInTenantSchema
} from '../utils/tenantHelpers';

export interface Notification {
  id: string;
  user_id: string;
  actor_id?: string;
  type: 'task' | 'invoice' | 'system' | 'client' | 'project';
  title: string;
  message: string;
  payload?: any;
  link?: string;
  read: boolean;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CreateNotificationData {
  userId: string;
  actorId?: string;
  type: 'task' | 'invoice' | 'system' | 'client' | 'project';
  title: string;
  message: string;
  payload?: any;
  link?: string;
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: string;
}

export class NotificationsService {
  private tableName = 'notifications';

  /**
   * Cria as tabelas necessárias se não existirem
   */
  private async ensureTables(tenantDB: TenantDatabase): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${tenantDB.schema}.${this.tableName} (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        actor_id VARCHAR,
        type VARCHAR NOT NULL CHECK (type IN ('task', 'invoice', 'system', 'client', 'project')),
        title VARCHAR NOT NULL,
        message TEXT NOT NULL,
        payload JSONB,
        link VARCHAR,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      )
    `;

    await queryTenantSchema(tenantDB, createTableQuery);

    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_user_id ON ${tenantDB.schema}.${this.tableName}(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_type ON ${tenantDB.schema}.${this.tableName}(type)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_read ON ${tenantDB.schema}.${this.tableName}(read)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_active ON ${tenantDB.schema}.${this.tableName}(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created ON ${tenantDB.schema}.${this.tableName}(created_at DESC)`
    ];

    for (const indexQuery of indexes) {
      await queryTenantSchema(tenantDB, indexQuery);
    }
  }

  /**
   * Busca notificações do usuário
   */
  async getNotifications(tenantDB: TenantDatabase, userId: string, filters: NotificationFilters = {}): Promise<{
    notifications: Notification[];
    pagination: any;
  }> {
    await this.ensureTables(tenantDB);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let whereConditions = ['user_id = $1', 'is_active = TRUE'];
    let queryParams: any[] = [userId];
    let paramIndex = 2;

    if (filters.unreadOnly) {
      whereConditions.push('read = FALSE');
    }

    if (filters.type) {
      whereConditions.push(`type = $${paramIndex}`);
      queryParams.push(filters.type);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const notificationsQuery = `
      SELECT * FROM ${tenantDB.schema}.${this.tableName}
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `SELECT COUNT(*) as total FROM ${tenantDB.schema}.${this.tableName} ${whereClause}`;

    const [notifications, countResult] = await Promise.all([
      queryTenantSchema<Notification>(tenantDB, notificationsQuery, [...queryParams, limit, offset]),
      queryTenantSchema<{total: string}>(tenantDB, countQuery, queryParams)
    ]);

    const total = parseInt(countResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);

    return {
      notifications,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
    };
  }

  /**
   * Conta notificações não lidas do usuário
   */
  async getUnreadCount(tenantDB: TenantDatabase, userId: string): Promise<number> {
    await this.ensureTables(tenantDB);

    const query = `
      SELECT COUNT(*) as count
      FROM ${tenantDB.schema}.${this.tableName}
      WHERE user_id = $1 AND read = FALSE AND is_active = TRUE
    `;

    const result = await queryTenantSchema<{count: string}>(tenantDB, query, [userId]);
    return parseInt(result[0]?.count || '0');
  }

  /**
   * Cria nova notificação
   */
  async createNotification(tenantDB: TenantDatabase, data: CreateNotificationData): Promise<Notification> {
    try {
      await this.ensureTables(tenantDB);

      const notificationData = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        user_id: data.userId,
        actor_id: data.actorId || null,
        type: data.type,
        title: data.title,
        message: data.message,
        payload: data.payload ? JSON.stringify(data.payload) : null,
        link: data.link || null,
        read: false
      };

      return await insertInTenantSchema<Notification>(tenantDB, this.tableName, notificationData);
    } catch (error) {
      console.error('[NotificationsService] Failed to create notification:', error);
      // Não propagar o erro para não quebrar a operação principal
      throw error;
    }
  }

  /**
   * Marca notificação como lida
   */
  async markAsRead(tenantDB: TenantDatabase, userId: string, notificationId: string): Promise<boolean> {
    await this.ensureTables(tenantDB);

    const query = `
      UPDATE ${tenantDB.schema}.${this.tableName}
      SET read = TRUE, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND is_active = TRUE
    `;

    const result = await queryTenantSchema(tenantDB, query, [notificationId, userId]);
    return result.length > 0;
  }

  /**
   * Marca todas as notificações como lidas
   */
  async markAllAsRead(tenantDB: TenantDatabase, userId: string): Promise<boolean> {
    await this.ensureTables(tenantDB);

    const query = `
      UPDATE ${tenantDB.schema}.${this.tableName}
      SET read = TRUE, updated_at = NOW()
      WHERE user_id = $1 AND is_active = TRUE
    `;

    const result = await queryTenantSchema(tenantDB, query, [userId]);
    return result.length > 0;
  }

  /**
   * Marca múltiplas notificações como lidas
   */
  async markMultipleAsRead(tenantDB: TenantDatabase, userId: string, notificationIds: string[]): Promise<boolean> {
    await this.ensureTables(tenantDB);

    const placeholders = notificationIds.map((_, i) => `$${i + 2}`).join(', ');
    const query = `
      UPDATE ${tenantDB.schema}.${this.tableName}
      SET read = TRUE, updated_at = NOW()
      WHERE user_id = $1 AND id IN (${placeholders}) AND is_active = TRUE
    `;

    const result = await queryTenantSchema(tenantDB, query, [userId, ...notificationIds]);
    return result.length > 0;
  }

  /**
   * Remove notificação (soft delete)
   */
  async deleteNotification(tenantDB: TenantDatabase, userId: string, notificationId: string): Promise<boolean> {
    await this.ensureTables(tenantDB);

    const query = `
      UPDATE ${tenantDB.schema}.${this.tableName}
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND is_active = TRUE
    `;

    const result = await queryTenantSchema(tenantDB, query, [notificationId, userId]);
    return result.length > 0;
  }
}

export const notificationsService = new NotificationsService();