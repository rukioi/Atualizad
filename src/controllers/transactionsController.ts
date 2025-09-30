import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { transactionsService } from '../services/transactionsService';

// Validation schemas
const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().min(0.01, 'Amount must be greater than zero'),
  categoryId: z.string().min(1, 'Category is required'),
  category: z.string().min(1, 'Category name is required'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  paymentMethod: z.enum(['pix', 'credit_card', 'debit_card', 'bank_transfer', 'boleto', 'cash', 'check']).optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled']).default('confirmed'),
  projectId: z.string().optional(),
  projectTitle: z.string().optional(),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
});

const updateTransactionSchema = createTransactionSchema.partial();

export class TransactionsController {
  async getTransactions(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Only COMPOSTA and GERENCIAL can access financial data
      if (req.user.accountType === 'SIMPLES') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Financial data not available for this account type',
        });
      }

      // Extract query parameters for filtering
      const {
        page,
        limit,
        type,
        status,
        categoryId,
        search,
        tags,
        projectId,
        clientId,
        dateFrom,
        dateTo,
        paymentMethod,
        isRecurring
      } = req.query;

      const filters = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        type: type as 'income' | 'expense' | undefined,
        status: status as string | undefined,
        categoryId: categoryId as string | undefined,
        search: search as string | undefined,
        tags: tags ? (Array.isArray(tags) ? tags as string[] : [tags as string]) : undefined,
        projectId: projectId as string | undefined,
        clientId: clientId as string | undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
        paymentMethod: paymentMethod as string | undefined,
        isRecurring: isRecurring ? isRecurring === 'true' : undefined
      };

      // Get transactions from database
      const result = await transactionsService.getTransactions(req.tenantId, filters);

      res.json(result);
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({
        error: 'Failed to fetch transactions',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (req.user.accountType === 'SIMPLES') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Financial data not available for this account type',
        });
      }

      const { id } = req.params;

      // Get transaction from database
      const transaction = await transactionsService.getTransactionById(req.tenantId, id);

      if (!transaction) {
        return res.status(404).json({
          error: 'Transaction not found',
          message: 'The requested transaction does not exist or has been deleted'
        });
      }

      res.json({ transaction });
    } catch (error) {
      console.error('Get transaction error:', error);
      res.status(500).json({
        error: 'Failed to fetch transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async createTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (req.user.accountType === 'SIMPLES') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Financial operations not available for this account type',
        });
      }

      const validatedData = createTransactionSchema.parse(req.body);

      // Create transaction in database
      const transaction = await transactionsService.createTransaction(
        req.tenantId,
        validatedData,
        req.user.id
      );

      res.status(201).json({
        message: 'Transaction created successfully',
        transaction,
      });
    } catch (error) {
      console.error('Create transaction error:', error);
      res.status(400).json({
        error: 'Failed to create transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (req.user.accountType === 'SIMPLES') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Financial operations not available for this account type',
        });
      }

      const { id } = req.params;
      const validatedData = updateTransactionSchema.parse(req.body);

      // Update transaction in database
      const transaction = await transactionsService.updateTransaction(
        req.tenantId,
        id,
        validatedData
      );

      if (!transaction) {
        return res.status(404).json({
          error: 'Transaction not found',
          message: 'The requested transaction does not exist or has been deleted'
        });
      }

      res.json({
        message: 'Transaction updated successfully',
        transaction,
      });
    } catch (error) {
      console.error('Update transaction error:', error);
      res.status(400).json({
        error: 'Failed to update transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async deleteTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (req.user.accountType === 'SIMPLES') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Financial operations not available for this account type',
        });
      }

      const { id } = req.params;

      // Delete transaction from database
      const success = await transactionsService.deleteTransaction(req.tenantId, id);

      if (!success) {
        return res.status(404).json({
          error: 'Transaction not found',
          message: 'The requested transaction does not exist or has already been deleted'
        });
      }

      res.json({
        message: 'Transaction deleted successfully',
      });
    } catch (error) {
      console.error('Delete transaction error:', error);
      res.status(500).json({
        error: 'Failed to delete transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const transactionsController = new TransactionsController();