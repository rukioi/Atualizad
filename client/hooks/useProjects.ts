import { useState, useEffect } from 'react';
import { api } from '@/services/apiService';

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
      const response = await api.get('/api/deals');
      setProjects(response.data.deals || []);
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
      const response = await api.post('/api/deals', data);
      await fetchProjects();
      return response.data;
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
      const response = await api.put(`/api/deals/${id}`, data);
      await fetchProjects();
      return response.data;
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
      await api.delete(`/api/deals/${id}`);
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