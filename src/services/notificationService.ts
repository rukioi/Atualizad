import { TenantDatabase } from '../config/database';
import { prisma } from '../config/database';

export interface CreateNotificationRequest {
  userId: string;
  actorId?: string;
  type: 'task' | 'invoice' | 'system' | 'client' | 'project';
  title: string;
  message: string;
  payload?: any;
  link?: string;
}

export interface Notification {
  id: string;
  userId: string;
  actorId?: string;
  type: string;
  title: string;
  message: string;
  payload: any;
  link?: string;
  read: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationService {
  private tenantDb: TenantDatabase;

  constructor(tenantId: string) {
    this.tenantDb = new TenantDatabase(tenantId);
  }

  async create(request: CreateNotificationRequest): Promise<Notification> {
    try {
      const notification = await this.tenantDb.create('notifications', {
        user_id: request.userId,
        actor_id: request.actorId,
        type: request.type,
        title: request.title,
        message: request.message,
        payload: JSON.stringify(request.payload || {}),
        link: request.link,
        read: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Log audit trail
      await this.logAuditTrail(
        request.actorId || request.userId,
        'notifications',
        notification.id,
        'CREATE',
        null,
        notification
      );

      return this.mapToNotification(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  async findByUser(
    userId: string,
    options: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
      type?: string;
    } = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    try {
      const { unreadOnly = false, limit = 50, offset = 0, type } = options;

      let whereConditions = ['user_id = $1', 'is_active = true'];
      const params = [userId];

      if (unreadOnly) {
        whereConditions.push('read = false');
      }

      if (type) {
        whereConditions.push(`type = $${params.length + 1}`);
        params.push(type);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Get notifications
      const notifications = await this.tenantDb.query(`
        SELECT * FROM \${schema}.notifications 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `, params);

      // Get total count
      const totalResult = await this.tenantDb.query(`
        SELECT COUNT(*) as total
        FROM \${schema}.notifications 
        ${whereClause}
      `, params);

      const total = parseInt(totalResult[0]?.total || 0);

      return {
        notifications: notifications.map(this.mapToNotification),
        total,
      };
    } catch (error) {
      console.error('Error finding notifications:', error);
      throw new Error('Failed to fetch notifications');
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const oldNotification = await this.tenantDb.findById('notifications', notificationId);
      
      if (!oldNotification || oldNotification.user_id !== userId) {
        throw new Error('Notification not found or access denied');
      }

      const updatedNotification = await this.tenantDb.update('notifications', notificationId, {
        read: true,
        updated_at: new Date(),
      });

      // Log audit trail
      await this.logAuditTrail(
        userId,
        'notifications',
        notificationId,
        'UPDATE',
        oldNotification,
        updatedNotification
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      await this.tenantDb.query(`
        UPDATE \${schema}.notifications 
        SET read = true, updated_at = NOW()
        WHERE user_id = $1 AND read = false AND is_active = true
      `, [userId]);

      // Log audit trail
      await this.logAuditTrail(
        userId,
        'notifications',
        'bulk',
        'UPDATE',
        { action: 'mark_all_as_read' },
        { userId, timestamp: new Date() }
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  async delete(notificationId: string, userId: string): Promise<void> {
    try {
      const notification = await this.tenantDb.findById('notifications', notificationId);
      
      if (!notification || notification.user_id !== userId) {
        throw new Error('Notification not found or access denied');
      }

      await this.tenantDb.update('notifications', notificationId, {
        is_active: false,
        updated_at: new Date(),
      });

      // Log audit trail
      await this.logAuditTrail(
        userId,
        'notifications',
        notificationId,
        'DELETE',
        notification,
        null
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw new Error('Failed to delete notification');
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const result = await this.tenantDb.query(`
        SELECT COUNT(*) as count
        FROM \${schema}.notifications 
        WHERE user_id = $1 AND read = false AND is_active = true
      `, [userId]);

      return parseInt(result[0]?.count || 0);
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Static method to create notifications across different tenants
  static async createForTenant(
    tenantId: string,
    request: CreateNotificationRequest
  ): Promise<void> {
    const service = new NotificationService(tenantId);
    await service.create(request);
  }

  // Helper method to create system notifications
  static async createSystemNotification(
    tenantId: string,
    userId: string,
    title: string,
    message: string,
    payload?: any
  ): Promise<void> {
    await NotificationService.createForTenant(tenantId, {
      userId,
      type: 'system',
      title,
      message,
      payload,
    });
  }

  private mapToNotification(data: any): Notification {
    return {
      id: data.id,
      userId: data.user_id,
      actorId: data.actor_id,
      type: data.type,
      title: data.title,
      message: data.message,
      payload: typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload,
      link: data.link,
      read: data.read,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private async logAuditTrail(
    userId: string,
    tableName: string,
    recordId: string,
    operation: string,
    oldData: any,
    newData: any
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          tenantId: this.tenantDb['tenantId'], // Access private property
          tableName,
          recordId,
          operation,
          oldData: oldData || undefined,
          newData: newData || undefined,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Audit log error:', error);
    }
  }
}
/**
 * NOTIFICATION SERVICE - SISTEMA DE NOTIFICAÇÕES
 * =============================================
 * 
 * Serviço responsável por gerenciar notificações do sistema.
 * Isolado por tenant com suporte a diferentes tipos de notificação.
 */

import { tenantDB } from './tenantDatabase';

export interface Notification {
  id: string;
  user_id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'reminder';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CreateNotificationData {
  userId?: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'reminder';
  title: string;
  message: string;
  data?: any;
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  type?: string;
  read?: boolean;
  search?: string;
}

export class NotificationService {
  private tableName = 'notifications';

  /**
   * Cria as tabelas necessárias se não existirem
   */
  async initializeTables(tenantId: string): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \${schema}.${this.tableName} (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        type VARCHAR NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'reminder')),
        title VARCHAR NOT NULL,
        message TEXT NOT NULL,
        data JSONB DEFAULT '{}',
        read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      )
    `;
    
    await tenantDB.executeInTenantSchema(tenantId, createTableQuery);
    
    // Criar índices para performance
    const createIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_user_id ON \${schema}.${this.tableName}(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_type ON \${schema}.${this.tableName}(type)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_read ON \${schema}.${this.tableName}(read)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_at ON \${schema}.${this.tableName}(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_active ON \${schema}.${this.tableName}(is_active)`
    ];
    
    for (const indexQuery of createIndexes) {
      await tenantDB.executeInTenantSchema(tenantId, indexQuery);
    }
  }

  /**
   * Busca notificações do usuário
   */
  async getUserNotifications(tenantId: string, userId: string, filters: NotificationFilters = {}): Promise<{
    notifications: Notification[];
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
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    
    let whereConditions = ['is_active = TRUE', 'user_id = $1'];
    let queryParams: any[] = [userId];
    let paramIndex = 2;
    
    if (filters.type) {
      whereConditions.push(`type = $${paramIndex}`);
      queryParams.push(filters.type);
      paramIndex++;
    }
    
    if (filters.read !== undefined) {
      whereConditions.push(`read = $${paramIndex}`);
      queryParams.push(filters.read);
      paramIndex++;
    }
    
    if (filters.search) {
      whereConditions.push(`(title ILIKE $${paramIndex} OR message ILIKE $${paramIndex})`);
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    const notificationsQuery = `
      SELECT 
        id, user_id, type, title, message, data, read, read_at,
        created_at, updated_at, is_active
      FROM \${schema}.${this.tableName}
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM \${schema}.${this.tableName}
      ${whereClause}
    `;
    
    const [notifications, countResult] = await Promise.all([
      tenantDB.executeInTenantSchema<Notification>(tenantId, notificationsQuery, [...queryParams, limit, offset]),
      tenantDB.executeInTenantSchema<{total: string}>(tenantId, countQuery, queryParams)
    ]);
    
    const total = parseInt(countResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);
    
    return {
      notifications,
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
   * Cria uma nova notificação
   */
  async createNotification(tenantId: string, notificationData: CreateNotificationData): Promise<Notification> {
    await this.initializeTables(tenantId);
    
    const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const query = `
      INSERT INTO \${schema}.${this.tableName} (
        id, user_id, type, title, message, data
      ) VALUES (
        $1, $2, $3, $4, $5, $6::jsonb
      )
      RETURNING 
        id, user_id, type, title, message, data, read, read_at,
        created_at, updated_at, is_active
    `;
    
    const params = [
      notificationId,
      notificationData.userId,
      notificationData.type,
      notificationData.title,
      notificationData.message,
      JSON.stringify(notificationData.data || {})
    ];
    
    const result = await tenantDB.executeInTenantSchema<Notification>(tenantId, query, params);
    return result[0];
  }

  /**
   * Marca notificação(ões) como lida(s)
   */
  async markAsRead(tenantId: string, userId: string, notificationIds?: string[], markAll?: boolean): Promise<boolean> {
    await this.initializeTables(tenantId);
    
    let query: string;
    let params: any[];
    
    if (markAll) {
      query = `
        UPDATE \${schema}.${this.tableName}
        SET read = TRUE, read_at = NOW(), updated_at = NOW()
        WHERE user_id = $1 AND read = FALSE AND is_active = TRUE
      `;
      params = [userId];
    } else if (notificationIds && notificationIds.length > 0) {
      const placeholders = notificationIds.map((_, index) => `$${index + 2}`).join(',');
      query = `
        UPDATE \${schema}.${this.tableName}
        SET read = TRUE, read_at = NOW(), updated_at = NOW()
        WHERE user_id = $1 AND id IN (${placeholders}) AND is_active = TRUE
      `;
      params = [userId, ...notificationIds];
    } else {
      return false;
    }
    
    const result = await tenantDB.executeInTenantSchema(tenantId, query, params);
    return result.length > 0;
  }

  /**
   * Exclui notificações (soft delete)
   */
  async deleteNotifications(tenantId: string, userId: string, notificationIds: string[]): Promise<boolean> {
    await this.initializeTables(tenantId);
    
    const placeholders = notificationIds.map((_, index) => `$${index + 2}`).join(',');
    const query = `
      UPDATE \${schema}.${this.tableName}
      SET is_active = FALSE, updated_at = NOW()
      WHERE user_id = $1 AND id IN (${placeholders}) AND is_active = TRUE
    `;
    
    const params = [userId, ...notificationIds];
    const result = await tenantDB.executeInTenantSchema(tenantId, query, params);
    return result.length > 0;
  }

  /**
   * Obtém estatísticas das notificações do usuário
   */
  async getUserNotificationStats(tenantId: string, userId: string): Promise<{
    total: number;
    unread: number;
    read: number;
    byType: { type: string; count: number }[];
  }> {
    await this.initializeTables(tenantId);
    
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE read = FALSE) as unread,
        COUNT(*) FILTER (WHERE read = TRUE) as read
      FROM \${schema}.${this.tableName}
      WHERE user_id = $1 AND is_active = TRUE
    `;
    
    const typeQuery = `
      SELECT 
        type,
        COUNT(*) as count
      FROM \${schema}.${this.tableName}
      WHERE user_id = $1 AND is_active = TRUE
      GROUP BY type
      ORDER BY count DESC
    `;
    
    const [stats, typeStats] = await Promise.all([
      tenantDB.executeInTenantSchema<any>(tenantId, query, [userId]),
      tenantDB.executeInTenantSchema<any>(tenantId, typeQuery, [userId])
    ]);
    
    const mainStats = stats[0];
    
    return {
      total: parseInt(mainStats.total || '0'),
      unread: parseInt(mainStats.unread || '0'),
      read: parseInt(mainStats.read || '0'),
      byType: typeStats.map(row => ({
        type: row.type,
        count: parseInt(row.count || '0')
      }))
    };
  }

  /**
   * Cria notificação para múltiplos usuários
   */
  async createBulkNotification(tenantId: string, userIds: string[], notificationData: Omit<CreateNotificationData, 'userId'>): Promise<boolean> {
    await this.initializeTables(tenantId);
    
    const notifications = userIds.map(userId => ({
      ...notificationData,
      userId
    }));
    
    for (const notification of notifications) {
      await this.createNotification(tenantId, notification);
    }
    
    return true;
  }

  /**
   * Limpa notificações antigas (mais de 30 dias)
   */
  async cleanupOldNotifications(tenantId: string): Promise<number> {
    await this.initializeTables(tenantId);
    
    const query = `
      UPDATE \${schema}.${this.tableName}
      SET is_active = FALSE, updated_at = NOW()
      WHERE created_at < NOW() - INTERVAL '30 days' AND is_active = TRUE
      RETURNING id
    `;
    
    const result = await tenantDB.executeInTenantSchema(tenantId, query);
    return result.length;
  }
}

export const notificationService = new NotificationService();
