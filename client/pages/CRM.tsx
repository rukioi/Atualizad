import React, { useState, useMemo } from "react";
import {
  createSafeOnOpenChange,
  createSafeDialogHandler,
} from "@/lib/dialog-fix";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Users,
  Plus,
  Search,
  Filter,
  Target,
  BarChart3,
  TrendingUp,
  Grid3X3,
  List,
  Edit2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientForm } from "@/components/CRM/ClientForm";
import { ClientsTable } from "@/components/CRM/ClientsTable";
import { Pipeline } from "@/components/CRM/Pipeline";
import { AdvancedFilters } from "@/components/CRM/AdvancedFilters";
import { DealForm } from "@/components/CRM/DealForm";
import { ClientViewDialog } from "@/components/CRM/ClientViewDialog";
import { DealViewDialog } from "@/components/CRM/DealViewDialog";
import { Client, Deal, PipelineStage, DealStage } from "@/types/crm";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { apiService } from "@/services/apiService";

// Helper function to map Deal (backend) to Deal (frontend)
const mapProjectToDeal = (deal: any): Deal => ({
  id: deal.id,
  title: deal.title,
  contactName: deal.contact_name || deal.contactName,
  organization: deal.organization,
  email: deal.email || "",
  mobile: deal.phone || deal.mobile || "",
  address: deal.address || "",
  budget: deal.budget || 0,
  currency: deal.currency || "BRL",
  stage: deal.stage as DealStage,
  tags: deal.tags || [],
  description: deal.description,
  createdAt: deal.created_at || deal.createdAt,
  updatedAt: deal.updated_at || deal.updatedAt,
});

// Helper function to map Deal (frontend) to Deal data (backend)
const mapDealToProjectData = (deal: Partial<Deal>) => ({
  title: deal.title,
  contactName: deal.contactName,
  organization: deal.organization,
  email: deal.email,
  mobile: deal.mobile,
  address: deal.address,
  budget: deal.budget,
  currency: deal.currency,
  stage: deal.stage,
  tags: deal.tags,
  description: deal.description,
});

interface PipelineListViewProps {
  deals: Deal[];
  stages: PipelineStage[];
  onEditDeal: (deal: Deal) => void;
  onDeleteDeal: (dealId: string) => void;
  onMoveDeal: (dealId: string, newStage: DealStage) => void;
  onViewDeal: (deal: Deal) => void;
}

function PipelineListView({
  deals,
  stages,
  onEditDeal,
  onDeleteDeal,
  onMoveDeal,
  onViewDeal,
}: PipelineListViewProps) {
  const getStageInfo = (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId);
    return stage || { name: stageId, color: "gray" };
  };

  const getStageColor = (color: string) => {
    const colors = {
      blue: "bg-blue-100 text-blue-800",
      yellow: "bg-yellow-100 text-yellow-800",
      purple: "bg-purple-100 text-purple-800",
      orange: "bg-orange-100 text-orange-800",
      green: "bg-green-100 text-green-800",
      red: "bg-red-100 text-red-800",
      gray: "bg-gray-100 text-gray-800",
    };
    return colors[color] || colors.gray;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-3">
      {deals.map((deal) => {
        const stageInfo = getStageInfo(deal.stage);
        return (
          <Card key={deal.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {deal.title.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">
                        {deal.title}
                      </h3>
                      <Badge className={getStageColor(stageInfo.color)}>
                        {stageInfo.name}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>{deal.contactName}</span>
                      <span>•</span>
                      <span>{formatCurrency(deal.budget)}</span>
                      <span>•</span>
                      <span>
                        Criado:{" "}
                        {new Date(deal.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDeal(deal)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditDeal(deal)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDeleteDeal(deal.id)}
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
        );
      })}

      {deals.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum deal encontrado no pipeline.
        </div>
      )}
    </div>
  );
}

export function CRM() {
  const [activeTab, setActiveTab] = useState("clients");
  const [showClientForm, setShowClientForm] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [showClientView, setShowClientView] = useState(false);
  const [showDealView, setShowDealView] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const [editingDeal, setEditingDeal] = useState<Deal | undefined>();
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [viewingDeal, setViewingDeal] = useState<Deal | null>(null);
  const [dealInitialStage, setDealInitialStage] = useState<
    DealStage | undefined
  >();
  const {
    clients,
    createClient,
    updateClient,
    deleteClient,
    isLoading: clientsLoading,
  } = useClients();
  const {
    projects,
    createProject,
    updateProject,
    deleteProject,
    isLoading: projectsLoading,
  } = useProjects();

  const [deals, setDeals] = useState<Deal[]>([]); // Estado local para deals

  // Helper function to load deals from the API
  const loadDeals = async () => {
    try {
      const response = await apiService.getDeals();
      
      // Backend retorna { deals: [...], pagination: {...} }
      if (response.deals) {
        setDeals(response.deals.map(mapProjectToDeal));
      } else if (Array.isArray(response)) {
        setDeals(response.map(mapProjectToDeal));
      }
    } catch (error) {
      console.error("Erro ao carregar negócios:", error);
      toast({
        title: "Erro ao carregar negócios",
        description: "Não foi possível carregar os negócios do pipeline.",
        variant: "destructive",
      });
    }
  };

  // Efeito para carregar os deals quando o componente monta
  useMemo(() => {
    loadDeals();
  }, []);

  // Map projects to deals for frontend display
  // const deals = useMemo(() => {
  //   return projects.map(mapProjectToDeal);
  // }, [projects]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dealSearchTerm, setDealSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [advancedFilters, setAdvancedFilters] = useState<any>(null);
  const [pipelineViewMode, setPipelineViewMode] = useState<"kanban" | "list">(
    "kanban",
  );
  const [editingStages, setEditingStages] = useState(false);
  const [tempStageNames, setTempStageNames] = useState<{
    [key: string]: string;
  }>({});

  // Create safe dialog handler
  const safeSetEditingStages = createSafeOnOpenChange((open: boolean) =>
    setEditingStages(open),
  );

  // Filter clients based on search, status, and advanced filters
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.organization?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || client.status === statusFilter;

      // Apply advanced filters if they exist
      if (advancedFilters) {
        if (
          advancedFilters.levels.length > 0 &&
          !advancedFilters.levels.includes(client.level || "")
        ) {
          return false;
        }
        if (advancedFilters.locations.length > 0) {
          const clientLocation = `${client.city} - ${client.state}`;
          if (!advancedFilters.locations.includes(clientLocation)) {
            return false;
          }
        }
        if (advancedFilters.hasOrganization) {
          if (
            advancedFilters.hasOrganization === "with_org" &&
            !client.organization
          ) {
            return false;
          }
          if (
            advancedFilters.hasOrganization === "without_org" &&
            client.organization
          ) {
            return false;
          }
        }
        if (advancedFilters.tags.length > 0) {
          const hasMatchingTag = advancedFilters.tags.some((tag: string) =>
            client.tags.some((clientTag) =>
              clientTag.toLowerCase().includes(tag.toLowerCase()),
            ),
          );
          if (!hasMatchingTag) {
            return false;
          }
        }
      }

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, statusFilter, advancedFilters]);

  // Filter deals based on search term
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const matchesSearch =
        deal.title.toLowerCase().includes(dealSearchTerm.toLowerCase()) ||
        deal.contactName.toLowerCase().includes(dealSearchTerm.toLowerCase()) ||
        deal.organization?.toLowerCase().includes(dealSearchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [deals, dealSearchTerm]);

  // Initial pipeline stages configuration
  // PIPELINE SIMPLIFICADO: Apenas 4 estágios conforme solicitado
  const [pipelineStagesConfig, setPipelineStagesConfig] = useState([
    { id: "contacted", name: "Em Contato", color: "blue" },
    { id: "proposal", name: "Com Proposta", color: "yellow" },
    { id: "won", name: "Cliente Bem Sucedido", color: "green" },
    { id: "lost", name: "Cliente Perdido", color: "red" },
  ]);

  // REMOVIDOS: opportunity, advanced, general conforme solicitação
  // IMPLEMENTAÇÃO FUTURA: Editar nomes dos stages também deve atualizar nos deals

  // Pipeline stages with deals
  const pipelineStages: PipelineStage[] = pipelineStagesConfig.map((stage) => ({
    ...stage,
    deals: filteredDeals.filter((deal) => deal.stage === stage.id),
  }));

  const handleSubmitClient = async (data: any) => {
    try {
      if (editingClient) {
        await updateClient(editingClient.id, data);
        setEditingClient(undefined);
      } else {
        await createClient(data);
      }
      setShowClientForm(false);
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      // Mostrar toast de erro aqui se necessário
    }
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClients((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId],
    );
  };

  const handleSelectAllClients = (checked: boolean) => {
    setSelectedClients(
      checked ? filteredClients.map((client) => client.id) : [],
    );
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowClientForm(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      await deleteClient(clientId);
      setSelectedClients(selectedClients.filter((id) => id !== clientId));
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
    }
  };

  const handleViewClient = (client: Client) => {
    setViewingClient(client);
    setShowClientView(true);
  };

  const handleEditFromView = (client: Client) => {
    setEditingClient(client);
    setShowClientView(false);
    setShowClientForm(true);
  };

  const handleAddDeal = (stage: DealStage) => {
    setDealInitialStage(stage);
    setEditingDeal(undefined);
    setShowDealForm(true);
  };

  const handleEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
    setDealInitialStage(undefined);
    setShowDealForm(true);
  };

  const handleViewDeal = (deal: Deal) => {
    setViewingDeal(deal);
    setShowDealView(true);
  };

  const handleEditFromDealView = (deal: Deal) => {
    setEditingDeal(deal);
    setShowDealView(false);
    setShowDealForm(true);
  };

  const handleDeleteDeal = async (dealId: string) => {
    try {
      await apiService.deleteDeal(dealId);
      setDeals((prevDeals) => prevDeals.filter((deal) => deal.id !== dealId)); // Atualiza estado local
    } catch (error) {
      console.error("Erro ao excluir negócio:", error);
      toast({
        title: "Erro ao excluir negócio",
        description: "Não foi possível excluir o negócio.",
        variant: "destructive",
      });
    }
  };

  // Handle moving a deal to a different stage (drag and drop)
  const handleMoveDeal = async (dealId: string, newStage: DealStage) => {
    try {
      console.log("Moving deal:", dealId, "to stage:", newStage);

      // Otimistic update - atualizar UI imediatamente
      setDeals((prevDeals) =>
        prevDeals.map((deal) =>
          deal.id === dealId ? { ...deal, stage: newStage } : deal,
        ),
      );

      // Fazer a requisição para o backend
      await apiService.updateDeal(dealId, { stage: newStage });

      toast({
        title: "Negócio movido com sucesso",
        description: `Negócio movido para "${newStage === "contacted" ? "Em Contato" : newStage === "proposal" ? "Com Proposta" : newStage === "won" ? "Cliente Bem Sucedido" : "Cliente Perdido"}"`,
      });
    } catch (error) {
      console.error("Erro ao mover negócio:", error);

      // Reverter mudança otimista em caso de erro
      await loadDeals();

      toast({
        title: "Erro ao mover negócio",
        description:
          "Não foi possível atualizar o estágio do negócio. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleApplyAdvancedFilters = (filters: any) => {
    setAdvancedFilters(filters);
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters(null);
  };

  const handleSubmitDeal = async (data: any) => {
    try {
      if (editingDeal) {
        await apiService.updateDeal(editingDeal.id, data);
        setEditingDeal(undefined);
      } else {
        await apiService.createDeal(data);
      }

      setShowDealForm(false);
      setDealInitialStage(undefined);
      await loadDeals(); // Recarrega deals após a submissão
    } catch (error) {
      console.error("Erro ao salvar negócio:", error);
      toast({
        title: "Erro ao salvar negócio",
        description: "Não foi possível salvar o negócio. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Calculate metrics
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "active").length;
  const totalRevenuePotential = deals.reduce(
    (sum, deal) => sum + deal.budget,
    0,
  );
  const wonDeals = deals.filter((d) => d.stage === "won").length;

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
              <BreadcrumbPage>CRM</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CRM</h1>
            <p className="text-muted-foreground">
              Gerenciamento de clientes e relacionamentos
            </p>
          </div>
          <Button onClick={() => setShowClientForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Cliente
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Clientes
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClients}</div>
              <p className="text-xs text-muted-foreground">
                {activeClients} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pipeline Total
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(totalRevenuePotential)}
              </div>
              <p className="text-xs text-muted-foreground">
                {deals.length} negócios ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Taxa de Conversão
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {deals.length > 0
                  ? Math.round((wonDeals / deals.length) * 100)
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                {wonDeals} negócios fechados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Receita Fechada
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(
                  deals
                    .filter((d) => d.stage === "won")
                    .reduce((sum, deal) => sum + deal.budget, 0),
                )}
              </div>
              <p className="text-xs text-muted-foreground">Este mês</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline de Vendas</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center space-x-4">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Procurar clientes..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(true)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Mais Filtros
                {advancedFilters && (
                  <Badge variant="secondary" className="ml-2">
                    Ativos
                  </Badge>
                )}
              </Button>
              {advancedFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAdvancedFilters}
                >
                  Limpar Filtros
                </Button>
              )}
            </div>

            {/* Clients Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Lista de Clientes ({filteredClients.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClientsTable
                  clients={filteredClients}
                  selectedClients={selectedClients}
                  onSelectClient={handleSelectClient}
                  onSelectAll={handleSelectAllClients}
                  onEditClient={handleEditClient}
                  onDeleteClient={handleDeleteClient}
                  onViewClient={handleViewClient}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Pipeline de Vendas
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {/* View Mode Toggle */}
                    <div className="flex border rounded-lg p-1">
                      <Button
                        variant={
                          pipelineViewMode === "kanban" ? "default" : "ghost"
                        }
                        size="sm"
                        onClick={() => setPipelineViewMode("kanban")}
                      >
                        <Grid3X3 className="h-4 w-4 mr-1" />
                        Kanban
                      </Button>
                      <Button
                        variant={
                          pipelineViewMode === "list" ? "default" : "ghost"
                        }
                        size="sm"
                        onClick={() => setPipelineViewMode("list")}
                      >
                        <List className="h-4 w-4 mr-1" />
                        Lista
                      </Button>
                    </div>

                    {/* Edit Stages Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingStages(true);
                        const initialNames = {};
                        pipelineStagesConfig.forEach((stage) => {
                          initialNames[stage.id] = stage.name;
                        });
                        setTempStageNames(initialNames);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Editar Nomes
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search filter for deals */}
                <div className="mb-4">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Procurar por título do negócio..."
                      className="pl-10"
                      value={dealSearchTerm}
                      onChange={(e) => setDealSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                {pipelineViewMode === "kanban" ? (
                  <Pipeline
                    stages={pipelineStages}
                    onAddDeal={handleAddDeal}
                    onEditDeal={handleEditDeal}
                    onDeleteDeal={handleDeleteDeal}
                    onMoveDeal={handleMoveDeal}
                    onViewDeal={handleViewDeal}
                  />
                ) : (
                  <PipelineListView
                    deals={filteredDeals}
                    stages={pipelineStages}
                    onEditDeal={handleEditDeal}
                    onDeleteDeal={handleDeleteDeal}
                    onMoveDeal={handleMoveDeal}
                    onViewDeal={handleViewDeal}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Client Form Modal */}
        <ClientForm
          open={showClientForm}
          onOpenChange={setShowClientForm}
          client={editingClient}
          onSubmit={handleSubmitClient}
          isEditing={!!editingClient}
          existingTags={
            /* Extrair todas as tags únicas dos clientes existentes */
            Array.from(
              new Set(clients.flatMap((client) => client.tags || [])),
            ).sort()
          }
        />

        {/* Advanced Filters Dialog */}
        <AdvancedFilters
          open={showAdvancedFilters}
          onOpenChange={setShowAdvancedFilters}
          onApplyFilters={handleApplyAdvancedFilters}
          existingTags={
            /* IMPLEMENTAÇÃO MELHORADA: Extrair todas as tags únicas dos clientes existentes */
            Array.from(
              new Set(clients.flatMap((client) => client.tags || [])),
            ).sort()
          }
        />

        {/* Deal Form Modal */}
        <DealForm
          open={showDealForm}
          onOpenChange={setShowDealForm}
          deal={editingDeal}
          initialStage={dealInitialStage}
          onSubmit={handleSubmitDeal}
          isEditing={!!editingDeal}
        />

        {/* Client View Dialog */}
        <ClientViewDialog
          open={showClientView}
          onOpenChange={setShowClientView}
          client={viewingClient}
          onEdit={handleEditFromView}
        />

        {/* Deal View Dialog */}
        <DealViewDialog
          open={showDealView}
          onOpenChange={setShowDealView}
          deal={viewingDeal}
          onEdit={handleEditFromDealView}
        />

        {/* Stage Names Editing Dialog */}
        <Dialog open={editingStages} onOpenChange={safeSetEditingStages}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Nomes dos Stages</DialogTitle>
              <DialogDescription>
                Personalize os nomes dos stages do pipeline de vendas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {pipelineStagesConfig.map((stage) => (
                <div key={stage.id}>
                  <label className="text-sm font-medium">
                    {stage.name} (Atual)
                  </label>
                  <Input
                    value={tempStageNames[stage.id] || stage.name}
                    onChange={(e) =>
                      setTempStageNames({
                        ...tempStageNames,
                        [stage.id]: e.target.value,
                      })
                    }
                    placeholder={stage.name}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={createSafeDialogHandler(() => {
                  safeSetEditingStages(false);
                  setTempStageNames({});
                })}
              >
                Cancelar
              </Button>
              <Button
                onClick={createSafeDialogHandler(() => {
                  console.log("Salvando stages:", tempStageNames);
                  setPipelineStagesConfig((prev) => {
                    const newConfig = prev.map((stage) => ({
                      ...stage,
                      name: tempStageNames[stage.id] || stage.name,
                    }));
                    console.log("Nova configuração:", newConfig);
                    return newConfig;
                  });
                  safeSetEditingStages(false);
                  setTempStageNames({});
                  alert("Nomes dos stages atualizados com sucesso!");
                })}
              >
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}