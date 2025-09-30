import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { invoicesService } from '../services/invoicesService';

// Validation schemas
const createInvoiceSchema = z.object({
  number: z.string().min(1, 'Invoice number is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  clientId: z.string().optional(),
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().optional(),
  amount: z.number().min(0.01, 'Amount must be greater than zero'),
  currency: z.enum(['BRL', 'USD', 'EUR']).default('BRL'),
  status: z.enum(['draft', 'sent', 'viewed', 'approved', 'rejected', 'pending', 'paid', 'overdue', 'cancelled']).default('draft'),
  dueDate: z.string().min(1, 'Due date is required'),
  items: z.array(z.object({
    id: z.string(),
    description: z.string(),
    quantity: z.number(),
    rate: z.number(),
    amount: z.number(),
    tax: z.number().optional(),
  })).default([]),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

const updateInvoiceSchema = createInvoiceSchema.partial();

export class InvoicesController {
  async getInvoices(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Only COMPOSTA and GERENCIAL can access billing data
      if (req.user.accountType === 'SIMPLES') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Billing data not available for this account type',
        });
      }

      console.log('Fetching invoices for tenant:', req.tenantId);

      // Extrair filtros da query
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        status: req.query.status as string,
        paymentStatus: req.query.paymentStatus as string,
        search: req.query.search as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        clientId: req.query.clientId as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string
      };

      const result = await invoicesService.getInvoices(req.tenantId, filters);
      
      console.log('Invoices fetched successfully:', { count: result.invoices.length, total: result.pagination.total });
      
      res.json(result);
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({
        error: 'Failed to fetch invoices',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (req.user.accountType === 'SIMPLES') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Billing data not available for this account type',
        });
      }

      const { id } = req.params;

      console.log('Fetching invoice by ID:', id, 'for tenant:', req.tenantId);

      const invoice = await invoicesService.getInvoiceById(req.tenantId, id);

      if (!invoice) {
        return res.status(404).json({
          error: 'Invoice not found',
          message: 'The specified invoice could not be found',
        });
      }

      console.log('Invoice fetched successfully:', { id: invoice.id, number: invoice.number });

      res.json({ invoice });
    } catch (error) {
      console.error('Get invoice error:', error);
      res.status(500).json({
        error: 'Failed to fetch invoice',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async createInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (req.user.accountType === 'SIMPLES') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Billing operations not available for this account type',
        });
      }

      const validatedData = createInvoiceSchema.parse(req.body);

      console.log('Creating invoice for tenant:', req.tenantId, 'by user:', req.user.id);

      const invoice = await invoicesService.createInvoice(req.tenantId, validatedData, req.user.id);

      console.log('Invoice created successfully:', { id: invoice.id, number: invoice.number });

      res.status(201).json({
        message: 'Invoice created successfully',
        invoice,
      });
    } catch (error) {
      console.error('Create invoice error:', error);
      res.status(400).json({
        error: 'Failed to create invoice',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (req.user.accountType === 'SIMPLES') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Billing operations not available for this account type',
        });
      }

      const { id } = req.params;
      const validatedData = updateInvoiceSchema.parse(req.body);

      console.log('Updating invoice:', id, 'for tenant:', req.tenantId);

      const invoice = await invoicesService.updateInvoice(req.tenantId, id, validatedData);

      if (!invoice) {
        return res.status(404).json({
          error: 'Invoice not found',
          message: 'The specified invoice could not be found or updated',
        });
      }

      console.log('Invoice updated successfully:', { id: invoice.id, number: invoice.number });

      res.json({
        message: 'Invoice updated successfully',
        invoice,
      });
    } catch (error) {
      console.error('Update invoice error:', error);
      res.status(400).json({
        error: 'Failed to update invoice',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async deleteInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (req.user.accountType === 'SIMPLES') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Billing operations not available for this account type',
        });
      }

      const { id } = req.params;

      console.log('Deleting invoice:', id, 'for tenant:', req.tenantId);

      const deleted = await invoicesService.deleteInvoice(req.tenantId, id);

      if (!deleted) {
        return res.status(404).json({
          error: 'Invoice not found',
          message: 'The specified invoice could not be found or deleted',
        });
      }

      console.log('Invoice deleted successfully:', id);

      res.json({
        message: 'Invoice deleted successfully',
      });
    } catch (error) {
      console.error('Delete invoice error:', error);
      res.status(500).json({
        error: 'Failed to delete invoice',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getInvoiceStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (req.user.accountType === 'SIMPLES') {
        return res.json({
          totalInvoices: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          overdueAmount: 0,
        });
      }

      console.log('Fetching invoice stats for tenant:', req.tenantId);

      const stats = await invoicesService.getInvoicesStats(req.tenantId);

      console.log('Invoice stats fetched successfully:', stats);

      // Map service stats to expected frontend format
      const formattedStats = {
        totalInvoices: stats.total,
        totalAmount: stats.totalAmount,
        paidAmount: stats.paidAmount,
        pendingAmount: stats.totalAmount - stats.paidAmount,
        overdueAmount: 0, // Will need to calculate based on overdue status
        paidCount: stats.paid,
        pendingCount: stats.pending,
        overdueCount: stats.overdue,
        draftCount: stats.draft,
        thisMonth: stats.thisMonth
      };

      res.json(formattedStats);
    } catch (error) {
      console.error('Get invoice stats error:', error);
      res.status(500).json({
        error: 'Failed to fetch invoice statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const invoicesController = new InvoicesController();