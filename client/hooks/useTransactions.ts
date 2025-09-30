import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

export function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = async (params: any = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getTransactions(params);
      setTransactions(response.transactions);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createTransaction = async (data: any) => {
    try {
      const response = await apiService.createTransaction(data);
      await loadTransactions(); // Reload list
      return response;
    } catch (err) {
      throw err;
    }
  };

  const updateTransaction = async (id: string, data: any) => {
    try {
      const response = await apiService.updateTransaction(id, data);
      await loadTransactions(); // Reload list
      return response;
    } catch (err) {
      throw err;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await apiService.deleteTransaction(id);
      await loadTransactions(); // Reload list
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  return {
    transactions,
    isLoading,
    error,
    loadTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}