/**
 * PÁGINA PRINCIPAL - PAINEL DE PUBLICAÇÕES
 * =======================================
 *
 * Página principal do módulo de Publicações com navegação por abas.
 * Inclui duas seções: Publicações e Consultar Cliente/Processos.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Newspaper,
  Search,
  Filter,
  Eye,
  Plus,
  FileSearch,
  Calendar,
  Building2,
  Scale,
} from "lucide-react";
import { Publication, PublicationStatus } from "@/types/publications";
import { ProcessViewDialog } from "@/components/Publications/ProcessViewDialog";

/**
 * DADOS MOCK - SERÃO SUBSTITUÍDOS POR API
 * ======================================
 *
 * IMPORTANTE PARA O BACKEND:
 *
 * ENDPOINT NECESSÁRIO: GET /api/publicacoes/carregar
 * - Busca novas publicações dos diários oficiais
 * - Retorna: Data Publicação, Processo, Diário, Vara/Comarca, Nome Pesquisado
 * - Todas as novas publicações devem vir com status: 'nova'
 * - Implementar filtros por data, comarca, etc.
 *
 * ENDPOINT: PATCH /api/publicacoes/{id}/status
 * - Atualiza status da publicação
 * - Usado para mudança automática NOVA -> PENDENTE ao visualizar
 */
const mockPublications: Publication[] = [
  {
    id: "1",
    dataPublicacao: new Date("2024-01-15"),
    processo: "1001234-56.2024.8.26.0100",
    diario: "Diário de Justiça Eletrônico",
    varaComarca: "1ª Vara Cível - São Paulo/SP",
    nomePesquisado: "João Silva Santos",
    status: "nova", // Status inicial de publicações da API
    conteudo: "Intimação para audiência de conciliação...",
    urgencia: "alta",
  },
  {
    id: "2",
    dataPublicacao: new Date("2024-01-14"),
    processo: "2001234-56.2024.8.26.0200",
    diario: "Diário Oficial do Estado",
    varaComarca: "2ª Vara Criminal - Rio de Janeiro/RJ",
    nomePesquisado: "Maria Oliveira Costa",
    status: "pendente", // Já foi visualizada
    conteudo: "Sentença publicada nos autos...",
    urgencia: "media",
  },
  {
    id: "3",
    dataPublicacao: new Date("2024-01-13"),
    processo: "3001234-56.2024.8.26.0300",
    diario: "Diário de Justiça Eletrônico",
    varaComarca: "Vara de Família - Brasília/DF",
    nomePesquisado: "Carlos Eduardo Lima",
    status: "descartada",
    conteudo: "Publicação não relacionada ao caso...",
    urgencia: "baixa",
  },
  {
    id: "4",
    dataPublicacao: new Date("2024-01-12"),
    processo: "4001234-56.2024.8.26.0400",
    diario: "Diário de Justiça Eletrônico",
    varaComarca: "3ª Vara Trabalhista - São Paulo/SP",
    nomePesquisado: "Ana Paula Silva",
    status: "atribuida",
    conteudo: "Despacho do juiz...",
    responsavel: "Dr. Silva",
    urgencia: "alta",
    atribuidoPara: {
      id: "1",
      nome: "Dr. Silva",
      email: "silva@escritorio.com",
      cargo: "Gerente",
      ativo: true,
    },
  },
];

const getStatusBadge = (status: PublicationStatus) => {
  const statusConfig = {
    nova: {
      label: "Nova",
      variant: "default" as const,
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    },
    pendente: {
      label: "Pendente",
      variant: "secondary" as const,
      color:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    },
    atribuida: {
      label: "Atribuída",
      variant: "outline" as const,
      color:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    },
    finalizada: {
      label: "Finalizada",
      variant: "outline" as const,
      color:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    },
    descartada: {
      label: "Descartada",
      variant: "destructive" as const,
      color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    },
  };

  return statusConfig[status];
};

const getUrgencyColor = (urgencia?: string) => {
  switch (urgencia) {
    case "alta":
      return "text-red-600";
    case "media":
      return "text-yellow-600";
    case "baixa":
      return "text-green-600";
    default:
      return "text-gray-600";
  }
};

export function Publications() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Estados para consulta de projetos
  const [oabNumber, setOabNumber] = useState("");
  const [oabState, setOabState] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [viewingProcess, setViewingProcess] = useState<any>(null);

  const handleViewPublication = (publication: Publication) => {
    // BACKEND: Implementar mudança automática de status NOVA -> PENDENTE
    if (publication.status === "nova") {
      // Fazer PATCH /api/publicacoes/{id}/status para mudar para 'pendente'
      console.log(
        `Mudando status da publicação ${publication.id} de NOVA para PENDENTE`,
      );
    }
    navigate(`/publicacoes/${publication.id}`);
  };

  const handleLoadPublications = async () => {
    setIsLoading(true);
    try {
      // BACKEND: Implementar chamada para API
      // const response = await fetch('/api/publicacoes/carregar');
      // const newPublications = await response.json();

      console.log("Carregando novas publicações da API...");

      // Simular carregamento
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // TODO: Atualizar estado com novas publicações
      console.log("Publicações carregadas com sucesso!");
    } catch (error) {
      console.error("Erro ao carregar publicações:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate5DayTask = () => {
    try {
      // Calcular data 5 dias a partir de hoje
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 5);

      // Criar objeto da tarefa
      const newTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: "Tarefa com prazo de 5 dias",
        description: "Tarefa criada automaticamente com prazo final de 5 dias",
        dueDate: futureDate,
        priority: "media",
        status: "pendente",
        createdAt: new Date(),
        createdBy: "Sistema",
        category: "geral",
        estimatedHours: 2,
      };

      // BACKEND: Implementar criação da tarefa
      // await fetch('/api/tarefas', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newTask)
      // });

      console.log("Nova tarefa criada:", newTask);

      // Mostrar confirmação para o usuário
      alert(
        `✅ Tarefa criada com sucesso!\n\n📋 Título: ${newTask.title}\n📅 Prazo: ${futureDate.toLocaleDateString("pt-BR")}\n⏰ Data limite: ${futureDate.toLocaleDateString("pt-BR")} às 23:59\n\n🔄 A tarefa foi adicionada ao módulo de Tarefas automaticamente`,
      );

      // FUTURO: Navegar para o módulo de tarefas
      // navigate('/tarefas');
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      alert("❌ Erro ao criar tarefa com prazo de 5 dias. Tente novamente.");
    }
  };

  const filteredPublications = mockPublications.filter((pub) => {
    const matchesSearch =
      pub.processo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.nomePesquisado.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.varaComarca.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || pub.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Dados mock de projetos para consulta
  const mockProjectResults = [
    {
      id: "1",
      numero: "PROJ-2025-001",
      cliente: "LUAN SANTOS MELO",
      vara: "1ª Vara Cível - São Paulo/SP",
      status: "Em Andamento",
      ultimaMovimentacao: "Análise documental em progresso",
      dataUltimaMovimentacao: new Date("2025-01-21"),
      advogado: "123456/SP",
      tipo: "Ação Trabalhista",
      valor: "R$ 45.000,00",
    },
    {
      id: "2",
      numero: "PROJ-2025-002",
      cliente: "LUIZ ANSELMO",
      vara: "2ª Vara Trabalhista - São Paulo/SP",
      status: "Aguardando Documentos",
      ultimaMovimentacao: "Solicitação de documentos complementares",
      dataUltimaMovimentacao: new Date("2025-01-20"),
      advogado: "123456/SP",
      tipo: "Revisão Contratual",
      valor: "R$ 28.500,00",
    },
  ];

  // Dados mock de projetos arquivados
  const mockArchivedProjects = [
    {
      id: "arch1",
      numero: "PROJ-2024-089",
      cliente: "EDSON DE ANDRADE CARVALHO",
      vara: "3ª Vara Cível - Rio de Janeiro/RJ",
      status: "Finalizado",
      ultimaMovimentacao: "Projeto concluído com sucesso",
      dataUltimaMovimentacao: new Date("2024-12-15"),
      advogado: "123456/SP",
      tipo: "Consultoria Empresarial",
      valor: "R$ 65.000,00",
      dataArquivamento: new Date("2024-12-20"),
    },
    {
      id: "arch2",
      numero: "PROJ-2024-067",
      cliente: "LIZIANO LEITE DE AZEVEDO",
      vara: "Vara de Família - Brasília/DF",
      status: "Finalizado",
      ultimaMovimentacao: "Acordo homologado",
      dataUltimaMovimentacao: new Date("2024-11-28"),
      advogado: "123456/SP",
      tipo: "Mediação Familiar",
      valor: "R$ 18.000,00",
      dataArquivamento: new Date("2024-12-05"),
    },
  ];

  const handleSearchProcesses = async () => {
    if (!oabNumber.trim() || !oabState.trim()) {
      alert("Por favor, preencha o número da OAB e o estado");
      return;
    }

    setIsSearching(true);
    setHasSearched(false);

    try {
      // BACKEND: Implementar consulta real
      // const response = await fetch(`/api/processos/consultar?oab=${oabNumber}&estado=${oabState}`);
      // const processes = await response.json();

      // Simular tempo de consulta
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Filtrar projetos mock baseado na OAB (simulação)
      const searchQuery = `${oabNumber}/${oabState}`;
      const filteredResults = mockProjectResults.filter(
        (project) => project.advogado === searchQuery,
      );

      setSearchResults(filteredResults);
      setHasSearched(true);

      console.log(
        `Consulta realizada para OAB: ${searchQuery}`,
        filteredResults,
      );
    } catch (error) {
      console.error("Erro ao consultar processos:", error);
      alert("Erro ao consultar processos. Tente novamente.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewProcessDetails = (process: any) => {
    setViewingProcess(process);
    setShowProcessDialog(true);
  };

  const handleOpenProcessExternal = (process: any) => {
    // Abrir processo em sistema externo (PJe, etc.)
    console.log("Abrindo processo em sistema externo:", process);
    alert(`Abrindo processo ${process.numero} no sistema do tribunal`);
  };

  const handleArchiveProcess = (project: any) => {
    if (
      confirm(
        `Deseja arquivar o projeto ${project.numero}?\n\nO projeto será movido para a seção de projetos arquivados.`,
      )
    ) {
      // Aqui você implementaria a lógica para arquivar o projeto
      // BACKEND: POST /api/projetos/{id}/arquivar
      console.log("Arquivando projeto:", project);

      // Adicionar à lista de arquivados
      const archivedProject = {
        ...project,
        dataArquivamento: new Date(),
        status: "Arquivado",
      };
      setArchivedProjects((prev) => [archivedProject, ...prev]);

      // Remover da lista ativa
      setSearchResults((prev) => prev.filter((p) => p.id !== project.id));

      alert(
        `✅ Projeto ${project.numero} arquivado com sucesso!\n\nO projeto foi movido para a seção de arquivados.`,
      );
    }
  };

  const handleRestoreProject = (project: any) => {
    if (
      confirm(
        `Deseja restaurar o projeto ${project.numero}?\n\nO projeto será movido de volta para a seção ativa.`,
      )
    ) {
      // Restaurar projeto
      const restoredProject = {
        ...project,
        status: "Em Andamento",
      };
      delete restoredProject.dataArquivamento;

      setSearchResults((prev) => [restoredProject, ...prev]);
      setArchivedProjects((prev) => prev.filter((p) => p.id !== project.id));

      alert(`✅ Projeto ${project.numero} restaurado com sucesso!`);
    }
  };

  const getProcessStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Em Andamento": "bg-blue-100 text-blue-800 border-blue-200",
      "Aguardando Documentos":
        "bg-yellow-100 text-yellow-800 border-yellow-200",
      Finalizado: "bg-green-100 text-green-800 border-green-200",
      Arquivado: "bg-gray-100 text-gray-800 border-gray-200",
      Suspenso: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Carregar projetos arquivados na inicialização
  React.useEffect(() => {
    setArchivedProjects(mockArchivedProjects);
  }, []);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Newspaper className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Painel de Publicações</h1>
          </div>
        </div>

        <Tabs defaultValue="publicacoes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger
              value="publicacoes"
              className="flex items-center space-x-2"
            >
              <Newspaper className="h-4 w-4" />
              <span>Publicações</span>
            </TabsTrigger>
            <TabsTrigger
              value="consultar"
              className="flex items-center space-x-2"
            >
              <FileSearch className="h-4 w-4" />
              <span>Consultar Cliente/Projetos</span>
            </TabsTrigger>
            <TabsTrigger
              value="arquivados"
              className="flex items-center space-x-2"
            >
              <Building2 className="h-4 w-4" />
              <span>Arquivados</span>
            </TabsTrigger>
          </TabsList>

          {/* ABA PUBLICAÇÕES */}
          <TabsContent value="publicacoes" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Newspaper className="h-5 w-5" />
                    <span>Lista de Publicações</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filtros
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleLoadPublications}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Carregando...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Carregar
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCreate5DayTask}
                      className="bg-green-50 hover:bg-green-100 border-green-200"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Prazo 5 Dias
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por processo, nome ou comarca..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Status</SelectItem>
                      <SelectItem value="nova">Nova</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="atribuida">Atribuída</SelectItem>
                      <SelectItem value="finalizada">Finalizada</SelectItem>
                      <SelectItem value="descartada">Descartada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data Publicação</TableHead>
                        <TableHead>Processo</TableHead>
                        <TableHead>Diário</TableHead>
                        <TableHead>Vara/Comarca</TableHead>
                        <TableHead>Nome Pesquisado</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Urgência</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPublications.map((publication) => {
                        const statusConfig = getStatusBadge(publication.status);
                        return (
                          <TableRow
                            key={publication.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleViewPublication(publication)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {publication.dataPublicacao.toLocaleDateString(
                                    "pt-BR",
                                  )}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {publication.processo}
                            </TableCell>
                            <TableCell>{publication.diario}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {publication.varaComarca}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {publication.nomePesquisado}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`${statusConfig.color} px-2 py-1 text-xs font-medium`}
                              >
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`text-xs font-medium ${getUrgencyColor(publication.urgencia)}`}
                              >
                                {publication.urgencia?.toUpperCase()}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewPublication(publication);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA CONSULTAR CLIENTE/PROJETOS */}
          <TabsContent value="consultar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileSearch className="h-5 w-5" />
                  <span>Consultar Cliente/Projetos</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Digite o número da OAB do advogado para consultar os projetos
                  atribuídos
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Formulário de Consulta */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Número da OAB
                      </label>
                      <Input
                        placeholder="Ex: 123456/SP"
                        value={oabNumber}
                        onChange={(e) => setOabNumber(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Estado</label>
                      <Select value={oabState} onValueChange={setOabState}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AC">Acre (AC)</SelectItem>
                          <SelectItem value="AL">Alagoas (AL)</SelectItem>
                          <SelectItem value="AP">Amapá (AP)</SelectItem>
                          <SelectItem value="AM">Amazonas (AM)</SelectItem>
                          <SelectItem value="BA">Bahia (BA)</SelectItem>
                          <SelectItem value="CE">Ceará (CE)</SelectItem>
                          <SelectItem value="DF">
                            Distrito Federal (DF)
                          </SelectItem>
                          <SelectItem value="ES">
                            Espírito Santo (ES)
                          </SelectItem>
                          <SelectItem value="GO">Goiás (GO)</SelectItem>
                          <SelectItem value="MA">Maranhão (MA)</SelectItem>
                          <SelectItem value="MT">Mato Grosso (MT)</SelectItem>
                          <SelectItem value="MS">
                            Mato Grosso do Sul (MS)
                          </SelectItem>
                          <SelectItem value="MG">Minas Gerais (MG)</SelectItem>
                          <SelectItem value="PA">Pará (PA)</SelectItem>
                          <SelectItem value="PB">Paraíba (PB)</SelectItem>
                          <SelectItem value="PR">Paraná (PR)</SelectItem>
                          <SelectItem value="PE">Pernambuco (PE)</SelectItem>
                          <SelectItem value="PI">Piauí (PI)</SelectItem>
                          <SelectItem value="RJ">
                            Rio de Janeiro (RJ)
                          </SelectItem>
                          <SelectItem value="RN">
                            Rio Grande do Norte (RN)
                          </SelectItem>
                          <SelectItem value="RS">
                            Rio Grande do Sul (RS)
                          </SelectItem>
                          <SelectItem value="RO">Rondônia (RO)</SelectItem>
                          <SelectItem value="RR">Roraima (RR)</SelectItem>
                          <SelectItem value="SC">
                            Santa Catarina (SC)
                          </SelectItem>
                          <SelectItem value="SP">São Paulo (SP)</SelectItem>
                          <SelectItem value="SE">Sergipe (SE)</SelectItem>
                          <SelectItem value="TO">Tocantins (TO)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={handleSearchProcesses}
                        disabled={!oabNumber.trim() || !oabState.trim()}
                        className="w-full"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Consultar Projetos
                      </Button>
                    </div>
                  </div>

                  {/* Informações sobre a consulta */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-3">
                      <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">
                          Como funciona a consulta:
                        </p>
                        <ul className="space-y-1 text-xs">
                          <li>
                            • Digite o número da OAB e o estado do advogado
                          </li>
                          <li>
                            • O sistema buscará todos os projetos onde este
                            advogado está atuando
                          </li>
                          <li>
                            • Serão exibidos apenas projetos com status ativo
                          </li>
                          <li>
                            • Clique em qualquer projeto para ver os detalhes
                            completos
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resultados da Consulta */}
                {isSearching && (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center space-y-2">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-sm text-muted-foreground">
                        Consultando projetos...
                      </p>
                    </div>
                  </div>
                )}

                {searchResults.length > 0 && !isSearching && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        Projetos Encontrados ({searchResults.length})
                      </h3>
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-600"
                      >
                        Consulta realizada com sucesso
                      </Badge>
                    </div>

                    {/* Layout de Cards lado a lado */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {searchResults.map((project) => (
                        <div
                          key={project.id}
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-card"
                        >
                          {/* Header do Card */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-muted-foreground font-medium">
                              DATA DO PROJETO
                            </span>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                                onClick={() => handleArchiveProcess(project)}
                                title="Arquivar"
                              >
                                📁
                              </Button>
                            </div>
                          </div>

                          {/* Data */}
                          <div className="text-lg font-semibold mb-2">
                            {project.dataUltimaMovimentacao?.toLocaleDateString(
                              "pt-BR",
                            ) || "21/08/2025"}
                          </div>

                          {/* Cliente */}
                          <div className="mb-3">
                            <span className="text-xs text-muted-foreground font-medium">
                              CLIENTE
                            </span>
                            <div className="font-medium text-sm mt-1">
                              <span className="text-blue-600">
                                {project.cliente}
                              </span>
                            </div>
                            <div className="text-xs text-green-600 font-medium mt-1">
                              VISUALIZAR PROJETO
                            </div>
                          </div>

                          {/* Informações Adicionais */}
                          <div className="mt-3 pt-3 border-t space-y-2">
                            <div className="text-xs text-muted-foreground">
                              <strong>Número:</strong> {project.numero}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <strong>Status:</strong>
                              <Badge
                                className={`ml-1 ${getProcessStatusColor(project.status)} text-xs`}
                              >
                                {project.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <strong>Vara:</strong> {project.vara}
                            </div>

                            {/* Botão Abrir Projeto */}
                            <div className="mt-3 pt-2">
                              <Button
                                size="sm"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() =>
                                  handleViewProcessDetails(project)
                                }
                              >
                                Abrir Projeto
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hasSearched && searchResults.length === 0 && !isSearching && (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="space-y-2">
                      <FileSearch className="h-12 w-12 mx-auto opacity-50" />
                      <p className="font-medium">Nenhum projeto encontrado</p>
                      <p className="text-sm">
                        Não foram encontrados projetos para a OAB {oabNumber}/
                        {oabState}
                      </p>
                      <p className="text-xs">
                        Verifique se o número da OAB está correto e tente
                        novamente
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA PROJETOS ARQUIVADOS */}
          <TabsContent value="arquivados" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Projetos Arquivados</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Projetos que foram finalizados e arquivados
                </p>
              </CardHeader>
              <CardContent>
                {archivedProjects.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        Projetos Arquivados ({archivedProjects.length})
                      </h3>
                      <Badge
                        variant="outline"
                        className="text-gray-600 border-gray-600"
                      >
                        📁 Arquivados
                      </Badge>
                    </div>

                    {/* Layout de Cards lado a lado */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {archivedProjects.map((project) => (
                        <div
                          key={project.id}
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50 dark:bg-gray-800"
                        >
                          {/* Header do Card */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-muted-foreground font-medium">
                              DATA DO PROJETO
                            </span>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                                onClick={() => handleRestoreProject(project)}
                                title="Restaurar Projeto"
                              >
                                ↩️
                              </Button>
                            </div>
                          </div>

                          {/* Data */}
                          <div className="text-lg font-semibold mb-2">
                            {project.dataUltimaMovimentacao?.toLocaleDateString(
                              "pt-BR",
                            ) || "21/08/2025"}
                          </div>

                          {/* Cliente */}
                          <div className="mb-3">
                            <span className="text-xs text-muted-foreground font-medium">
                              CLIENTE
                            </span>
                            <div className="font-medium text-sm mt-1">
                              <span className="text-blue-600">
                                {project.cliente}
                              </span>
                            </div>
                            <div className="text-xs text-green-600 font-medium mt-1">
                              VISUALIZAR PROJETO
                            </div>
                          </div>

                          {/* Status de Arquivado */}
                          <div className="mb-3">
                            <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-xs">
                              📁 Arquivado
                            </Badge>
                          </div>

                          {/* Informações Adicionais */}
                          <div className="mt-3 pt-3 border-t space-y-2">
                            <div className="text-xs text-muted-foreground">
                              <strong>Número:</strong> {project.numero}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <strong>Tipo:</strong> {project.tipo}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <strong>Valor:</strong> {project.valor}
                            </div>
                            {project.dataArquivamento && (
                              <div className="text-xs text-muted-foreground">
                                <strong>Arquivado em:</strong>{" "}
                                {project.dataArquivamento.toLocaleDateString(
                                  "pt-BR",
                                )}
                              </div>
                            )}

                            {/* Botão Abrir Projeto */}
                            <div className="mt-3 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() =>
                                  handleViewProcessDetails(project)
                                }
                              >
                                Visualizar Projeto
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="space-y-2">
                      <Building2 className="h-12 w-12 mx-auto opacity-50" />
                      <p className="font-medium">Nenhum projeto arquivado</p>
                      <p className="text-sm">
                        Os projetos arquivados aparecerão aqui
                      </p>
                      <p className="text-xs">
                        Arquive projetos finalizados para manter a organização
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Visualização de Processo */}
        <ProcessViewDialog
          process={viewingProcess}
          open={showProcessDialog}
          onOpenChange={setShowProcessDialog}
        />
      </div>
    </DashboardLayout>
  );
}
