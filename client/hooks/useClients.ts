import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

export function useClients() {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClients = async (params: any = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getClients(params);
      setClients(response.clients);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load clients';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createClient = async (data: any) => {
    try {
      const response = await apiService.createClient(data);
      await loadClients(); // Reload list
      return response;
    } catch (err) {
      throw err;
    }
  };

  const updateClient = async (id: string, data: any) => {
    try {
      const response = await apiService.updateClient(id, data);
      await loadClients(); // Reload list
      return response;
    } catch (err) {
      throw err;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      await apiService.deleteClient(id);
      await loadClients(); // Reload list
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  return {
    clients,
    isLoading,
    error,
    loadClients,
    createClient,
    updateClient,
    deleteClient,
  };
}