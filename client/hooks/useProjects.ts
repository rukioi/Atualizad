import { useState, useEffect } from 'react';
import { apiService } from '@/services/apiService';

export interface Project {
  id: string;
  title: string;
  description?: string;
  contactName: string;
  clientId?: string;
  organization?: string;
  email: string;
  mobile: string;
  address?: string;
  budget?: number;
  currency: 'BRL' | 'USD' | 'EUR';
  stage: 'contacted' | 'proposal' | 'won' | 'lost';
  tags: string[];
  notes?: string;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.request('/deals');
      setProjects(response.deals || []);
    } catch (err: any) {
      console.error('Erro ao buscar deals:', err);
      setError(err.message);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const createProject = async (data: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.request('/deals', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      await fetchProjects();
      return response;
    } catch (err: any) {
      console.error('Erro ao criar deal:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProject = async (id: string, data: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.request(`/deals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      await fetchProjects();
      return response;
    } catch (err: any) {
      console.error('Erro ao atualizar deal:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await apiService.request(`/deals/${id}`, {
        method: 'DELETE'
      });
      await fetchProjects();
    } catch (err: any) {
      console.error('Erro ao excluir deal:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    projects,
    isLoading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject
  };
}