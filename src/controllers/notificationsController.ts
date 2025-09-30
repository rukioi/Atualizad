import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';

// Validation schemas
const createNotificationSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  actorId: z.string().uuid().optional(),
  type: z.enum(['task', 'invoice', 'system', 'client', 'project']),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  message: z.string().min(1, 'Message is required'),
  payload: z.any().optional(),
  link: z.string().optional(),
});

const markAsReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).optional(),
  markAll: z.boolean().optional(),
});

export class NotificationsController {
  async getNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // TODO: Implementar busca real de notificações do banco de dados
      // Por enquanto, retornar array vazio até implementar a funcionalidade completa
      const notifications: any[] = [];
      
      // Quando implementar, buscar notificações do tenant schema:
      // const { tenantDB } = await import('../config/database');
      // const result = await tenantDB.executeInTenantSchema(req.tenantId!, `
      //   SELECT * FROM \${schema}.notifications 
      //   WHERE user_id = $1 AND is_active = true 
      //   ORDER BY created_at DESC 
      //   LIMIT 50
      // `, [req.user.id]);

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const unreadOnly = req.query.unreadOnly === 'true';
      const type = req.query.type as string;

      let filteredNotifications = notifications;

      if (unreadOnly) {
        filteredNotifications = filteredNotifications.filter((n: any) => !n.read);
      }

      if (type) {
        filteredNotifications = filteredNotifications.filter((n: any) => n.type === type);
      }

      const total = filteredNotifications.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paginatedNotifications = filteredNotifications.slice(offset, offset + limit);

      res.json({
        notifications: paginatedNotifications,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        error: 'Failed to fetch notifications',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getUnreadCount(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Retornar 0 até implementar sistema real de notificações
      const unreadCount = 0;

      res.json({ unreadCount });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        error: 'Failed to get unread count',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async createNotification(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validatedData = createNotificationSchema.parse(req.body);

      const mockNotification = {
        id: 'notif-' + Date.now(),
        ...validatedData,
        actorId: validatedData.actorId || req.user.id,
        read: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      res.status(201).json({
        message: 'Notification created successfully',
        notification: mockNotification,
      });
    } catch (error) {
      console.error('Create notification error:', error);
      res.status(400).json({
        error: 'Failed to create notification',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const validatedData = markAsReadSchema.parse(req.body);

      if (validatedData.markAll) {
        res.json({ message: 'All notifications marked as read' });
      } else if (id) {
        res.json({ message: 'Notification marked as read' });
      } else if (validatedData.notificationIds) {
        res.json({ message: 'Notifications marked as read' });
      } else {
        res.status(400).json({ error: 'No notification ID or markAll flag provided' });
      }
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(400).json({
        error: 'Failed to mark notification as read',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async deleteNotification(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;

      res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(400).json({
        error: 'Failed to delete notification',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const notificationsController = new NotificationsController();