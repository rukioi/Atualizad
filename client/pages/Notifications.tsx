/**
 * PÁGINA DE NOTIFICAÇÕES - Sistema Completo
 * ==========================================
 * 
 * Página dedicada para visualizar todas as notificações do sistema
 * com detalhes completos incluindo:
 * - Quem cadastrou/fez a ação
 * - Horário detalhado
 * - Informações adicionais
 * - Ações disponíveis
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
// NOVIDADE: Importar componentes de visualização para abrir modais específicos
import { ProjectViewDialog } from '@/components/Projects/ProjectViewDialog';
import { ClientViewDialog } from '@/components/CRM/ClientViewDialog';
import { DocumentViewDialog } from '@/components/Billing/DocumentViewDialog';
import { TaskViewDialog } from '@/components/Tasks/TaskViewDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { 
  Bell, 
  Search, 
  Filter,
  CheckCircle,
  AlertTriangle, 
  Info, 
  X,
  Calendar, 
  DollarSign, 
  FileText,
  Users,
  User,
  Clock,
  Eye,
  Trash2
} from 'lucide-react';

interface DetailedNotification {
  id: string;
  userId: string;
  actorId?: string;
  type: 'task' | 'invoice' | 'system' | 'client' | 'project';
  title: string;
  message: string;
  payload: any;
  link?: string;
  read: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function Notifications() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');

  // NOVIDADE: Estados para controlar modais de visualização específicos
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // NOVIDADE: Mock data para demonstrar funcionalidade "Ver Detalhes"
  // Em produção, estes dados viriam de APIs baseados no ID da notificação
  const mockProject = {
    id: '3',
    title: 'Ação Previdenciária - Maria Silva',
    description: 'Revisão de aposentadoria negada pelo INSS',
    clientName: 'Maria Silva',
    status: 'won',
    startDate: '2024-01-01T00:00:00Z',
    dueDate: '2024-02-15T00:00:00Z',
    budget: 5500,
    currency: 'BRL',
    progress: 100,
    tags: ['Previdenciário', 'INSS', 'Concluído'],
    assignedTo: ['Dr. Advogado'],
    contacts: [],
    attachments: [],
    files: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-28T00:00:00Z',
  };

  const mockClient = {
    id: '2',
    name: 'João Santos',
    email: 'joao@email.com',
    mobile: '(11) 99999-8888',
    address: 'Rua das Flores, 123, Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01234-567',
    country: 'BR',
    tags: ['Direito Trabalhista', 'Novo Cliente'],
    registeredBy: 'Junior Santos',
    createdAt: '2024-01-28T10:00:00Z',
    updatedAt: '2024-01-28T10:00:00Z',
    status: 'active',
    budget: 5000,
    currency: 'BRL',
  };

  const mockDocument = {
    id: 'INV-001',
    number: 'INV-001',
    type: 'invoice',
    status: 'pending',
    clientName: 'Maria Silva',
    amount: 2500,
    total: 2500,
    subtotal: 2500,
    dueDate: '2024-01-30T00:00:00Z',
    date: '2024-01-26T00:00:00Z',
    createdAt: '2024-01-26T00:00:00Z',
    updatedAt: '2024-01-26T00:00:00Z',
    currency: 'BRL',
    items: [
      {
        id: '1',
        description: 'Consultoria Jurídica',
        quantity: 1,
        rate: 2500,
        amount: 2500,
        tax: 0,
      }
    ],
    senderName: 'Escritório Silva & Associados',
    receiverName: 'Maria Silva',
  };

  const mockTask = {
    id: '5',
    title: 'Revisar documentos contratuais',
    description: 'Tarefa urgente para revisar contratos de prestação de serviços',
    status: 'pending',
    priority: 'high',
    startDate: '2024-01-27T00:00:00Z',
    endDate: '2024-01-30T00:00:00Z',
    assignedTo: 'Dr. Silva',
    projectTitle: 'Consultoria Empresarial',
    clientName: 'Empresa ABC',
    tags: ['Contratos', 'Urgente'],
    estimatedHours: 4,
    actualHours: 0,
    progress: 0,
    createdAt: '2024-01-27T14:30:00Z',
    updatedAt: '2024-01-27T14:30:00Z',
    attachments: [],
  };

  // Filtrar notificações
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (notification.payload?.createdBy || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    const matchesRead = readFilter === 'all' || 
                       (readFilter === 'read' && notification.read) ||
                       (readFilter === 'unread' && !notification.read);

    return matchesSearch && matchesType && matchesRead;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'invoice': return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'task': return <Calendar className="h-5 w-5 text-orange-500" />;
      case 'client': return <Users className="h-5 w-5 text-blue-500" />;
      case 'project': return <FileText className="h-5 w-5 text-purple-500" />;
      case 'system': return <Info className="h-5 w-5 text-gray-500" />;
      default: return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      client: 'CRM',
      project: 'Projetos',
      invoice: 'Cobrança',
      task: 'Tarefas',
      system: 'Sistema'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const formatDetailedTime = (date: Date) => {
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // NOVIDADE: Função para abrir modal específico baseado no tipo de notificação
  // Substitui navegação por página que causava 3 segundos de tela branca
  const handleViewDetails = (notification: DetailedNotification) => {
    markAsRead(notification.id);

    if (notification.link) {
      navigate(notification.link);
      return;
    }

    // IMPLEMENTAÇÃO: Abrir modal específico conforme tipo da notificação
    switch (notification.type) {
      case 'project':
        setSelectedItem(mockProject);
        setShowProjectDialog(true);
        break;
      case 'client':
        setSelectedItem(mockClient);
        setShowClientDialog(true);
        break;
      case 'invoice':
        setSelectedItem(mockDocument);
        setShowDocumentDialog(true);
        break;
      case 'task':
        setSelectedItem(mockTask);
        setShowTaskDialog(true);
        break;
      default:
        navigate('/');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Notificações</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
              <Bell className="h-8 w-8 mr-3" />
              Central de Notificações
            </h1>
            <p className="text-muted-foreground">
              Todas as atividades e atualizações do sistema
            </p>
          </div>
          <div className="flex items-center space-x-2 mt-4 md:mt-0">
            {unreadCount > 0 && (
              <Badge variant="default" className="bg-blue-600">
                {unreadCount} não lidas
              </Badge>
            )}
            <Button onClick={markAllAsRead} variant="outline">
              <CheckCircle className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar notificações..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="client">CRM</SelectItem>
                    <SelectItem value="project">Projetos</SelectItem>
                    <SelectItem value="invoice">Cobrança</SelectItem>
                    <SelectItem value="task">Tarefas</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={readFilter} onValueChange={setReadFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="unread">Não lidas</SelectItem>
                    <SelectItem value="read">Lidas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Notificações */}
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando notificações...</p>
              </CardContent>
            </Card>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhuma notificação encontrada
                </p>
                <p className="text-sm text-muted-foreground">
                  Tente ajustar os filtros para ver mais resultados
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`transition-all duration-200 ${
                  !notification.read 
                    ? 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20' 
                    : 'hover:shadow-md'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Ícone do tipo */}
                    <div className="mt-1">
                      {getTypeIcon(notification.type)}
                    </div>

                    {/* Conteúdo principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h3 className={`text-lg font-semibold ${
                            !notification.read ? 'text-primary' : ''
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <Badge variant="default" className="text-xs">
                              Nova
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="flex items-center space-x-1">
                            {getTypeIcon(notification.type)}
                            <span>{getTypeLabel(notification.type)}</span>
                          </Badge>
                        </div>
                      </div>

                      <p className="text-muted-foreground mb-3">
                        {notification.message}
                      </p>

                      {notification.payload?.details && (
                        <div className="bg-muted/50 rounded-lg p-3 mb-4">
                          <p className="text-sm">
                            {notification.payload.details}
                          </p>
                        </div>
                      )}

                      {/* Informações de auditoria */}
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
                        {notification.payload?.createdBy && (
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>Criado por: {notification.payload.createdBy}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>Horário: {formatDetailedTime(notification.createdAt)}</span>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {(notification.link || notification.type !== 'system') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(notification)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </Button>
                          )}
                          {!notification.read && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Marcar como lida
                            </Button>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => deleteNotification(notification.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* NOVIDADE: Modais de visualização específicos para cada tipo de notificação */}
        {/* Evita navegação de página que causava 3 segundos de tela branca */}

        {/* Modal de Projeto */}
        <ProjectViewDialog
          open={showProjectDialog}
          onOpenChange={setShowProjectDialog}
          project={selectedItem}
          onEdit={() => {
            setShowProjectDialog(false);
            navigate('/projetos');
          }}
        />

        {/* Modal de Cliente */}
        <ClientViewDialog
          open={showClientDialog}
          onOpenChange={setShowClientDialog}
          client={selectedItem}
          onEdit={() => {
            setShowClientDialog(false);
            navigate('/crm');
          }}
        />

        {/* Modal de Documento/Fatura */}
        <DocumentViewDialog
          open={showDocumentDialog}
          onOpenChange={setShowDocumentDialog}
          document={selectedItem}
          onEdit={() => {
            setShowDocumentDialog(false);
            navigate('/cobranca');
          }}
        />

        {/* Modal de Tarefa */}
        <TaskViewDialog
          open={showTaskDialog}
          onOpenChange={setShowTaskDialog}
          task={selectedItem}
          onEdit={() => {
            setShowTaskDialog(false);
            navigate('/tarefas');
          }}
        />
      </div>
    </DashboardLayout>
  );
}