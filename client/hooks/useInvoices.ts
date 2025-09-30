import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

export function useInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvoices = async (params: any = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getInvoices(params);
      setInvoices(response.invoices);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load invoices';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createInvoice = async (data: any) => {
    try {
      const response = await apiService.createInvoice(data);
      await loadInvoices(); // Reload list
      return response;
    } catch (err) {
      throw err;
    }
  };

  const updateInvoice = async (id: string, data: any) => {
    try {
      const response = await apiService.updateInvoice(id, data);
      await loadInvoices(); // Reload list
      return response;
    } catch (err) {
      throw err;
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      await apiService.deleteInvoice(id);
      await loadInvoices(); // Reload list
    } catch (err) {
      throw err;
    }
  };

  const getInvoiceStats = async () => {
    try {
      return await apiService.getInvoiceStats();
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  return {
    invoices,
    isLoading,
    error,
    loadInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoiceStats,
  };
}