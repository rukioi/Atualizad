/**
 * CLIENTS CONTROLLER - Gestão de Clientes
 * ========================================
 * 
 * Controller responsável por gerenciar as requisições relacionadas a clientes.
 * 
 * ✅ ISOLAMENTO TENANT: Usa req.tenantDB injetado pelo middleware validateTenantAccess
 * ✅ SEM DADOS MOCK: Todas as operações são feitas diretamente no banco de dados do tenant
 * 
 * @see src/middleware/tenant-isolation.ts - Middleware que injeta req.tenantDB
 * @see src/utils/tenantHelpers.ts - Helpers de isolamento para queries SQL
 */

import { Response } from 'express';
import { z } from 'zod';
import { TenantRequest } from '../types';
import { clientsService } from '../services/clientsService';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  mobile: z.string().optional(),
  phone: z.string().optional(),
  organization: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  zipCode: z.string().optional(),
  budget: z.number().min(0).optional(),
  currency: z.enum(['BRL', 'USD', 'EUR']).default('BRL'),
  level: z.string().optional(),
  status: z.string().default('active'),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  description: z.string().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  professionalTitle: z.string().optional(),
  maritalStatus: z.string().optional(),
  birthDate: z.string().optional(),
  pis: z.string().optional(),
  cei: z.string().optional(),
  inssStatus: z.string().optional(),
  amountPaid: z.number().optional(),
  referredBy: z.string().optional(),
  registeredBy: z.string().optional(),
});

const updateClientSchema = createClientSchema.partial();

// ============================================================================
// CONTROLLER CLASS
// ============================================================================

export class ClientsController {
  /**
   * GET /api/clients
   * Lista todos os clientes do tenant com filtros e paginação
   */
  async getClients(req: TenantRequest, res: Response) {
    try {
      // ✅ Validação: req.tenantDB deve estar presente (injetado pelo middleware)
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('[ClientsController] Fetching clients for tenant:', req.tenant?.id);

      // Extrair filtros da query
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        status: req.query.status as string,
        search: req.query.search as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined
      };

      // ✅ ISOLAMENTO: Passa req.tenantDB para garantir isolamento por schema
      const result = await clientsService.getClients(req.tenantDB, filters);
      
      console.log('[ClientsController] Clients fetched:', { 
        count: result.clients.length, 
        total: result.pagination.total 
      });
      
      res.json(result);
    } catch (error) {
      console.error('[ClientsController] Get clients error:', error);
      res.status(500).json({
        error: 'Failed to fetch clients',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/clients/:id
   * Busca um cliente específico por ID
   */
  async getClient(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      
      console.log('[ClientsController] Fetching client:', id);

      // ✅ ISOLAMENTO: Usa req.tenantDB
      const client = await clientsService.getClientById(req.tenantDB, id);
      
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      console.log('[ClientsController] Client fetched:', client.id);

      // ✅ SEM MOCK: Buscar relacionamentos reais quando necessário
      // TODO: Implementar busca real de projects e tasks relacionados ao client
      res.json({
        client,
        related: {
          projects: [], // TODO: Buscar do banco quando implementado
          tasks: [],    // TODO: Buscar do banco quando implementado
        },
      });
    } catch (error) {
      console.error('[ClientsController] Get client error:', error);
      res.status(500).json({
        error: 'Failed to fetch client',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/clients
   * Cria um novo cliente
   */
  async createClient(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validatedData = createClientSchema.parse(req.body);
      
      console.log('[ClientsController] Creating client for user:', req.user.id);

      // ✅ ISOLAMENTO: Passa req.tenantDB e userId do token verificado
      const client = await clientsService.createClient(
        req.tenantDB, 
        validatedData, 
        req.user.id
      );
      
      console.log('[ClientsController] Client created:', client.id);

      res.status(201).json({
        message: 'Client created successfully',
        client,
      });
    } catch (error) {
      console.error('[ClientsController] Create client error:', error);
      res.status(400).json({
        error: 'Failed to create client',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PUT /api/clients/:id
   * Atualiza um cliente existente
   */
  async updateClient(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const validatedData = updateClientSchema.parse(req.body);
      
      console.log('[ClientsController] Updating client:', id);

      // ✅ ISOLAMENTO: Usa req.tenantDB
      const client = await clientsService.updateClient(req.tenantDB, id, validatedData);
      
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      console.log('[ClientsController] Client updated:', client.id);

      res.json({
        message: 'Client updated successfully',
        client,
      });
    } catch (error) {
      console.error('[ClientsController] Update client error:', error);
      res.status(400).json({
        error: 'Failed to update client',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/clients/:id
   * Remove um cliente (soft delete)
   */
  async deleteClient(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      
      console.log('[ClientsController] Deleting client:', id);

      // ✅ ISOLAMENTO: Usa req.tenantDB para soft delete
      const success = await clientsService.deleteClient(req.tenantDB, id);
      
      if (!success) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      console.log('[ClientsController] Client deleted:', id);

      res.json({
        message: 'Client deleted successfully',
      });
    } catch (error) {
      console.error('[ClientsController] Delete client error:', error);
      res.status(500).json({
        error: 'Failed to delete client',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const clientsController = new ClientsController();
