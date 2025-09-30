/**
 * TIPOS - MÓDULO DE PUBLICAÇÕES
 * =============================
 *
 * Tipos TypeScript para o sistema de Publicações.
 * Inclui definições para publicações, status e filtros.
 *
 * IMPORTANTE PARA O BACKEND:
 * =========================
 *
 * STATUS WORKFLOW:
 * 1. 'nova' - Status inicial de todas as publicações vindas da API
 * 2. 'pendente' - Automaticamente setado quando usuário visualiza uma publicação 'nova'
 * 3. 'atribuida' - Setado quando uma tarefa é atribuída a um membro da equipe
 * 4. 'finalizada' - Quando o processo é concluído
 * 5. 'descartada' - Quando a publicação é descartada
 *
 * REGRAS DE NEGÓCIO:
 * - Nova publicação da API = status 'nova'
 * - Ao clicar para visualizar publicação 'nova' = mudar para 'pendente'
 * - Status 'atribuida' só aparece quando tarefa é atribuída a alguém
 * - Sistema de notificações para membros quando recebem atribuições
 */

export type PublicationStatus = 'nova' | 'pendente' | 'atribuida' | 'finalizada' | 'descartada';

export interface Publication {
  id: string;
  dataPublicacao: Date;
  processo: string;
  diario: string;
  varaComarca: string;
  nomePesquisado: string;
  status: PublicationStatus;
  conteudo?: string;
  observacoes?: string;
  responsavel?: string;
  dataAtualizacao?: Date;
  numeroProcesso?: string;
  cliente?: string;
  urgencia?: 'baixa' | 'media' | 'alta';
  tags?: string[];
  // BACKEND: Campos para sistema de atribuição
  atribuidoPara?: TeamMember; // Membro da equipe responsável
  dataAtribuicao?: Date; // Quando foi atribuído
  tarefasVinculadas?: string[]; // IDs das tarefas vinculadas
}

/**
 * SISTEMA DE ATRIBUIÇÃO - PARA BACKEND
 * ===================================
 *
 * Cada tenant possui múltiplos membros da equipe.
 * Exemplo de estrutura de membros por tenant:
 * - Dr. Silva (Gerente)
 * - Dra. Costa (Financeiro)
 * - Ana (Atendimento)
 * - Carlos (Estagiário)
 *
 * FUNCIONALIDADES NECESSÁRIAS:
 * 1. API para listar membros do tenant atual
 * 2. Sistema de notificações quando publicação é atribuída
 * 3. Filtro por responsável nas listagens
 * 4. Histórico de atribuições
 */
export interface TeamMember {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  avatar?: string;
  ativo: boolean;
}

export interface PublicationFilters {
  status?: PublicationStatus[];
  dataInicio?: Date;
  dataFim?: Date;
  processo?: string;
  diario?: string;
  varaComarca?: string;
  nomePesquisado?: string;
  responsavel?: string;
  urgencia?: ('baixa' | 'media' | 'alta')[];
}

export interface PublicationSearchParams {
  cliente?: string;
  numeroProcesso?: string;
  nomePessoa?: string;
  dataInicio?: Date;
  dataFim?: Date;
}

export interface ClienteProcesso {
  id: string;
  nome: string;
  numeroProcesso: string;
  varaComarca: string;
  status: string;
  dataInicio: Date;
  ultimaMovimentacao?: Date;
  observacoes?: string;
}

// Estatísticas do módulo
export interface PublicationStats {
  total: number;
  descartadas: number;
  atribuidas: number;
  finalizadas: number;
  pendentes: number;
  porcentagemConcluidas: number;
}

// Formato para exibição nas tabelas
export interface PublicationTableItem extends Publication {
  dataPublicacaoFormatted: string;
  statusFormatted: {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    color: string;
  };
}

/**
 * INTEGRAÇÃO COM MÓDULO DE TAREFAS - PARA BACKEND
 * ==============================================
 *
 * O botão "Gerenciamentos" na página de detalhes da publicação
 * deve permitir criar tarefas vinculadas à publicação.
 *
 * FUNCIONALIDADES NECESSÁRIAS:
 * 1. Dropdown com opção "+ Adicionar Tarefa"
 * 2. Usar o mesmo formulário do módulo de Tarefas
 * 3. Vincular tarefa criada à publicação (campo tarefasVinculadas)
 * 4. Quando tarefa é atribuída a alguém, status da publicação vira 'atribuida'
 * 5. Mostrar tarefas vinculadas na página de detalhes
 *
 * ESTRUTURA DA TAREFA VINCULADA:
 */
export interface PublicationTask {
  id: string;
  publicacaoId: string;
  titulo: string;
  descricao?: string;
  prazo?: Date;
  prioridade: 'baixa' | 'media' | 'alta';
  responsavel?: TeamMember;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  dataCriacao: Date;
  dataAtualizacao?: Date;
}
