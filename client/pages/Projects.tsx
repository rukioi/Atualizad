import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  BarChart3,
  Clock,
  TrendingUp,
  AlertTriangle,
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
import { ProjectForm } from '@/components/Projects/ProjectForm';
import { ProjectKanban } from '@/components/Projects/ProjectKanban';
import { ProjectViewDialog } from '@/components/Projects/ProjectViewDialog';
import { Project as ProjectType, useProjects } from '@/hooks/useProjects';
import { ProjectStage, ProjectStatus } from '@/types/projects';
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
import { toast } from '@/components/ui/use-toast';

// Helper para mapear Project do hook para tipos do frontend
interface Project extends ProjectType {
  attachments?: any[];
}

interface ProjectCompactViewProps {
  projects: Project[];
  onEditProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onViewProject: (project: Project) => void;
}

function ProjectCompactView({
  projects,
  onEditProject,
  onDeleteProject,
  onViewProject
}: ProjectCompactViewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'contacted':
        return 'bg-blue-100 text-blue-800';
      case 'proposal':
        return 'bg-yellow-100 text-yellow-800';
      case 'won':
        return 'bg-green-100 text-green-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'contacted':
        return 'Em Contato';
      case 'proposal':
        return 'Com Proposta';
      case 'won':
        return 'Concluído';
      case 'lost':
        return 'Perdido';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Card key={project.id} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{project.title}</h3>
                <p className="text-sm text-muted-foreground">{project.clientName}</p>
              </div>
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewProject(project)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditProject(project)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDeleteProject(project.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Orçamento:</span>
                <span className="font-medium">{formatCurrency(project.budget || 0)}</span>
              </div>

              <div className="flex items-center justify-between">
                <Badge className={getStatusColor(project.status)}>
                  {getStatusLabel(project.status)}
                </Badge>
                <Badge className={getPriorityColor(project.priority)}>
                  {project.priority === 'high' ? 'Alta' : project.priority === 'medium' ? 'Média' : 'Baixa'}
                </Badge>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2" />
              </div>

              {project.dueDate && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  Vencimento: {new Date(project.dueDate).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {projects.length === 0 && (
        <div className="col-span-3 text-center py-8 text-muted-foreground">
          Nenhum projeto encontrado com os filtros aplicados.
        </div>
      )}
    </div>
  );
}

export function Projects() {
  const { projects, stats, isLoading, createProject, updateProject, deleteProject } = useProjects();
  
  const [activeTab, setActiveTab] = useState('kanban');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showProjectView, setShowProjectView] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'compact'>('kanban');

  // Filter projects based on search, status, and priority
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch = project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [projects, searchTerm, statusFilter, priorityFilter]);

  // Project stages for Kanban view
  const projectStages: ProjectStage[] = [
    {
      id: 'contacted',
      name: 'Em Contato',
      color: 'blue',
      projects: filteredProjects.filter(project => project.status === 'contacted'),
    },
    {
      id: 'proposal',
      name: 'Com Proposta',
      color: 'yellow',
      projects: filteredProjects.filter(project => project.status === 'proposal'),
    },
    {
      id: 'won',
      name: 'Concluído',
      color: 'green',
      projects: filteredProjects.filter(project => project.status === 'won'),
    },
    {
      id: 'lost',
      name: 'Perdido',
      color: 'red',
      projects: filteredProjects.filter(project => project.status === 'lost'),
    },
  ];

  const handleSubmitProject = async (data: any) => {
    try {
      if (editingProject) {
        await updateProject(editingProject.id, data);
        toast({
          title: 'Projeto atualizado',
          description: 'O projeto foi atualizado com sucesso.',
        });
      } else {
        await createProject(data);
        toast({
          title: 'Projeto criado',
          description: 'O novo projeto foi criado com sucesso.',
        });
      }
      setShowProjectForm(false);
      setEditingProject(undefined);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar projeto',
        variant: 'destructive',
      });
    }
  };

  const handleAddProject = (status: ProjectStatus) => {
    setEditingProject(undefined);
    setShowProjectForm(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setShowProjectForm(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este projeto?')) {
      try {
        await deleteProject(projectId);
        toast({
          title: 'Projeto excluído',
          description: 'O projeto foi excluído com sucesso.',
        });
      } catch (error) {
        toast({
          title: 'Erro',
          description: error instanceof Error ? error.message : 'Erro ao excluir projeto',
          variant: 'destructive',
        });
      }
    }
  };

  const handleMoveProject = async (projectId: string, newStatus: ProjectStatus) => {
    try {
      await updateProject(projectId, { status: newStatus });
      toast({
        title: 'Status atualizado',
        description: 'O status do projeto foi atualizado com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar status',
        variant: 'destructive',
      });
    }
  };

  const handleViewProject = (project: Project) => {
    setViewingProject(project);
    setShowProjectView(true);
  };

  const handleEditFromView = (project: Project) => {
    setEditingProject(project);
    setShowProjectView(false);
    setShowProjectForm(true);
  };

  // Use stats from backend
  const totalProjects = stats?.total || 0;
  const avgProgress = stats?.avgProgress || 0;
  const overdueProjects = stats?.overdue || 0;
  const totalRevenue = stats?.revenue || 0;
  const activeProjects = (stats?.byStatus.contacted || 0) + (stats?.byStatus.proposal || 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Projetos</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
            <p className="text-muted-foreground">
              Gerenciamento de projetos jurídicos com sistema Kanban
            </p>
          </div>
          <div className="flex space-x-2">
            <div className="flex border rounded-lg p-1">
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                Kanban
              </Button>
              <Button
                variant={viewMode === 'compact' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('compact')}
              >
                <List className="h-4 w-4 mr-1" />
                Lista
              </Button>
            </div>
            <Button onClick={() => handleAddProject('contacted')}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          </div>
        </div>

        {/* Metrics Cards - Usando stats reais do backend */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                {activeProjects} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progresso Médio</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgProgress}%</div>
              <p className="text-xs text-muted-foreground">
                Projetos ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projetos Vencidos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overdueProjects}</div>
              <p className="text-xs text-muted-foreground">
                Necessitam atenção
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Realizada</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Projetos concluídos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar projetos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="contacted">Em Contato</SelectItem>
              <SelectItem value="proposal">Com Proposta</SelectItem>
              <SelectItem value="won">Concluído</SelectItem>
              <SelectItem value="lost">Perdido</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Prioridades</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-8">Carregando projetos...</div>
        ) : viewMode === 'kanban' ? (
          <ProjectKanban
            stages={projectStages}
            onAddProject={handleAddProject}
            onEditProject={handleEditProject}
            onDeleteProject={handleDeleteProject}
            onMoveProject={handleMoveProject}
            onViewProject={handleViewProject}
          />
        ) : (
          <ProjectCompactView
            projects={filteredProjects}
            onEditProject={handleEditProject}
            onDeleteProject={handleDeleteProject}
            onViewProject={handleViewProject}
          />
        )}

        {/* Project Form Dialog */}
        <ProjectForm
          open={showProjectForm}
          onOpenChange={setShowProjectForm}
          onSubmit={handleSubmitProject}
          initialData={editingProject}
        />

        {/* Project View Dialog */}
        {viewingProject && (
          <ProjectViewDialog
            open={showProjectView}
            onOpenChange={setShowProjectView}
            project={viewingProject}
            onEdit={handleEditFromView}
            onDelete={handleDeleteProject}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
