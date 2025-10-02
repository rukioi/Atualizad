import { useState, useCallback } from 'react';
import { Project } from '@/types/projects';
import { apiService } from '@/services/apiService';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.get('/api/projects');
      if (response && response.data) {
        setProjects(response.data.projects || []);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects';
      setError(errorMessage);
      console.error('Error loading projects:', err);
      setProjects([]); // Clear projects on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = async (projectData: Partial<Project>) => {
    try {
      const response = await apiService.post('/api/projects', projectData);
      await loadProjects(); // Reload list
      return response.data.project;
    } catch (err) {
      console.error('Error creating project:', err);
      throw err;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const response = await apiService.put(`/api/projects/${id}`, updates);
      await loadProjects(); // Reload list
      return response.data.project;
    } catch (err) {
      console.error('Error updating project:', err);
      throw err;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await apiService.delete(`/api/projects/${id}`);
      await loadProjects(); // Reload list
    } catch (err) {
      console.error('Error deleting project:', err);
      throw err;
    }
  };

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