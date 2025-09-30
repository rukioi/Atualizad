import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../config/database';

// Validation schemas
const createApiConfigSchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
  whatsappApiKey: z.string().optional(),
  whatsappPhoneNumber: z.string().optional(),
  resendApiKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
  codiloApiKey: z.string().optional(),
  n8nWebhookUrl: z.string().url().optional(),
  settings: z.any().optional(),
});

const updateApiConfigSchema = createApiConfigSchema.partial().omit({ tenantId: true });

export class AdminApiConfigController {
  async getApiConfigs(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.query.tenantId as string;

      let query = prisma.tenantApiConfig.findMany({
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (tenantId) {
        query = prisma.tenantApiConfig.findMany({
          where: { tenantId },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
        });
      }

      const configs = await query;

      // Remove sensitive data from response
      const safeConfigs = configs.map(config => ({
        id: config.id,
        tenantId: config.tenantId,
        tenant: config.tenant,
        hasWhatsappConfig: !!config.whatsappApiKey,
        hasResendConfig: !!config.resendApiKey,
        hasStripeConfig: !!config.stripeSecretKey,
        hasCodiloConfig: !!config.codiloApiKey,
        hasN8nConfig: !!config.n8nWebhookUrl,
        whatsappPhoneNumber: config.whatsappPhoneNumber,
        settings: config.settings,
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      }));

      res.json({ configs: safeConfigs });
    } catch (error) {
      console.error('Get API configs error:', error);
      res.status(500).json({
        error: 'Failed to fetch API configurations',
        details: error.message,
      });
    }
  }

  async getApiConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.params;

      const config = await prisma.tenantApiConfig.findUnique({
        where: { tenantId },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
      });

      if (!config) {
        return res.status(404).json({ error: 'API configuration not found' });
      }

      // Remove sensitive data from response
      const safeConfig = {
        id: config.id,
        tenantId: config.tenantId,
        tenant: config.tenant,
        hasWhatsappConfig: !!config.whatsappApiKey,
        hasResendConfig: !!config.resendApiKey,
        hasStripeConfig: !!config.stripeSecretKey,
        hasCodiloConfig: !!config.codiloApiKey,
        hasN8nConfig: !!config.n8nWebhookUrl,
        whatsappPhoneNumber: config.whatsappPhoneNumber,
        settings: config.settings,
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      };

      res.json({ config: safeConfig });
    } catch (error) {
      console.error('Get API config error:', error);
      res.status(500).json({
        error: 'Failed to fetch API configuration',
        details: error.message,
      });
    }
  }

  async createApiConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const validatedData = createApiConfigSchema.parse(req.body);

      // Check if tenant exists
      const tenant = await prisma.tenant.findUnique({
        where: { id: validatedData.tenantId },
      });

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      // Check if config already exists
      const existingConfig = await prisma.tenantApiConfig.findUnique({
        where: { tenantId: validatedData.tenantId },
      });

      if (existingConfig) {
        return res.status(400).json({ 
          error: 'API configuration already exists for this tenant',
          message: 'Use PUT to update existing configuration'
        });
      }

      const config = await prisma.tenantApiConfig.create({
        data: {
          tenantId: validatedData.tenantId,
          whatsappApiKey: validatedData.whatsappApiKey,
          whatsappPhoneNumber: validatedData.whatsappPhoneNumber,
          resendApiKey: validatedData.resendApiKey,
          stripeSecretKey: validatedData.stripeSecretKey,
          stripeWebhookSecret: validatedData.stripeWebhookSecret,
          codiloApiKey: validatedData.codiloApiKey,
          n8nWebhookUrl: validatedData.n8nWebhookUrl,
          settings: validatedData.settings || {},
          isActive: true,
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.status(201).json({
        message: 'API configuration created successfully',
        config: {
          id: config.id,
          tenantId: config.tenantId,
          tenant: config.tenant,
          hasWhatsappConfig: !!config.whatsappApiKey,
          hasResendConfig: !!config.resendApiKey,
          hasStripeConfig: !!config.stripeSecretKey,
          hasCodiloConfig: !!config.codiloApiKey,
          hasN8nConfig: !!config.n8nWebhookUrl,
          whatsappPhoneNumber: config.whatsappPhoneNumber,
          settings: config.settings,
          isActive: config.isActive,
          createdAt: config.createdAt,
        },
      });
    } catch (error) {
      console.error('Create API config error:', error);
      res.status(400).json({
        error: 'Failed to create API configuration',
        details: error.message,
      });
    }
  }

  async updateApiConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.params;
      const validatedData = updateApiConfigSchema.parse(req.body);

      const existingConfig = await prisma.tenantApiConfig.findUnique({
        where: { tenantId },
      });

      if (!existingConfig) {
        return res.status(404).json({ error: 'API configuration not found' });
      }

      const updatedConfig = await prisma.tenantApiConfig.update({
        where: { tenantId },
        data: {
          ...validatedData,
          updatedAt: new Date(),
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.json({
        message: 'API configuration updated successfully',
        config: {
          id: updatedConfig.id,
          tenantId: updatedConfig.tenantId,
          tenant: updatedConfig.tenant,
          hasWhatsappConfig: !!updatedConfig.whatsappApiKey,
          hasResendConfig: !!updatedConfig.resendApiKey,
          hasStripeConfig: !!updatedConfig.stripeSecretKey,
          hasCodiloConfig: !!updatedConfig.codiloApiKey,
          hasN8nConfig: !!updatedConfig.n8nWebhookUrl,
          whatsappPhoneNumber: updatedConfig.whatsappPhoneNumber,
          settings: updatedConfig.settings,
          isActive: updatedConfig.isActive,
          updatedAt: updatedConfig.updatedAt,
        },
      });
    } catch (error) {
      console.error('Update API config error:', error);
      res.status(400).json({
        error: 'Failed to update API configuration',
        details: error.message,
      });
    }
  }

  async deleteApiConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.params;

      const config = await prisma.tenantApiConfig.findUnique({
        where: { tenantId },
      });

      if (!config) {
        return res.status(404).json({ error: 'API configuration not found' });
      }

      await prisma.tenantApiConfig.delete({
        where: { tenantId },
      });

      res.json({ message: 'API configuration deleted successfully' });
    } catch (error) {
      console.error('Delete API config error:', error);
      res.status(500).json({
        error: 'Failed to delete API configuration',
        details: error.message,
      });
    }
  }

  async toggleApiConfigStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.params;
      const { isActive } = req.body;

      const config = await prisma.tenantApiConfig.findUnique({
        where: { tenantId },
      });

      if (!config) {
        return res.status(404).json({ error: 'API configuration not found' });
      }

      const updatedConfig = await prisma.tenantApiConfig.update({
        where: { tenantId },
        data: {
          isActive: typeof isActive === 'boolean' ? isActive : !config.isActive,
          updatedAt: new Date(),
        },
      });

      res.json({
        message: 'API configuration status updated successfully',
        isActive: updatedConfig.isActive,
      });
    } catch (error) {
      console.error('Toggle API config status error:', error);
      res.status(500).json({
        error: 'Failed to toggle API configuration status',
        details: error.message,
      });
    }
  }
}

export const adminApiConfigController = new AdminApiConfigController();