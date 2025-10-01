/**
 * NOTIFICATIONS CONTROLLER - Gestão de Notificações
 * =================================================
 * 
 * ✅ ISOLAMENTO TENANT: Usa req.tenantDB para garantir isolamento por schema
 * ✅ ISOLAMENTO POR USUÁRIO: Notificações são isoladas por usuário
 * ✅ SEM DADOS MOCK: Operações reais no banco de dados do tenant
 */

import { Response } from 'express';
import { z } from 'zod';
import { TenantRequest } from '../types';
import { notificationsService } from '../services/notificationsService';

// Validation schemas
// NOTE: userId is NOT accepted from body for security - always uses req.user.id
const createNotificationSchema = z.object({
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
  async getNotifications(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        unreadOnly: req.query.unreadOnly === 'true',
        type: req.query.type as string
      };

      const result = await notificationsService.getNotifications(req.tenantDB, req.user.id, filters);
      res.json(result);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        error: 'Failed to fetch notifications',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getUnreadCount(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const unreadCount = await notificationsService.getUnreadCount(req.tenantDB, req.user.id);
      res.json({ unreadCount });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        error: 'Failed to get unread count',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async createNotification(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validatedData = createNotificationSchema.parse(req.body);
      
      // ✅ SECURITY: Always use req.user.id for userId - never accept from body
      // This prevents privilege escalation attacks
      const notificationData = {
        ...validatedData,
        userId: req.user.id,  // Always the authenticated user
        actorId: req.user.id  // Always the authenticated user
      };

      const notification = await notificationsService.createNotification(req.tenantDB, notificationData);

      res.status(201).json({
        message: 'Notification created successfully',
        notification,
      });
    } catch (error) {
      console.error('Create notification error:', error);
      res.status(400).json({
        error: 'Failed to create notification',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async markAsRead(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const validatedData = markAsReadSchema.parse(req.body);

      if (validatedData.markAll) {
        await notificationsService.markAllAsRead(req.tenantDB, req.user.id);
        res.json({ message: 'All notifications marked as read' });
      } else if (id) {
        await notificationsService.markAsRead(req.tenantDB, req.user.id, id);
        res.json({ message: 'Notification marked as read' });
      } else if (validatedData.notificationIds) {
        await notificationsService.markMultipleAsRead(req.tenantDB, req.user.id, validatedData.notificationIds);
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

  async deleteNotification(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const deleted = await notificationsService.deleteNotification(req.tenantDB, req.user.id, id);

      if (!deleted) {
        return res.status(404).json({ error: 'Notification not found' });
      }

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