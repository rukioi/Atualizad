import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async (params: any = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getProjects(params);
      setProjects(response.projects);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async (data: any) => {
    try {
      const response = await apiService.createProject(data);
      await loadProjects(); // Reload list
      return response;
    } catch (err) {
      throw err;
    }
  };

  const updateProject = async (id: string, data: any) => {
    try {
      const response = await apiService.updateProject(id, data);
      await loadProjects(); // Reload list
      return response;
    } catch (err) {
      throw err;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await apiService.deleteProject(id);
      await loadProjects(); // Reload list
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return {
    projects,
    isLoading,
    error,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}