import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { clientsService } from '../services/clientsService';

// Validation schemas
const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(1, 'Phone is required'),
  organization: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  budget: z.number().min(0).optional(),
  currency: z.enum(['BRL', 'USD', 'EUR']).default('BRL'),
  status: z.string().default('active'),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

const updateClientSchema = createClientSchema.partial();

export class ClientsController {
  async getClients(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('Fetching clients for tenant:', req.tenantId);

      // Extrair filtros da query
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        status: req.query.status as string,
        search: req.query.search as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined
      };

      const result = await clientsService.getClients(req.tenantId, filters);
      
      console.log('Clients fetched successfully:', { count: result.clients.length, total: result.pagination.total });
      
      res.json(result);
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({
        error: 'Failed to fetch clients',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getClient(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      
      console.log('Fetching client:', id, 'for tenant:', req.tenantId);

      const client = await clientsService.getClientById(req.tenantId, id);
      
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      console.log('Client fetched successfully:', client.id);

      res.json({
        client,
        related: {
          projects: [],
          tasks: [],
        },
      });
    } catch (error) {
      console.error('Get client error:', error);
      res.status(500).json({
        error: 'Failed to fetch client',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async createClient(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validatedData = createClientSchema.parse(req.body);
      
      console.log('Creating client for tenant:', req.tenantId, 'by user:', req.user.id);

      const client = await clientsService.createClient(req.tenantId, validatedData, req.user.id);
      
      console.log('Client created successfully:', client.id);

      res.status(201).json({
        message: 'Client created successfully',
        client,
      });
    } catch (error) {
      console.error('Create client error:', error);
      res.status(400).json({
        error: 'Failed to create client',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateClient(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const validatedData = updateClientSchema.parse(req.body);
      
      console.log('Updating client:', id, 'for tenant:', req.tenantId);

      const client = await clientsService.updateClient(req.tenantId, id, validatedData);
      
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      console.log('Client updated successfully:', client.id);

      res.json({
        message: 'Client updated successfully',
        client,
      });
    } catch (error) {
      console.error('Update client error:', error);
      res.status(400).json({
        error: 'Failed to update client',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async deleteClient(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      
      console.log('Deleting client:', id, 'for tenant:', req.tenantId);

      const success = await clientsService.deleteClient(req.tenantId, id);
      
      if (!success) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      console.log('Client deleted successfully:', id);

      res.json({
        message: 'Client deleted successfully',
      });
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({
        error: 'Failed to delete client',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const clientsController = new ClientsController();