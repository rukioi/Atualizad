/**
 * PÁGINA DE DETALHES DA PUBLICAÇÃO
 * ===============================
 *
 * Página dedicada para visualizar os detalhes completos de uma publicação
 * baseada no layout fornecido na imagem de referência.
 */

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Printer,
  FileText,
  Calendar,
  Building2,
  Scale,
  User,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Settings,
  Plus,
  Lightbulb,
  ChevronDown,
  ListTodo,
  UserPlus,
  Eye,
} from "lucide-react";
import { Publication, PublicationStatus } from "@/types/publications";
import { TaskForm } from "@/components/Tasks/TaskForm";

/**
 * DADOS MOCK PARA PUBLICAÇÃO DETALHADA
 * ===================================
 *
 * BACKEND: Esta publicação virá da API GET /api/publicacoes/{id}
 * Incluindo todas as tarefas vinculadas e histórico de atribuições
 */
const mockPublications: Publication[] = [
  {
    id: "1",
    dataPublicacao: new Date("2024-01-15"),
    processo: "0001193-84.2013.5.02.0002",
    diario: "Diário do Tribunal Regional do Trabalho de São Paulo (2ª Região) - Eletrônico - Edição 2727",
    varaComarca: "2ª Vara do Trabalho de São Paulo - Comarca: CAPITAL",
    nomePesquisado: "JOÃO BATISTA XAVIER",
    status: "pendente", // Status será atualizado dinamicamente
    conteudo: "Processo Nº RTOrd-0001193-84.2013.5.02.0002 REQUERANTE JOÃO BATISTA XAVIER ADVOGADO SUELI SZNIFER CATTANIO/AB 000000SC) REQUERIDO LUAN FRONZA REQUERIDO CONSTRUTORA BI Intimação(s)/Citação(s) - JOÃO CARLOS Justiça do Trabalho - 2 Reqfa 2 Vara do Trabalho de So Paulo Avenida Marginal da Sa Vicente, 235, Vrza da Barra Funda, SAO PAULO - SP - CEP 0100-001 - v40028@trtsp.jus.br Destinatário: JOÃO CARLOS INTIMAÇÃO - Processo: Ple - Processo: 0001193- 84.2013.5.02.0002 - Processo Ple Classe: AO TRABALHISTA",
    responsavel: "Dr. Advogado Silva",
    urgencia: "alta",
    numeroProcesso: "0001193-84.2013.5.02.0002",
    cliente: "João Batista Xavier",
    tarefasVinculadas: [] // Tarefas vinculadas serão carregadas da API
  },
];

const getStatusConfig = (status: PublicationStatus) => {
  const statusConfigs = {
    nova: {
      label: "NOVA",
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800",
      icon: FileText
    },
    pendente: {
      label: "PENDENTE",
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800",
      icon: AlertTriangle
    },
    atribuida: {
      label: "ATRIBUÍDA",
      className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800",
      icon: UserPlus
    },
    finalizada: {
      label: "FINALIZADA",
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800",
      icon: CheckCircle
    },
    descartada: {
      label: "DESCARTADA",
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800",
      icon: Trash2
    }
  };

  return statusConfigs[status];
};

export function PublicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [publicationTasks, setPublicationTasks] = useState<any[]>([]);

  // Buscar publicação pelo ID (mock)
  const publication = mockPublications.find(p => p.id === id);

  if (!publication) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-muted-foreground">Publicação não encontrada</h1>
            <Button onClick={() => navigate("/publicacoes")} className="mt-4">
              Voltar para Publicações
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = getStatusConfig(publication.status);
  const StatusIcon = statusConfig.icon;

  const handlePrint = () => {
    window.print();
  };

  const handleDiscard = () => {
    // Implementar lógica de descarte
    console.log("Descartando publicação:", publication.id);
    // Redirecionar para lista de publicações
    navigate("/publicacoes");
  };

  const handleComplete = () => {
    // Implementar lógica de conclusão
    console.log("Concluindo publicação:", publication.id);
    // Redirecionar para lista de publicações
    navigate("/publicacoes");
  };

  /**
   * INTEGRAÇÃO COM SISTEMA DE TAREFAS
   * =================================
   *
   * BACKEND: Quando uma tarefa é criada vinculada à publicação:
   * 1. POST /api/tarefas com { publicacaoId: publication.id }
   * 2. Atualizar campo tarefasVinculadas da publicação
   * 3. Se tarefa for atribuída a alguém, mudar status da publicação para 'atribuida'
   * 4. Enviar notificação para o responsável atribuído
   */
  const handleAddTask = () => {
    setShowTaskForm(true);
  };

  const handleTaskSubmit = (taskData: any) => {
    // BACKEND: Criar tarefa vinculada à publicação
    console.log("Criando tarefa vinculada à publicação:", publication.id, taskData);

    // BACKEND: Se tarefa tem responsável, mudar status da publicação para 'atribuida'
    if (taskData.assignedTo) {
      console.log("Mudando status da publicação para ATRIBUIDA - responsável:", taskData.assignedTo);
      // PATCH /api/publicacoes/{id}/status { status: 'atribuida', responsavel: taskData.assignedTo }
    }

    // BACKEND: Enviar notificação para o responsável
    console.log("Enviando notificação para:", taskData.assignedTo);

    setShowTaskForm(false);
  };


  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/publicacoes")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>VOLTAR</span>
            </Button>
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Publicação</h1>
              <Badge className={`${statusConfig.className} px-3 py-1 flex items-center space-x-1`}>
                <StatusIcon className="h-3 w-3" />
                <span className="font-medium">{statusConfig.label}</span>
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  GERENCIAMENTOS
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleAddTask}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Tarefa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="destructive" size="sm" onClick={handleDiscard}>
              <Trash2 className="h-4 w-4 mr-2" />
              DESCARTAR
            </Button>
            <Button variant="default" size="sm" onClick={handleComplete}>
              <CheckCircle className="h-4 w-4 mr-2" />
              CONCLUIR
            </Button>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lado Esquerdo - Informações da Publicação */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações do Diário */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações da Publicaç��o</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Diário</label>
                  <p className="text-sm mt-1 leading-relaxed">{publication.diario}</p>
                </div>
                
                <Separator />
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Vara</label>
                  <p className="text-sm mt-1 flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{publication.varaComarca}</span>
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Divulgação em</label>
                  <p className="text-sm mt-1 flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {publication.dataPublicacao.toLocaleDateString('pt-BR')} - Publicado em: {publication.dataPublicacao.toLocaleDateString('pt-BR')}
                    </span>
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Processo</label>
                  <p className="text-sm mt-1 flex items-center space-x-2">
                    <Scale className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{publication.processo}</span>
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Termo encontrado</label>
                  <p className="text-sm mt-1 flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{publication.nomePesquisado}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Sentença */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sentença</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {publication.conteudo}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lado Direito - Informações do Processo */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">PROCESSO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Número</label>
                  <p className="text-sm mt-1 font-mono text-primary">
                    {publication.numeroProcesso || publication.processo}
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome</label>
                  <p className="text-sm mt-1 font-medium">
                    {publication.cliente || publication.nomePesquisado}
                  </p>
                </div>
                
                {publication.responsavel && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Responsável</label>
                      <p className="text-sm mt-1">{publication.responsavel}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Tratamentos Sugeridos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">GERENCIAMENTOS SUGERIDOS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start space-x-3">
                    <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Esta publicação tem <span className="font-semibold">67%</span> de chances de conter um prazo
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    ADICIONAR PRAZO DE 5 DIAS
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modal de Criação de Tarefa */}
        <TaskForm
          open={showTaskForm}
          onOpenChange={setShowTaskForm}
          onSubmit={handleTaskSubmit}
          isEditing={false}
        />
      </div>
    </DashboardLayout>
  );
}
