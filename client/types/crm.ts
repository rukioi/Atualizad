export interface Client {
  id: string;
  name: string;
  organization?: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  address?: string;
  city: string;
  zipCode?: string;
  budget?: number;
  currency: 'BRL' | 'USD' | 'EUR';
  level?: string;
  tags: string[];
  description?: string;
  image?: string;

  // Legal fields specific to Brazil
  cpf?: string;
  rg?: string;
  pis?: string;
  cei?: string;
  professionalTitle?: string;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'separated';
  birthDate?: string;
  inssStatus?: 'active' | 'inactive' | 'retired' | 'pensioner';

  // Financial fields
  amountPaid?: number;
  referredBy?: string;
  registeredBy?: string;

  // Audit fields
  status: 'active' | 'inactive' | 'pending';
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  title: string;
  contactName: string;
  organization?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  budget: number;
  currency: string;
  stage: DealStage;
  tags: string[];
  description?: string;
  image?: string;
  clientId?: string;
  referredBy?: string;
  registeredBy?: string;
  registered_by?: string; // Nome do usuário que cadastrou
  createdAt: string;
  updatedAt: string;
}

// SISTEMA SIMPLIFICADO: Apenas 4 estágios conforme solicitado
export type DealStage =
  | 'contacted'     // Em Contato
  | 'proposal'      // Com Proposta
  | 'won'           // Cliente Bem Sucedido
  | 'lost';         // Cliente Perdido

  // REMOVIDOS: 'opportunity', 'advanced', 'general' conforme solicitação

export interface PipelineStage {
  id: DealStage;
  name: string;
  color: string;
  deals: Deal[];
}

export interface ClientLevel {
  id: string;
  name: string;
  color: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}