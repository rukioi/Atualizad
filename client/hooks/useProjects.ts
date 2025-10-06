/**
 * HOOK: useProjects
 * =================
 * 
 * Hook para gerenciar projetos usando apiService
 * ✅ Usa endpoints reais do backend
 * ✅ Sem dados mock
 * ✅ Integração completa com CRUD
 */

import { useState, useEffect } from 'react';
import { apiService } from '@/services/apiService';

export interface Project {
  id: string;
  title: string;
  description?: string;
  clientId?: string;
  clientName: string;
  organization?: string;
  address?: string;
  budget?: number;
  currency: 'BRL' | 'USD' | 'EUR';
  status: 'contacted' | 'proposal' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high';
  progress: number;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  tags: string[];
  assignedTo: string[];
  notes?: string;
  contacts: any[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStats {
  total: number;
  avgProgress: number;
  overdue: number;
  revenue: number;
  byStatus: {
    contacted: number;
    proposal: number;
    won: number;
    lost: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
  };
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carrega lista de projetos
   */
  const loadProjects = async (params: any = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getProjects(params);
      setProjects(response.projects || []);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects';
      setError(errorMessage);
      console.error('Error loading projects:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Carrega estatísticas de projetos
   */
  const loadStats = async () => {
    try {
      const response = await apiService.getProjectsStats();
      setStats(response);
      return response;
    } catch (err) {
      console.error('Error loading project stats:', err);
      throw err;
    }
  };

  /**
   * Cria novo projeto
   */
  const createProject = async (data: Partial<Project>) => {
    try {
      const response = await apiService.createProject(data);
      
      // Criar notificação após sucesso
      try {
        await apiService.createNotification({
          type: 'project',
          title: 'Novo Projeto Criado',
          message: `${data.title} foi adicionado aos projetos`,
          payload: {
            projectId: response.project?.id,
            projectTitle: data.title,
            action: 'project_created'
          },
          link: '/projetos'
        });
      } catch (notifError) {
        console.warn('Falha ao criar notificação:', notifError);
      }
      
      await loadProjects(); // Reload list
      await loadStats(); // Reload stats
      return response;
    } catch (err) {
      console.error('Error creating project:', err);
      throw err;
    }
  };

  /**
   * Atualiza projeto existente
   */
  const updateProject = async (id: string, data: Partial<Project>) => {
    try {
      const response = await apiService.updateProject(id, data);
      await loadProjects(); // Reload list
      await loadStats(); // Reload stats
      return response;
    } catch (err) {
      console.error('Error updating project:', err);
      throw err;
    }
  };

  /**
   * Deleta projeto
   */
  const deleteProject = async (id: string) => {
    try {
      await apiService.deleteProject(id);
      await loadProjects(); // Reload list
      await loadStats(); // Reload stats
    } catch (err) {
      console.error('Error deleting project:', err);
      throw err;
    }
  };

  // Carrega projetos e stats ao montar o componente
  useEffect(() => {
    loadProjects();
    loadStats();
  }, []);

  return {
    projects,
    stats,
    isLoading,
    error,
    loadProjects,
    loadStats,
    createProject,
    updateProject,
    deleteProject,
  };
}
