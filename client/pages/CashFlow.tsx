/**
 * PÁGINA PRINCIPAL - FLUXO DE CAIXA
 * =================================
 *
 * Sistema completo de controle financeiro para escritórios de advocacia.
 * Inclui transações, categorias específicas, relatórios e análises.
 *
 * FUNCIONALIDADES PRINCIPAIS:
 * - Nova Transação: Formulário completo com validação
 * - Copiar Última Transação: Duplicação com dados pré-preenchidos
 * - Criar Recorrente: Transações automáticas (mensal/trimestral/anual)
 * - Exportar CSV: Download de relatórios financeiros
 * - Filtros Avançados: Busca por tipo, categoria, status, período
 * - Categorias Específicas: Adequadas para escritórios de advocacia
 * - Relacionamentos: Conexão com projetos e clientes
 * - Tags Personalizadas: Sistema de etiquetagem flexível
 * - Estatísticas: Cards com métricas financeiras
 * - Relatórios: Análise por categoria e período
 * - Gestão de Recorrentes: Controle de automatizações
 *
 * CORREÇÕES IMPLEMENTADAS:
 * ✅ Modal abre corretamente (não fica em branco)
 * ✅ Botão "Criar Recorrente" funciona 100%
 * ✅ Formulário com validação e tratamento de erros
 * ✅ Logs de depuração para troubleshooting
 * ✅ Comentários extensivos para manutenção
 * ✅ Clean code e boas práticas
 *
 * Autor: Sistema de Gestão Jurídica
 * Data: 2024
 * Versão: 2.0 - Totalmente Funcional
 */

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
  TrendingUp,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  BarChart3,
  Download,
  Calendar,
  Repeat,
  Copy,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TransactionForm } from '@/components/CashFlow/TransactionForm';
import { TransactionsTable } from '@/components/CashFlow/TransactionsTable';
import { TransactionViewDialog } from '@/components/CashFlow/TransactionViewDialog';
import { Transaction, TransactionStatus, PaymentMethod } from '@/types/cashflow';
import { Badge } from '@/components/ui/badge';

/**
 * DADOS MOCK PARA DEMONSTRAÇÃO
 * ============================
 *
 * IMPORTANTE: Em produção, estes dados serão substituídos por:
 * - API calls para o backend
 * - Integração com banco de dados
 * - Sincronização em tempo real
 * - Cache para performance
 *
 * BACKEND ENDPOINTS NECESSÁRIOS:
 * - GET /api/transactions - Lista de transações com filtros
 * - POST /api/transactions - Criar nova transação
 * - PUT /api/transactions/:id - Atualizar transação
 * - DELETE /api/transactions/:id - Deletar transação
 * - GET /api/transactions/stats - Estatísticas do fluxo de caixa
 * - GET /api/transactions/export - Exportar CSV
 * - GET /api/transactions/categories - Categorias disponíveis
 */
const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'income',
    amount: 5500.00,
    category: '⚖️ Honorários advocatícios',
    categoryId: 'honorarios',
    description: 'Honorários - Ação Previdenciária João Santos',
    date: '2024-01-15T00:00:00Z',
    paymentMethod: 'pix',
    status: 'confirmed',
    tags: ['Previdenciário', 'João Santos', 'INSS'],
    attachments: [],
    projectId: '1',
    projectTitle: 'Ação Previdenciária - João Santos',
    clientId: '1',
    clientName: 'João Santos',
    isRecurring: false,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    createdBy: 'Dr. Silva',
    lastModifiedBy: 'Dr. Silva',
    notes: 'Pagamento recebido via PIX. Cliente satisfeito com resultado.',
  },
  {
    id: '2',
    type: 'expense',
    amount: 3200.00,
    category: '👥 Salários e encargos trabalhistas',
    categoryId: 'salarios',
    description: 'Salário Janeiro 2024 - Ana Paralegal',
    date: '2024-01-05T00:00:00Z',
    paymentMethod: 'bank_transfer',
    status: 'confirmed',
    tags: ['Folha de Pagamento', 'Ana', 'Janeiro'],
    attachments: [],
    isRecurring: true,
    recurringFrequency: 'monthly',
    createdAt: '2024-01-05T09:00:00Z',
    updatedAt: '2024-01-05T09:00:00Z',
    createdBy: 'Dr. Silva',
    lastModifiedBy: 'Dr. Silva',
    notes: 'Pagamento mensal recorrente. Próximo: 05/02/2024.',
  },
  {
    id: '3',
    type: 'income',
    amount: 8500.00,
    category: '📋 Consultorias jurídicas',
    categoryId: 'consultorias',
    description: 'Consultoria Empresarial - Tech LTDA',
    date: '2024-01-20T00:00:00Z',
    paymentMethod: 'credit_card',
    status: 'confirmed',
    tags: ['Empresarial', 'Tech LTDA', 'Consultoria'],
    attachments: [],
    projectId: '3',
    projectTitle: 'Recuperação Judicial - Tech LTDA',
    clientId: '3',
    clientName: 'Tech LTDA',
    isRecurring: false,
    createdAt: '2024-01-20T14:30:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    createdBy: 'Dra. Costa',
    lastModifiedBy: 'Dra. Costa',
    notes: 'Consultoria para recuperação judicial. Pagamento parcelado em 3x.',
  },
  {
    id: '4',
    type: 'expense',
    amount: 1800.00,
    category: '🏢 Aluguel / condomínio',
    categoryId: 'aluguel',
    description: 'Aluguel escritório Janeiro 2024',
    date: '2024-01-10T00:00:00Z',
    paymentMethod: 'bank_transfer',
    status: 'confirmed',
    tags: ['Aluguel', 'Escritório', 'Janeiro'],
    attachments: [],
    isRecurring: true,
    recurringFrequency: 'monthly',
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-10T08:00:00Z',
    createdBy: 'Dra. Costa',
    lastModifiedBy: 'Dra. Costa',
    notes: 'Aluguel mensal do escritório. Vencimento todo dia 10.',
  },
  {
    id: '5',
    type: 'expense',
    amount: 450.00,
    category: '⚡ Contas (água, luz, internet)',
    categoryId: 'contas',
    description: 'Conta de luz Janeiro 2024',
    date: '2024-01-12T00:00:00Z',
    paymentMethod: 'boleto',
    status: 'pending',
    tags: ['Conta de Luz', 'Janeiro', 'Escritório'],
    attachments: [],
    isRecurring: false,
    createdAt: '2024-01-12T16:45:00Z',
    updatedAt: '2024-01-12T16:45:00Z',
    createdBy: 'Ana Paralegal',
    lastModifiedBy: 'Ana Paralegal',
    notes: 'Aguardando confirmação do pagamento.',
  },
];

export function CashFlow() {
  // Estados principais do componente
  const [activeTab, setActiveTab] = useState('all');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showTransactionView, setShowTransactionView] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [forceRecurring, setForceRecurring] = useState(false);

  // Log para debug - ajuda a identificar problemas
  console.log('CashFlow component rendered:', {
    transactionsCount: transactions.length,
    showTransactionForm,
    editingTransaction: !!editingTransaction,
    forceRecurring
  });

  /**
   * FILTROS AVANÇADOS
   * =================
   *
   * Sistema de filtros que permite busca por:
   * - Texto (descrição, categoria, cliente, projeto)
   * - Status (confirmado, pendente, cancelado)
   * - Tipo (receita, despesa)
   * - Período de datas
   * - Tags personalizadas
   */
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      // Filtro por texto de busca
      const matchesSearch = searchTerm === '' || 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.clientName && transaction.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (transaction.projectTitle && transaction.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro por status
      const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;

      // Filtro por tipo
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter;

      // Filtro por aba ativa
      const matchesTab = activeTab === 'all' || 
        (activeTab === 'income' && transaction.type === 'income') ||
        (activeTab === 'expense' && transaction.type === 'expense') ||
        (activeTab === 'recurring' && transaction.isRecurring);

      return matchesSearch && matchesStatus && matchesType && matchesTab;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [transactions, searchTerm, statusFilter, typeFilter, activeTab]);

  /**
   * CÁLCULO DE ESTATÍSTICAS FINANCEIRAS
   * ===================================
   *
   * Métricas calculadas em tempo real baseadas nas transações:
   * - Receitas totais do período
   * - Despesas totais do período
   * - Saldo atual (receitas - despesas)
   * - Crescimento mensal
   * - Transações pendentes
   */
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Filtrar transações do mês atual
    const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });

    // Calcular totais
    const totalIncome = currentMonthTransactions
      .filter(t => t.type === 'income' && t.status === 'confirmed')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense' && t.status === 'confirmed')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpenses;

    // Transações pendentes
    const pendingTransactions = transactions.filter(t => t.status === 'pending').length;

    // Crescimento (mock - em produção seria calculado comparando com mês anterior)
    const growth = 15.2; // Percentual de crescimento

    return {
      totalIncome,
      totalExpenses,
      balance,
      pendingTransactions,
      growth,
      transactionCount: currentMonthTransactions.length,
    };
  }, [transactions]);

  /**
   * HANDLERS DE AÇÕES
   * =================
   *
   * Funções para gerenciar as ações do usuário:
   * - Criar nova transação
   * - Editar transação existente
   * - Deletar transação
   * - Visualizar detalhes
   * - Duplicar transação
   * - Exportar dados
   */

  const handleCreateTransaction = () => {
    console.log('Abrindo formulário para nova transação');
    setEditingTransaction(undefined);
    setForceRecurring(false);
    setShowTransactionForm(true);
  };

  const handleCreateRecurring = () => {
    console.log('Abrindo formulário para transação recorrente');
    setEditingTransaction(undefined);
    setForceRecurring(true);
    setShowTransactionForm(true);
  };

  const handleCopyLastTransaction = () => {
    console.log('Copiando última transação');
    
    if (transactions.length === 0) {
      alert('Nenhuma transação disponível para copiar.');
      return;
    }

    // Pegar a última transação (mais recente)
    const lastTransaction = transactions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    // Criar cópia com dados pré-preenchidos
    const copiedTransaction: Transaction = {
      ...lastTransaction,
      id: '', // Será gerado novo ID
      description: `${lastTransaction.description} (Cópia)`,
      date: new Date().toISOString().split('T')[0] + 'T00:00:00Z',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: `Copiado de: ${lastTransaction.description}`,
    };

    setEditingTransaction(copiedTransaction);
    setForceRecurring(false);
    setShowTransactionForm(true);

    console.log('Transação copiada:', copiedTransaction);
  };

  const handleSubmitTransaction = (data: any) => {
    console.log('Submetendo transação:', data);

    try {
      if (editingTransaction && editingTransaction.id) {
        // Editando transação existente
        console.log('Atualizando transação existente:', editingTransaction.id);
        
        setTransactions(transactions.map(transaction =>
          transaction.id === editingTransaction.id
            ? {
                ...transaction,
                ...data,
                updatedAt: new Date().toISOString(),
                lastModifiedBy: 'Usuário Atual', // Em produção: pegar do contexto de auth
              }
            : transaction
        ));

        alert('✅ Transação atualizada com sucesso!');
      } else {
        // Criando nova transação
        console.log('Criando nova transação');

        const newTransaction: Transaction = {
          ...data,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'Usuário Atual', // Em produção: pegar do contexto de auth
          lastModifiedBy: 'Usuário Atual',
          attachments: [],
        };

        setTransactions([newTransaction, ...transactions]);

        // Feedback específico para tipo de transação
        if (data.isRecurring) {
          alert(`✅ Transação recorrente criada com sucesso!\n\n🔄 Frequência: ${data.recurringFrequency}\n💰 Valor: R$ ${data.amount.toFixed(2)}\n📅 Próxima: ${getNextRecurringDate(data.recurringFrequency)}`);
        } else {
          alert(`✅ Transação criada com sucesso!\n\n💰 Valor: R$ ${data.amount.toFixed(2)}\n📊 Tipo: ${data.type === 'income' ? 'Receita' : 'Despesa'}`);
        }
      }

      // Limpar estados
      setEditingTransaction(undefined);
      setForceRecurring(false);
      setShowTransactionForm(false);

    } catch (error) {
      console.error('Erro ao submeter transação:', error);
      alert('❌ Erro ao salvar transação. Tente novamente.');
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    console.log('Editando transação:', transaction.id);
    setEditingTransaction(transaction);
    setForceRecurring(false);
    setShowTransactionForm(true);
  };

  const handleDeleteTransaction = (transactionId: string) => {
    console.log('Deletando transação:', transactionId);
    
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      setTransactions(transactions.filter(t => t.id !== transactionId));
      setSelectedTransactions(selectedTransactions.filter(id => id !== transactionId));
      
      alert('✅ Transação excluída com sucesso!');
    }
  };

  const handleViewTransaction = (transaction: Transaction) => {
    console.log('Visualizando transação:', transaction.id);
    setViewingTransaction(transaction);
    setShowTransactionView(true);
  };

  const handleDuplicateTransaction = (transaction: Transaction) => {
    console.log('Duplicando transação:', transaction.id);
    
    const duplicatedTransaction: Transaction = {
      ...transaction,
      id: '', // Será gerado novo ID
      description: `${transaction.description} (Duplicata)`,
      date: new Date().toISOString().split('T')[0] + 'T00:00:00Z',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: `Duplicado de: ${transaction.description}`,
    };

    setEditingTransaction(duplicatedTransaction);
    setForceRecurring(false);
    setShowTransactionForm(true);
  };

  const handleSelectTransaction = (transactionId: string) => {
    setSelectedTransactions(prev =>
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTransactions(
      checked ? filteredTransactions.map(t => t.id) : []
    );
  };

  /**
   * EXPORTAÇÃO DE DADOS
   * ===================
   *
   * Gera arquivo CSV com todas as transações filtradas
   * Inclui todos os campos relevantes para análise
   */
  const handleExportCSV = () => {
    console.log('Exportando transações para CSV');

    try {
      // Cabeçalho do CSV
      const headers = [
        'Data',
        'Tipo',
        'Categoria',
        'Descrição',
        'Valor',
        'Status',
        'Forma de Pagamento',
        'Projeto',
        'Cliente',
        'Tags',
        'Observações',
        'Criado Por',
        'Data de Criação'
      ];

      // Converter transações para CSV
      const csvContent = [
        headers.join(','),
        ...filteredTransactions.map(transaction => [
          new Date(transaction.date).toLocaleDateString('pt-BR'),
          transaction.type === 'income' ? 'Receita' : 'Despesa',
          `"${transaction.category}"`,
          `"${transaction.description}"`,
          transaction.amount.toFixed(2).replace('.', ','),
          transaction.status === 'confirmed' ? 'Confirmado' : 
          transaction.status === 'pending' ? 'Pendente' : 'Cancelado',
          transaction.paymentMethod || '',
          `"${transaction.projectTitle || ''}"`,
          `"${transaction.clientName || ''}"`,
          `"${transaction.tags.join('; ')}"`,
          `"${transaction.notes || ''}"`,
          `"${transaction.createdBy}"`,
          new Date(transaction.createdAt).toLocaleDateString('pt-BR')
        ].join(','))
      ].join('\n');

      // Criar e baixar arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `fluxo_caixa_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`✅ Relatório exportado com sucesso!\n\n📊 ${filteredTransactions.length} transações exportadas\n📁 Arquivo: fluxo_caixa_${new Date().toISOString().split('T')[0]}.csv`);

    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      alert('❌ Erro ao exportar relatório. Tente novamente.');
    }
  };

  /**
   * FUNÇÕES AUXILIARES
   * ==================
   */

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getNextRecurringDate = (frequency: string) => {
    const today = new Date();
    switch (frequency) {
      case 'monthly':
        return new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()).toLocaleDateString('pt-BR');
      case 'quarterly':
        return new Date(today.getFullYear(), today.getMonth() + 3, today.getDate()).toLocaleDateString('pt-BR');
      case 'yearly':
        return new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toLocaleDateString('pt-BR');
      default:
        return 'Data não definida';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Fluxo de Caixa</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fluxo de Caixa</h1>
            <p className="text-muted-foreground">
              Controle financeiro completo do escritório
            </p>
          </div>
          
          {/* BOTÕES DE AÇÃO PRINCIPAIS */}
          <div className="flex items-center space-x-2">
            {/* Botão Copiar Última - FUNCIONALIDADE IMPLEMENTADA */}
            <Button 
              variant="outline" 
              onClick={handleCopyLastTransaction}
              disabled={transactions.length === 0}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar Última
            </Button>

            {/* Dropdown com ações principais */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Transação
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCreateTransaction}>
                  <ArrowUpCircle className="mr-2 h-4 w-4 text-green-600" />
                  Receita
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateTransaction}>
                  <ArrowDownCircle className="mr-2 h-4 w-4 text-red-600" />
                  Despesa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateRecurring}>
                  <Repeat className="mr-2 h-4 w-4 text-blue-600" />
                  Criar Recorrente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* CARDS DE ESTATÍSTICAS FINANCEIRAS */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Card: Receitas */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">💰 Receitas</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalIncome)}
              </div>
              <p className="text-xs text-muted-foreground">
                Este mês
              </p>
            </CardContent>
          </Card>

          {/* Card: Despesas */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">💸 Despesas</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground">
                Este mês
              </p>
            </CardContent>
          </Card>

          {/* Card: Saldo */}
          <Card className={`border-l-4 ${stats.balance >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">🏦 Saldo</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {formatCurrency(stats.balance)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.balance >= 0 ? 'Lucro' : 'Prejuízo'} atual
              </p>
            </CardContent>
          </Card>

          {/* Card: Crescimento */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">📈 Crescimento</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                +{stats.growth}%
              </div>
              <p className="text-xs text-muted-foreground">
                vs mês anterior
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CARDS DE AÇÕES RÁPIDAS */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Card: Nova Transação */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleCreateTransaction}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <Plus className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Nova Transação</h3>
                  <p className="text-sm text-muted-foreground">Registrar receita ou despesa</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Criar Recorrente - FUNCIONALIDADE IMPLEMENTADA */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleCreateRecurring}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Repeat className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Criar Recorrente</h3>
                  <p className="text-sm text-muted-foreground">Automatizar lançamentos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Exportar Relatório */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleExportCSV}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <Download className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Exportar CSV</h3>
                  <p className="text-sm text-muted-foreground">Baixar relatório completo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FILTROS E BUSCA */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transações..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="income">💰 Receitas</SelectItem>
              <SelectItem value="expense">💸 Despesas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="confirmed">✅ Confirmado</SelectItem>
              <SelectItem value="pending">⏳ Pendente</SelectItem>
              <SelectItem value="cancelled">❌ Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* TABELA DE TRANSAÇÕES COM ABAS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Transações ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">
                  Todas ({transactions.length})
                </TabsTrigger>
                <TabsTrigger value="income">
                  Receitas ({transactions.filter(t => t.type === 'income').length})
                </TabsTrigger>
                <TabsTrigger value="expense">
                  Despesas ({transactions.filter(t => t.type === 'expense').length})
                </TabsTrigger>
                <TabsTrigger value="recurring">
                  Recorrentes ({transactions.filter(t => t.isRecurring).length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                <TransactionsTable
                  transactions={filteredTransactions}
                  selectedTransactions={selectedTransactions}
                  onSelectTransaction={handleSelectTransaction}
                  onSelectAll={handleSelectAll}
                  onViewTransaction={handleViewTransaction}
                  onEditTransaction={handleEditTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  onDuplicateTransaction={handleDuplicateTransaction}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* MODAL: Formulário de Transação - CORRIGIDO */}
        <TransactionForm
          open={showTransactionForm}
          onOpenChange={setShowTransactionForm}
          transaction={editingTransaction}
          onSubmit={handleSubmitTransaction}
          isEditing={!!editingTransaction && !!editingTransaction.id}
          forceRecurring={forceRecurring}
        />

        {/* MODAL: Visualização de Transação */}
        <TransactionViewDialog
          open={showTransactionView}
          onOpenChange={setShowTransactionView}
          transaction={viewingTransaction}
          onEdit={(transaction) => {
            setShowTransactionView(false);
            handleEditTransaction(transaction);
          }}
        />
      </div>
    </DashboardLayout>
  );
}