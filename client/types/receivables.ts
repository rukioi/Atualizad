/**
 * TIPOS - MÓDULO DE GESTÃO DE RECEBÍVEIS
 * =====================================
 * 
 * Sistema completo para gestão de pagamentos, faturas e automações.
 * Integra com Stripe (pagamentos), n8n (automação) e WhatsApp (comunicação).
 * 
 * IMPORTANTE PARA O BACKEND:
 * =========================
 * 
 * INTEGRAÇÕES NECESSÁRIAS:
 * 1. STRIPE API - Processamento de pagamentos e webhooks
 * 2. N8N API - Automação de workflows e chatbot
 * 3. WHATSAPP BUSINESS API - Envio de mensagens automáticas
 * 4. CRON JOBS - Verificação diária de vencimentos (executar às 09:00)
 * 
 * WORKFLOW DE AUTOMAÇÃO:
 * 1. Sistema verifica diariamente faturas próximas do vencimento (3 dias)
 * 2. Dispara webhook para n8n com dados da fatura e cliente
 * 3. n8n processa e envia mensagem WhatsApp com link de pagamento
 * 4. Cliente clica no link e é direcionado para Stripe Checkout
 * 5. Webhook do Stripe confirma pagamento e atualiza status no sistema
 */

export type InvoiceStatus =
  | 'nova'         // Status inicial de todas as faturas vindas da API
  | 'pendente'     // Fatura criada, aguardando pagamento
  | 'atribuida'    // Fatura atribuída a um responsável
  | 'paga'         // Pagamento confirmado
  | 'vencida'      // Passou da data de vencimento
  | 'cancelada'    // Fatura cancelada
  | 'processando'; // Pagamento em processamento

export type NotificationStatus = 
  | 'nao_enviada'  // Notificação ainda não foi enviada
  | 'agendada'     // Notificação agendada para envio
  | 'enviada'      // Notificação enviada com sucesso
  | 'falhou'       // Falha no envio da notificação
  | 'lida';        // Cliente visualizou a mensagem

export type PaymentMethod = 
  | 'credit_card'
  | 'debit_card' 
  | 'bank_transfer'
  | 'pix'
  | 'boleto';

/**
 * ESTRUTURA PRINCIPAL - FATURA
 * ============================
 * 
 * Representa uma fatura no sistema com todos os dados necessários
 * para cobrança, pagamento e automação.
 */
export interface Invoice {
  id: string;
  clienteId: string;
  numeroFatura: string;
  
  // Dados financeiros
  valor: number;
  descricao: string;
  servicoPrestado: string;
  
  // Datas importantes
  dataEmissao: Date;
  dataVencimento: Date;
  dataPagamento?: Date;
  
  // Status e controle
  status: InvoiceStatus;
  tentativasCobranca: number;
  
  // Integração Stripe
  stripeInvoiceId?: string;
  stripeCustomerId?: string;
  stripePaymentIntentId?: string;
  linkPagamento?: string;
  
  // Integração n8n/WhatsApp
  webhookN8nId?: string;
  ultimaNotificacao?: Date;
  proximaNotificacao?: Date;
  
  // Recorrência
  recorrente: boolean;
  intervaloDias?: number; // Padrão: 30 dias
  proximaFaturaData?: Date;
  
  // Metadados
  criadoPor: string;
  criadoEm: Date;
  atualizadoEm: Date;
  observacoes?: string;
}

/**
 * CLIENTE COM DADOS DE COBRANÇA
 * =============================
 * 
 * Extensão dos dados do cliente para incluir informações
 * específicas de cobrança e pagamento.
 */
export interface ClienteCobranca {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  whatsapp?: string;
  
  // Dados de cobrança
  enderecoCobranca: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  
  // Integração Stripe
  stripeCustomerId?: string;
  
  // Preferências de comunicação
  receberWhatsApp: boolean;
  receberEmail: boolean;
  horaPreferencialNotificacao?: string; // Ex: "14:00"
  
  // Histórico
  totalFaturado: number;
  totalPago: number;
  faturasPendentes: number;
  ultimoPagamento?: Date;
  
  // Status do cliente
  ativo: boolean;
  bloqueado: boolean;
  motivoBloqueio?: string;
}

/**
 * NOTIFICAÇÃO AUTOMÁTICA
 * ======================
 * 
 * Controla o envio de notificações automáticas para clientes.
 */
export interface NotificacaoAutomatica {
  id: string;
  faturaId: string;
  clienteId: string;
  
  // Tipo e conteúdo
  tipo: 'lembrete_3_dias' | 'lembrete_1_dia' | 'vencimento_hoje' | 'atraso';
  canal: 'whatsapp' | 'email' | 'sms';
  conteudo: string;
  
  // Agendamento
  dataAgendada: Date;
  dataEnviada?: Date;
  status: NotificationStatus;
  
  // Integração
  n8nWorkflowId?: string;
  whatsappMessageId?: string;
  respostaCliente?: string;
  
  // Controle
  tentativasEnvio: number;
  ultimaFalha?: string;
  criadoEm: Date;
}

/**
 * PAGAMENTO
 * =========
 * 
 * Registra informações detalhadas sobre pagamentos realizados.
 */
export interface Pagamento {
  id: string;
  faturaId: string;
  clienteId: string;
  
  // Dados do pagamento
  valor: number;
  valorTaxa: number; // Taxa do Stripe
  valorLiquido: number;
  metodoPagamento: PaymentMethod;
  
  // Datas
  dataPagamento: Date;
  dataConfirmacao: Date;
  
  // Integração Stripe
  stripePaymentId: string;
  stripeChargeId?: string;
  stripeFee: number;
  
  // Status
  status: 'confirmado' | 'pendente' | 'falhou' | 'estornado';
  
  // Metadados
  observacoes?: string;
  criadoEm: Date;
}

/**
 * CONFIGURAÇÃO DE AUTOMAÇÃO
 * =========================
 * 
 * Define regras para automação de cobranças e notificações.
 */
export interface ConfiguracaoAutomacao {
  id: string;
  
  // Configurações de notificação
  diasAntesVencimento: number; // Padrão: 3 dias
  horarioEnvio: string; // Padrão: "09:00"
  
  // Mensagens personalizadas
  mensagemLembrete3Dias: string;
  mensagemLembrete1Dia: string;
  mensagemVencimentoHoje: string;
  mensagemAtraso: string;
  
  // Integrações
  webhookN8nUrl: string;
  stripeWebhookSecret: string;
  whatsappApiToken?: string;
  
  // Configurações de recorrência
  intervaloCobrancaPadrao: number; // Padrão: 30 dias
  maxTentativasCobranca: number; // Padrão: 3
  
  // Status
  ativo: boolean;
  criadoPor: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * DASHBOARD - ESTATÍSTICAS
 * ========================
 * 
 * Dados para exibição no dashboard principal.
 */
export interface DashboardRecebiveis {
  // Contadores principais
  faturasPagas: number;
  faturasPendentes: number;
  faturasVencidas: number;
  faturasProximoVencimento: number; // 3 dias
  
  // Valores financeiros
  valorTotal: number;
  valorPago: number;
  valorPendente: number;
  valorVencido: number;
  
  // Estatísticas do período
  novosClientes: number;
  taxaCobranças: number; // Percentual de cobranças bem-sucedidas
  tempoMedioPagamento: number; // Em dias
  
  // Próximas ações
  notificacoesAgendadas: number;
  faturas3Dias: Invoice[];
  faturasVencidas: Invoice[];
  
  // Performance
  faturamentoMensal: number;
  crescimentoMensal: number; // Percentual
  clientesAtivos: number;
}

/**
 * FILTROS E BUSCA
 * ===============
 * 
 * Filtros para listagens e relatórios.
 */
export interface FiltrosRecebiveis {
  status?: InvoiceStatus[];
  dataInicio?: Date;
  dataFim?: Date;
  clienteId?: string;
  valorMin?: number;
  valorMax?: number;
  metodoPagamento?: PaymentMethod[];
  recorrente?: boolean;
  vencimentoEm?: number; // Próximos X dias
}

/**
 * WEBHOOK PAYLOAD - N8N
 * =====================
 * 
 * Estrutura de dados enviada para n8n para automação.
 */
export interface WebhookN8nPayload {
  evento: 'lembrete_pagamento' | 'pagamento_confirmado' | 'fatura_vencida';
  fatura: {
    id: string;
    numero: string;
    valor: number;
    vencimento: string;
    linkPagamento: string;
  };
  cliente: {
    id: string;
    nome: string;
    whatsapp: string;
    email: string;
  };
  configuracao: {
    diasAntesVencimento: number;
    mensagem: string;
    horarioEnvio: string;
  };
  metadata: {
    tentativa: number;
    ultimaNotificacao?: string;
  };
}

/**
 * RELATÓRIOS
 * ==========
 * 
 * Estruturas para geração de relatórios detalhados.
 */
export interface RelatorioRecebiveis {
  periodo: {
    inicio: Date;
    fim: Date;
  };
  resumo: {
    totalFaturado: number;
    totalRecebido: number;
    taxaCobranca: number;
    tempoMedioPagamento: number;
  };
  detalhamento: {
    faturasEmitidas: number;
    faturasVencidas: number;
    clientesAtivos: number;
    notificacoesEnviadas: number;
  };
  topClientes: {
    clienteId: string;
    nomeCliente: string;
    valorTotal: number;
    faturasPagas: number;
  }[];
}
