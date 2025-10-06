import React, { useState, useMemo, useEffect } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Clock,
  TrendingUp,
  AlertTriangle,
  Timer,
  Grid3X3,
  List
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskForm } from '@/components/Tasks/TaskForm';
import { TaskBoard } from '@/components/Tasks/TaskBoard';
import { TaskViewDialog } from '@/components/Tasks/TaskViewDialog';
import { Task, TaskBoard as TaskBoardType, TaskStatus, TaskPriority, TaskStats } from '@/types/tasks';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface TasksListViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onViewTask: (task: Task) => void;
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
}

function TasksListView({
  tasks,
  onEditTask,
  onDeleteTask,
  onViewTask,
  onMoveTask
}: TasksListViewProps) {
  const getStatusColor = (status: TaskStatus) => {
    const colors = {
      not_started: 'bg-red-100 text-red-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      on_hold: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.not_started;
  };

  const getStatusLabel = (status: TaskStatus) => {
    const labels = {
      not_started: '🔴 Não Feito',
      in_progress: '🟡 Em Progresso',
      completed: '🟢 Feito',
      on_hold: '⏸️ Pausado',
      cancelled: '❌ Cancelado'
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority: TaskPriority) => {
    const colors = {
      low: 'text-gray-600',
      medium: 'text-blue-600',
      high: 'text-orange-600',
      urgent: 'text-red-600'
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Card key={task.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{task.title.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">{task.title}</h3>
                    <Badge className={getStatusColor(task.status)}>
                      {getStatusLabel(task.status)}
                    </Badge>
                    <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>{task.assignedTo}</span>
                    {task.endDate && (
                      <>
                        <span>•</span>
                        <span>Vence: {new Date(task.endDate).toLocaleDateString('pt-BR')}</span>
                      </>
                    )}
                    {task.clientName && (
                      <>
                        <span>•</span>
                        <span>{task.clientName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-medium">{task.progress || 0}%</div>
                  <Progress value={task.progress || 0} className="w-20 h-2" />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewTask(task)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditTask(task)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDeleteTask(task.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {tasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma tarefa encontrada com os filtros aplicados.
        </div>
      )}
    </div>
  );
}

export function Tasks() {
  const { tasks, isLoading, loadTasks, createTask, updateTask, deleteTask } = useTasks();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTaskView, setShowTaskView] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Filter tasks based on search, status, priority, and assignee
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (task.clientName?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesAssignee = assigneeFilter === 'all' || task.assignedTo === assigneeFilter;
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter, assigneeFilter]);

  // Task boards with filtered tasks
  const taskBoards: TaskBoardType[] = [
    {
      id: 'not_started',
      name: '🔴 Não Feito',
      color: 'red',
      tasks: filteredTasks.filter(task => task.status === 'not_started'),
    },
    {
      id: 'in_progress',
      name: '🟡 Em Progresso',
      color: 'yellow',
      tasks: filteredTasks.filter(task => task.status === 'in_progress'),
    },
    {
      id: 'completed',
      name: '🟢 Feito',
      color: 'green',
      tasks: filteredTasks.filter(task => task.status === 'completed'),
    },
    {
      id: 'on_hold',
      name: '⏸️ Pausado',
      color: 'gray',
      tasks: filteredTasks.filter(task => task.status === 'on_hold'),
    },
    {
      id: 'cancelled',
      name: '❌ Cancelado',
      color: 'red',
      tasks: filteredTasks.filter(task => task.status === 'cancelled'),
    },
  ];

  const handleSubmitTask = async (data: any) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, data);
        toast.success('Tarefa atualizada com sucesso!');
        setEditingTask(undefined);
      } else {
        await createTask(data);
        toast.success('Tarefa criada com sucesso!');
      }
      setShowTaskForm(false);
    } catch (error) {
      toast.error(editingTask ? 'Erro ao atualizar tarefa' : 'Erro ao criar tarefa');
      console.error('Error submitting task:', error);
    }
  };

  const handleAddTask = (status: TaskStatus) => {
    setEditingTask(undefined);
    setShowTaskForm(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success('Tarefa excluída com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir tarefa');
      console.error('Error deleting task:', error);
    }
  };

  const handleMoveTask = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateTask(taskId, { status: newStatus });
      toast.success('Status da tarefa atualizado!');
    } catch (error) {
      toast.error('Erro ao mover tarefa');
      console.error('Error moving task:', error);
    }
  };

  const handleViewTask = (task: Task) => {
    setViewingTask(task);
    setShowTaskView(true);
  };

  const handleEditFromView = (task: Task) => {
    setEditingTask(task);
    setShowTaskView(false);
    setShowTaskForm(true);
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = task.subtasks.map(subtask =>
      subtask.id === subtaskId
        ? {
            ...subtask,
            completed: !subtask.completed,
            completedAt: !subtask.completed ? new Date().toISOString() : undefined
          }
        : subtask
    );

    try {
      await updateTask(taskId, { subtasks: updatedSubtasks });
    } catch (error) {
      toast.error('Erro ao atualizar subtarefa');
      console.error('Error toggling subtask:', error);
    }
  };

  // Get unique assignees for filter
  const uniqueAssignees = Array.from(new Set(tasks.map(task => task.assignedTo)));

  // Calculate stats
  const taskStats: TaskStats = {
    total: filteredTasks.length,
    notStarted: filteredTasks.filter(t => t.status === 'not_started').length,
    inProgress: filteredTasks.filter(t => t.status === 'in_progress').length,
    completed: filteredTasks.filter(t => t.status === 'completed').length,
    onHold: filteredTasks.filter(t => t.status === 'on_hold').length,
    urgent: filteredTasks.filter(t => t.priority === 'urgent').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Tarefas</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
            <p className="text-muted-foreground">
              Gerencie e acompanhe todas as tarefas e subtarefas do escritório
            </p>
          </div>
          <Button onClick={() => handleAddTask('not_started')}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.total}</div>
              <p className="text-xs text-muted-foreground">Todas as tarefas ativas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Progresso</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.inProgress}</div>
              <p className="text-xs text-muted-foreground">Tarefas em andamento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.completed}</div>
              <p className="text-xs text-muted-foreground">Tarefas finalizadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgentes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.urgent}</div>
              <p className="text-xs text-muted-foreground">Requerem atenção imediata</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar tarefas..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="not_started">Não Feito</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="completed">Feito</SelectItem>
                  <SelectItem value="on_hold">Pausado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Prioridades</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>

              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Responsáveis</SelectItem>
                  {uniqueAssignees.map(assignee => (
                    <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('kanban')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks View */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground">Carregando tarefas...</div>
          </div>
        ) : viewMode === 'kanban' ? (
          <TaskBoard
            boards={taskBoards}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onViewTask={handleViewTask}
            onMoveTask={handleMoveTask}
            onToggleSubtask={handleToggleSubtask}
          />
        ) : (
          <TasksListView
            tasks={filteredTasks}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onViewTask={handleViewTask}
            onMoveTask={handleMoveTask}
          />
        )}

        {/* Task Form Dialog */}
        <TaskForm
          open={showTaskForm}
          onOpenChange={setShowTaskForm}
          task={editingTask}
          onSubmit={handleSubmitTask}
        />

        {/* Task View Dialog */}
        {viewingTask && (
          <TaskViewDialog
            open={showTaskView}
            onOpenChange={setShowTaskView}
            task={viewingTask}
            onEdit={handleEditFromView}
            onDelete={handleDeleteTask}
            onToggleSubtask={handleToggleSubtask}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
