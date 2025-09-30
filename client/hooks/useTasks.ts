import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = async (params: any = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getTasks(params);
      setTasks(response.tasks);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createTask = async (data: any) => {
    try {
      const response = await apiService.createTask(data);
      await loadTasks(); // Reload list
      return response;
    } catch (err) {
      throw err;
    }
  };

  const updateTask = async (id: string, data: any) => {
    try {
      const response = await apiService.updateTask(id, data);
      await loadTasks(); // Reload list
      return response;
    } catch (err) {
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await apiService.deleteTask(id);
      await loadTasks(); // Reload list
    } catch (err) {
      throw err;
    }
  };

  const getTaskStats = async () => {
    try {
      return await apiService.getTaskStats();
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  return {
    tasks,
    isLoading,
    error,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    getTaskStats,
  };
}