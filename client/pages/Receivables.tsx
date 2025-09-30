/**
 * PÁGINA PRINCIPAL - GESTÃO DE RECEBÍVEIS
 * ======================================
 *
 * Sistema completo para administração de pagamentos e automação de cobranças.
 * Integra com Stripe, n8n e WhatsApp para gestão inteligente de recebíveis.
 */

import React, { useState } from "react";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { ImportBillingModal } from "@/components/Receivables/ImportBillingModal";
import { InvoiceViewDialog } from "@/components/Receivables/InvoiceViewDialog";
import { NewInvoiceModal } from "@/components/Receivables/NewInvoiceModal";
import { ClientViewDialog } from "@/components/Receivables/ClientViewDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  CreditCard,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  Calendar,
  MessageSquare,
  Plus,
  Filter,
  Search,
  Eye,
  Send,
  Settings,
  BarChart3,
  Smartphone,
  Mail,
  ExternalLink,
  Import,
  Edit,
  Trash2,
  Phone,
  Building2,
  User,
} from "lucide-react";
import {
  Invoice,
  InvoiceStatus,
  ClienteCobranca,
  DashboardRecebiveis,
  NotificacaoAutomatica,
} from "@/types/receivables";

/**
 * DADOS MOCK PARA DEMONSTRAÇÃO
 * ============================
 *
 * BACKEND: Estes dados virão das seguintes APIs:
 * - GET /api/recebiveis/dashboard - Estatísticas gerais
 * - GET /api/recebiveis/faturas - Lista de faturas com filtros
 * - GET /api/recebiveis/clientes - Clientes com dados de cobrança
 * - GET /api/recebiveis/notificacoes - Notificações automáticas
 */

const mockDashboard: DashboardRecebiveis = {
  faturasPagas: 68,
  faturasPendentes: 15,
  faturasVencidas: 1,
  faturasProximoVencimento: 4,
  valorTotal: 187500,
  valorPago: 142800,
  valorPendente: 39200,
  valorVencido: 5500,
  novosClientes: 12,
  taxaCobranças: 96.8,
  tempoMedioPagamento: 8,
  notificacoesAgendadas: 6,
  faturas3Dias: [],
  faturasVencidas: [],
  faturamentoMensal: 142800,
  crescimentoMensal: 22.4,
  clientesAtivos: 84,
};

const mockInvoices: Invoice[] = [
  // ÚNICA FATURA VENCIDA (conforme solicitado)
  {
    id: "1",
    clienteId: "client1",
    numeroFatura: "REC-2025-001",
    valor: 5500,
    descricao: "Honorários Advocatícios - Dezembro/2024",
    servicoPrestado: "Consultoria Jurídica Especializada",
    dataEmissao: new Date("2024-12-01"),
    dataVencimento: new Date("2024-12-31"),
    status: "vencida",
    tentativasCobranca: 3,
    stripeInvoiceId: "in_stripe123",
    linkPagamento: "https://checkout.stripe.com/xyz",
    recorrente: true,
    intervaloDias: 30,
    proximaFaturaData: new Date("2025-01-31"),
    criadoPor: "Dr. Silva",
    criadoEm: new Date("2024-12-01"),
    atualizadoEm: new Date("2025-01-05"),
    urgencia: "alta",
    ultimaNotificacao: new Date("2025-01-03"),
  },
  // FATURAS PRÓXIMAS AO VENCIMENTO (3 dias ou menos)
  {
    id: "2",
    clienteId: "client2",
    numeroFatura: "REC-2025-015",
    valor: 3200,
    descricao: "Ação Trabalhista - Acompanhamento Processual",
    servicoPrestado: "Processo Judicial",
    dataEmissao: new Date("2025-01-05"),
    dataVencimento: new Date("2025-01-28"), // 3 dias
    status: "pendente",
    tentativasCobranca: 1,
    linkPagamento: "https://checkout.stripe.com/abc123",
    recorrente: false,
    criadoPor: "Dra. Costa",
    criadoEm: new Date("2025-01-05"),
    atualizadoEm: new Date("2025-01-20"),
    urgencia: "media",
    proximaNotificacao: new Date("2025-01-25"),
  },
  {
    id: "3",
    clienteId: "client3",
    numeroFatura: "REC-2025-018",
    valor: 2800,
    descricao: "Elaboração de Contrato Empresarial",
    servicoPrestado: "Elaboração de Contratos",
    dataEmissao: new Date("2025-01-10"),
    dataVencimento: new Date("2025-01-27"), // 2 dias
    status: "nova",
    tentativasCobranca: 0,
    linkPagamento: "https://checkout.stripe.com/def456",
    recorrente: false,
    criadoPor: "Dr. Silva",
    criadoEm: new Date("2025-01-10"),
    atualizadoEm: new Date("2025-01-10"),
    urgencia: "alta",
  },
  // FATURAS PENDENTES (prazo normal)
  {
    id: "4",
    clienteId: "client4",
    numeroFatura: "REC-2025-020",
    valor: 4200,
    descricao: "Consultoria Jurídica - Janeiro/2025",
    servicoPrestado: "Consultoria Empresarial",
    dataEmissao: new Date("2025-01-15"),
    dataVencimento: new Date("2025-02-15"),
    status: "pendente",
    tentativasCobranca: 0,
    linkPagamento: "https://checkout.stripe.com/ghi789",
    recorrente: true,
    intervaloDias: 30,
    proximaFaturaData: new Date("2025-02-15"),
    criadoPor: "Dra. Costa",
    criadoEm: new Date("2025-01-15"),
    atualizadoEm: new Date("2025-01-15"),
    urgencia: "media",
  },
  // FATURAS PAGAS (algumas amostras)
  {
    id: "5",
    clienteId: "client5",
    numeroFatura: "REC-2025-010",
    valor: 3500,
    descricao: "Assessoria Jurídica Completa",
    servicoPrestado: "Consultoria Jurídica",
    dataEmissao: new Date("2025-01-02"),
    dataVencimento: new Date("2025-01-20"),
    dataPagamento: new Date("2025-01-18"),
    status: "paga",
    tentativasCobranca: 1,
    stripePaymentIntentId: "pi_payment123",
    recorrente: false,
    criadoPor: "Dr. Silva",
    criadoEm: new Date("2025-01-02"),
    atualizadoEm: new Date("2025-01-18"),
    urgencia: "baixa",
  },
  {
    id: "6",
    clienteId: "client6",
    numeroFatura: "REC-2025-012",
    valor: 2400,
    descricao: "Revisão Contratual",
    servicoPrestado: "Análise de Contratos",
    dataEmissao: new Date("2025-01-05"),
    dataVencimento: new Date("2025-01-22"),
    dataPagamento: new Date("2025-01-21"),
    status: "paga",
    tentativasCobranca: 0,
    stripePaymentIntentId: "pi_payment456",
    recorrente: false,
    criadoPor: "Dra. Costa",
    criadoEm: new Date("2025-01-05"),
    atualizadoEm: new Date("2025-01-21"),
    urgencia: "baixa",
  },
];

const mockClientes: ClienteCobranca[] = [
  {
    id: "client1",
    nome: "Tech Solutions LTDA",
    email: "contato@techsolutions.com",
    telefone: "(11) 99999-1111",
    whatsapp: "5511999991111",
    enderecoCobranca: {
      cep: "01310-100",
      logradouro: "Av. Paulista",
      numero: "1000",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      estado: "SP",
    },
    stripeCustomerId: "cus_stripe123",
    receberWhatsApp: true,
    receberEmail: true,
    horaPreferencialNotificacao: "09:00",
    totalFaturado: 12000,
    totalPago: 9500,
    faturasPendentes: 1,
    ultimoPagamento: new Date("2023-12-15"),
    ativo: true,
    bloqueado: false,
  },
  {
    id: "client2",
    nome: "Maria Silva - MEI",
    email: "maria@email.com",
    telefone: "(11) 88888-2222",
    whatsapp: "5511888882222",
    enderecoCobranca: {
      cep: "04038-001",
      logradouro: "Rua Vergueiro",
      numero: "500",
      bairro: "Vila Mariana",
      cidade: "São Paulo",
      estado: "SP",
    },
    receberWhatsApp: true,
    receberEmail: false,
    totalFaturado: 5400,
    totalPago: 3600,
    faturasPendentes: 1,
    ativo: true,
    bloqueado: false,
  },
];

const getStatusBadge = (status: InvoiceStatus) => {
  const configs = {
    nova: {
      label: "Nova",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    },
    pendente: {
      label: "Pendente",
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    },
    atribuida: {
      label: "Atribuída",
      className:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    },
    paga: {
      label: "Paga",
      className:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    },
    cancelada: {
      label: "Cancelada",
      className:
        "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    },
    processando: {
      label: "Processando",
      className:
        "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    },
  };

  // Fallback para status não reconhecidos
  return (
    configs[status as keyof typeof configs] || {
      label: status || "Desconhecido",
      className:
        "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    }
  );
};

const calcularDiasVencimento = (dataVencimento: Date): number => {
  const hoje = new Date();
  const diff = dataVencimento.getTime() - hoje.getTime();
  return Math.ceil(diff / (1000 * 3600 * 24));
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function Receivables() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [showClientViewDialog, setShowClientViewDialog] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [viewingClient, setViewingClient] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [notifications, setNotifications] = useState<any[]>([]);

  /**
   * FUNÇÃO PARA DETECÇÃO DE VENCIMENTOS (3 DIAS)
   * ============================================
   *
   * BACKEND: Esta lógica deve ser implementada como CRON JOB
   * que executa diariamente às 09:00 da manhã:
   *
   * 1. Query no banco: SELECT * FROM faturas WHERE
   *    data_vencimento = CURRENT_DATE + INTERVAL '3 days'
   *    AND status = 'pendente'
   *
   * 2. Para cada fatura encontrada:
   *    - Criar notificação automática
   *    - Dispara webhook para n8n
   *    - n8n envia WhatsApp com link de pagamento
   *
   * 3. Implementar retry mechanism para falhas
   * 4. Log de todas as notificações enviadas
   */
  const handleNotificarCliente = async (invoice: Invoice) => {
    console.log("Enviando notificação para fatura:", invoice.numeroFatura);

    // BACKEND: POST /api/recebiveis/notificar
    // Payload: { faturaId, tipo: 'manual', canal: 'whatsapp' }

    // Webhook para n8n
    const webhookPayload = {
      evento: "lembrete_pagamento",
      fatura: {
        id: invoice.id,
        numero: invoice.numeroFatura,
        valor: invoice.valor,
        vencimento: invoice.dataVencimento.toISOString(),
        linkPagamento: invoice.linkPagamento || "",
      },
      cliente: {
        // Buscar dados do cliente
        id: invoice.clienteId,
        nome: "Cliente Exemplo",
        whatsapp: "5511999999999",
      },
    };

    console.log("Payload para n8n:", webhookPayload);
  };

  const handleEnviarCobrancaLote = () => {
    console.log("Enviando cobrança em lote para faturas:", selectedInvoices);
    // BACKEND: POST /api/recebiveis/cobranca-lote
  };

  const filteredInvoices = invoices
    .filter((invoice) => {
      const matchesSearch =
        invoice.numeroFatura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.descricao.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || invoice.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Ordenação personalizada conforme solicitado:
      // 1. Pendente (topo - vermelho, prioridade máxima)
      // 2. Nova (abaixo de pendente)
      // 3. Processando (meio)
      // 4. Paga (final da lista)

      const statusPriority = {
        pendente: 1, // Topo (vermelho) - prioridade máxima
        nova: 2, // Abaixo de pendente
        processando: 3, // Meio
        atribuida: 4, // Meio (caso ainda exista)
        paga: 5, // Final da lista
        cancelada: 6, // Final
      };

      const priorityA =
        statusPriority[a.status as keyof typeof statusPriority] || 7;
      const priorityB =
        statusPriority[b.status as keyof typeof statusPriority] || 7;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Se o status for igual, ordenar por data de vencimento (mais próximo primeiro)
      return (
        new Date(a.dataVencimento).getTime() -
        new Date(b.dataVencimento).getTime()
      );
    });

  const handleImportBilling = (importedInvoices: any[]) => {
    // Adicionar faturas importadas ao estado
    const newInvoices = importedInvoices.map((imported) => ({
      ...imported,
      id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }));

    setInvoices((prev) => [...prev, ...newInvoices]);

    // Notificação de sucesso
    console.log(
      `✅ ${importedInvoices.length} fatura(s) importada(s) com sucesso!`,
    );
  };

  const handleCreateInvoice = (newInvoices: any[]) => {
    // Adicionar novas faturas ao estado
    const invoicesWithIds = newInvoices.map((invoice) => ({
      ...invoice,
      id: `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }));

    setInvoices((prev) => [...invoicesWithIds, ...prev]);

    // Notificação de sucesso
    console.log(
      `��� ${newInvoices.length} nova(s) fatura(s) criada(s) com sucesso!`,
    );

    // Se for recorrente, mostrar mensagem específica
    if (newInvoices.length > 1) {
      console.log(
        `🔄 Fatura recorrente criada com ${newInvoices.length} parcelas`,
      );
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setViewingInvoice(invoice);
    setShowViewDialog(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    console.log("Editando fatura:", invoice.numeroFatura);
    // Abrir modal de visualização que contém o botão de edição
    setViewingInvoice(invoice);
    setShowViewDialog(true);
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    if (confirm(`Deseja realmente excluir a fatura ${invoice.numeroFatura}?`)) {
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoice.id));
      setSelectedInvoices((prev) => prev.filter((id) => id !== invoice.id));

      // Fechar dialog automaticamente se estiver aberto
      if (showViewDialog && viewingInvoice?.id === invoice.id) {
        setShowViewDialog(false);
        setViewingInvoice(null);
      }

      console.log("✅ Fatura excluída:", invoice.numeroFatura);
    }
  };

  const handleUpdateInvoiceStatus = (invoice: Invoice, newStatus: any) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoice.id
          ? { ...inv, status: newStatus, atualizadoEm: new Date() }
          : inv,
      ),
    );

    // Feedback visual para o usuário
    const statusLabels = {
      nova: "Nova",
      pendente: "Pendente",
      processando: "Processando",
      paga: "Paga",
      vencida: "Vencida",
      cancelada: "Cancelada",
    };

    const statusLabel =
      statusLabels[newStatus as keyof typeof statusLabels] || newStatus;
    console.log(
      `✅ Status da fatura ${invoice.numeroFatura} alterado para: ${statusLabel}`,
    );

    // Se em produção, você pode usar um toast aqui ao invés de alert
    // toast.success(`Status alterado para: ${statusLabel}`);
  };

  // Gerar lista de clientes baseada nas faturas
  const getClientsFromInvoices = () => {
    const clientsMap = new Map();

    invoices.forEach((invoice) => {
      const clientId = invoice.clienteId;
      const clientName =
        invoice.clienteNome ||
        mockClientes.find((c) => c.id === clientId)?.nome ||
        "Cliente Desconhecido";
      const clientEmail =
        invoice.clienteEmail ||
        mockClientes.find((c) => c.id === clientId)?.email ||
        "";
      const clientPhone =
        invoice.clienteTelefone ||
        mockClientes.find((c) => c.id === clientId)?.telefone ||
        "";

      if (!clientsMap.has(clientId)) {
        clientsMap.set(clientId, {
          id: clientId,
          nome: clientName,
          email: clientEmail,
          telefone: clientPhone,
          whatsapp: mockClientes.find((c) => c.id === clientId)?.whatsapp,
          totalFaturado: 0,
          totalPago: 0,
          faturasPendentes: 0,
          ultimoPagamento: null,
          faturas: [],
        });
      }

      const client = clientsMap.get(clientId);
      client.faturas.push(invoice);
      client.totalFaturado += invoice.valor;

      if (invoice.status === "paga") {
        client.totalPago += invoice.valor;
        if (
          invoice.dataPagamento &&
          (!client.ultimoPagamento ||
            invoice.dataPagamento > client.ultimoPagamento)
        ) {
          client.ultimoPagamento = invoice.dataPagamento;
        }
      } else if (invoice.status === "pendente" || invoice.status === "nova") {
        client.faturasPendentes += 1;
      }
    });

    return Array.from(clientsMap.values());
  };

  const handleViewClient = (client: any) => {
    setViewingClient(client);
    setShowClientViewDialog(true);
  };

  const handleSendNotification = (notificationData: any) => {
    // Adicionar notificação à lista
    const newNotification = {
      id: Date.now().toString(),
      ...notificationData,
    };

    setNotifications((prev) => [newNotification, ...prev]);

    console.log("✅ Notificação criada:", newNotification);
    alert(
      `✅ Notificação ${notificationData.isScheduled ? "agendada" : "enviada"} com sucesso!`,
    );
  };

  const handleSaveInvoice = (invoiceData: any) => {
    // Atualizar fatura na lista
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceData.id ? invoiceData : inv)),
    );

    console.log("✅ Fatura atualizada:", invoiceData);
    alert("✅ Fatura atualizada com sucesso!");
  };

  const handleEditNotification = (notification: any) => {
    console.log("Editando notificação:", notification);
    // Implementar edição de notificação
  };

  const handleDeleteNotification = (notificationId: string) => {
    if (confirm("Deseja realmente excluir esta notificação?")) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      alert("✅ Notificação excluída com sucesso!");
    }
  };

  const invoicesProximoVencimento = invoices.filter((invoice) => {
    const dias = calcularDiasVencimento(invoice.dataVencimento);
    return dias <= 3 && dias >= 0 && invoice.status === "pendente";
  });

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Gestão de Recebíveis</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportModal(true)}
            >
              <Import className="h-4 w-4 mr-2" />
              Importar Cobranças
            </Button>
            <Button size="sm" onClick={() => setShowNewInvoiceModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Fatura
            </Button>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Faturas Pagas
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {mockDashboard.faturasPagas}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(mockDashboard.valorPago)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {mockDashboard.faturasPendentes}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(mockDashboard.valorPendente)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Próximo Vencimento
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {mockDashboard.faturasProximoVencimento}
              </div>
              <p className="text-xs text-muted-foreground">3 dias ou menos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {mockDashboard.faturasVencidas}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(mockDashboard.valorVencido)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Abas Principais */}
        <Tabs defaultValue="faturas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="faturas">Faturas</TabsTrigger>
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="notificacoes">
              Notificações Automáticas
            </TabsTrigger>
          </TabsList>

          {/* ABA FATURAS */}
          <TabsContent value="faturas" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Lista de Faturas</CardTitle>
                  <div className="flex items-center space-x-2">
                    {selectedInvoices.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEnviarCobrancaLote}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Enviar Cobrança ({selectedInvoices.length})
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por fatura, cliente ou descrição..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Status</SelectItem>
                      <SelectItem value="nova">Nova</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="processando">Processando</SelectItem>
                      <SelectItem value="paga">Paga</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedInvoices(
                                  filteredInvoices.map((inv) => inv.id),
                                );
                              } else {
                                setSelectedInvoices([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Dias</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <div className="text-muted-foreground">
                              <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p>Nenhuma fatura encontrada</p>
                              <p className="text-sm">
                                Tente ajustar os filtros ou criar uma nova
                                fatura
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredInvoices.map((invoice) => {
                          const statusConfig = getStatusBadge(invoice.status);
                          const diasVencimento = calcularDiasVencimento(
                            invoice.dataVencimento,
                          );
                          const cliente = mockClientes.find(
                            (c) => c.id === invoice.clienteId,
                          );

                          return (
                            <TableRow
                              key={invoice.id}
                              className="hover:bg-muted/30"
                            >
                              <TableCell>
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300"
                                  checked={selectedInvoices.includes(
                                    invoice.id,
                                  )}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedInvoices([
                                        ...selectedInvoices,
                                        invoice.id,
                                      ]);
                                    } else {
                                      setSelectedInvoices(
                                        selectedInvoices.filter(
                                          (id) => id !== invoice.id,
                                        ),
                                      );
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                <div className="space-y-1">
                                  <span className="font-semibold">
                                    {invoice.numeroFatura}
                                  </span>
                                  {invoice.recorrente && (
                                    <div className="text-xs text-blue-600">
                                      🔄 Recorrente
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <span className="font-medium">
                                    {cliente?.nome ||
                                      invoice.clienteNome ||
                                      "Cliente não identificado"}
                                  </span>
                                  <div className="text-xs text-muted-foreground">
                                    {invoice.servicoPrestado}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold text-green-600">
                                {formatCurrency(invoice.valor)}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <span>
                                    {invoice.dataVencimento.toLocaleDateString(
                                      "pt-BR",
                                    )}
                                  </span>
                                  {invoice.dataPagamento && (
                                    <div className="text-xs text-green-600">
                                      Pago:{" "}
                                      {invoice.dataPagamento.toLocaleDateString(
                                        "pt-BR",
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={statusConfig.className}>
                                  {statusConfig.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {(invoice.status === "pendente" ||
                                  invoice.status === "nova") && (
                                  <span
                                    className={
                                      diasVencimento < 0
                                        ? "text-red-600 font-semibold"
                                        : diasVencimento <= 3
                                          ? "text-orange-600 font-semibold"
                                          : "text-muted-foreground"
                                    }
                                  >
                                    {diasVencimento < 0 ? (
                                      <div className="flex items-center space-x-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        <span>
                                          {Math.abs(diasVencimento)} dias em
                                          atraso
                                        </span>
                                      </div>
                                    ) : diasVencimento === 0 ? (
                                      <div className="flex items-center space-x-1 text-red-600">
                                        <Clock className="h-3 w-3" />
                                        <span>Vence hoje</span>
                                      </div>
                                    ) : (
                                      `${diasVencimento} dias`
                                    )}
                                  </span>
                                )}
                                {invoice.status === "paga" && (
                                  <span className="text-green-600 text-sm">
                                    ✅ Paga
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewInvoice(invoice)}
                                    title="Visualizar"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditInvoice(invoice)}
                                    title="Editar"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {(invoice.status === "pendente" ||
                                    invoice.status === "nova") && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleNotificarCliente(invoice)
                                      }
                                      title="Enviar Notificação"
                                    >
                                      <MessageSquare className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {invoice.linkPagamento && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      asChild
                                      title="Abrir Link de Pagamento"
                                    >
                                      <a
                                        href={invoice.linkPagamento}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteInvoice(invoice)}
                                    title="Excluir"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA CLIENTES */}
          <TabsContent value="clientes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Clientes - Gestão de Cobrança</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Clientes cadastrados baseados nas faturas do sistema
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getClientsFromInvoices().map((cliente) => (
                    <div
                      key={cliente.id}
                      className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-semibold">{cliente.nome}</h3>
                            <p className="text-sm text-muted-foreground">
                              {cliente.email} • {cliente.telefone}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {cliente.faturas.length} fatura(s) cadastrada(s)
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {cliente.whatsapp && (
                              <Badge
                                variant="outline"
                                className="text-green-600"
                              >
                                <Smartphone className="h-3 w-3 mr-1" />
                                WhatsApp
                              </Badge>
                            )}
                            {cliente.email && (
                              <Badge
                                variant="outline"
                                className="text-blue-600"
                              >
                                <Mail className="h-3 w-3 mr-1" />
                                Email
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            {formatCurrency(cliente.totalFaturado)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total faturado
                          </p>
                          {cliente.faturasPendentes > 0 && (
                            <p className="text-sm text-red-600 font-medium">
                              {cliente.faturasPendentes} pendente(s)
                            </p>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => handleViewClient(cliente)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {getClientsFromInvoices().length === 0 && (
                    <div className="text-center py-8">
                      <User className="h-12 w-12 mx-auto text-muted-foreground mb-2 opacity-50" />
                      <p className="text-muted-foreground">
                        Nenhum cliente encontrado
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Clientes aparecerão automaticamente ao criar faturas
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA NOTIFICAÇÕES */}
          <TabsContent value="notificacoes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notificações Automáticas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Notificações agendadas e enviadas para clientes
                </p>
              </CardHeader>
              <CardContent>
                {notifications.length > 0 ? (
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center space-x-3">
                              <Badge
                                className={
                                  notification.status === "agendada"
                                    ? "bg-blue-100 text-blue-800"
                                    : notification.status === "enviada"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                }
                              >
                                {notification.status === "agendada"
                                  ? "📅 Agendada"
                                  : notification.status === "enviada"
                                    ? "✅ Enviada"
                                    : "⏳ Pendente"}
                              </Badge>
                              <span className="font-medium">
                                {notification.clientName}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                via{" "}
                                {notification.type === "whatsapp"
                                  ? "📱 WhatsApp"
                                  : "📧 Email"}
                              </span>
                            </div>

                            <div className="text-sm text-muted-foreground">
                              <p>
                                <strong>Fatura:</strong>{" "}
                                {notification.invoiceId}
                              </p>
                              {notification.isScheduled &&
                                notification.scheduledDate && (
                                  <p>
                                    <strong>Agendado para:</strong>{" "}
                                    {new Date(
                                      notification.scheduledDate,
                                    ).toLocaleDateString("pt-BR")}{" "}
                                    às {notification.scheduledTime}
                                  </p>
                                )}
                              <p>
                                <strong>Criado em:</strong>{" "}
                                {notification.createdAt.toLocaleString("pt-BR")}
                              </p>
                            </div>

                            <div className="bg-muted/30 p-3 rounded text-sm">
                              <p className="font-medium mb-1">Mensagem:</p>
                              <p className="whitespace-pre-wrap line-clamp-3">
                                {notification.message.substring(0, 200)}...
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleEditNotification(notification)
                              }
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Expandir/colapsar mensagem
                                alert(
                                  `Mensagem completa:\n\n${notification.message}`,
                                );
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDeleteNotification(notification.id)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Nenhuma notificação encontrada
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      As notificações enviadas para clientes aparecerão aqui
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium">📅 Agendadas</h4>
                        <p className="text-sm text-muted-foreground">
                          Notificações programadas para envio futuro
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium">✅ Enviadas</h4>
                        <p className="text-sm text-muted-foreground">
                          Notificações já enviadas aos clientes
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium">⏳ Pendentes</h4>
                        <p className="text-sm text-muted-foreground">
                          Notificações aguardando processamento
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Importação de Cobranças */}
        <ImportBillingModal
          open={showImportModal}
          onOpenChange={setShowImportModal}
          onImport={handleImportBilling}
        />

        {/* Modal de Visualização de Fatura */}
        <InvoiceViewDialog
          invoice={viewingInvoice}
          open={showViewDialog}
          onOpenChange={setShowViewDialog}
          onEdit={handleEditInvoice}
          onDelete={handleDeleteInvoice}
          onNotify={handleNotificarCliente}
          onUpdateStatus={handleUpdateInvoiceStatus}
          onSendNotification={handleSendNotification}
          onSaveInvoice={handleSaveInvoice}
        />

        {/* Modal de Nova Fatura */}
        <NewInvoiceModal
          open={showNewInvoiceModal}
          onOpenChange={setShowNewInvoiceModal}
          onSubmit={handleCreateInvoice}
        />

        {/* Modal de Visualização de Cliente */}
        <ClientViewDialog
          client={viewingClient}
          open={showClientViewDialog}
          onOpenChange={setShowClientViewDialog}
        />
      </div>
    </DashboardLayout>
  );
}
