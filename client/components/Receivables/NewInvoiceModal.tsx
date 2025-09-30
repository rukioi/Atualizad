/**
 * COMPONENTE - MODAL DE NOVA FATURA
 * =================================
 *
 * Modal para criar novas faturas no sistema de Gestão de Recebíveis.
 * Faturas com parcelas são automaticamente consideradas recorrentes.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  User,
  Phone,
  Mail,
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface NewInvoiceData {
  clienteNome: string;
  clienteEmail: string;
  clienteTelefone: string;
  numeroFatura: string;
  valor: number;
  descricao: string;
  servicoPrestado: string;
  dataVencimento: string;
  parcelas: number;
  observacoes: string;
  urgencia: 'baixa' | 'media' | 'alta';
}

interface NewInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (invoice: any) => void;
}

export function NewInvoiceModal({ open, onOpenChange, onSubmit }: NewInvoiceModalProps) {
  const [formData, setFormData] = useState<NewInvoiceData>({
    clienteNome: '',
    clienteEmail: '',
    clienteTelefone: '',
    numeroFatura: `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
    valor: 0,
    descricao: '',
    servicoPrestado: '',
    dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias
    parcelas: 1,
    observacoes: '',
    urgencia: 'media',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof NewInvoiceData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro quando usuário corrigir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.clienteNome.trim()) {
      newErrors.clienteNome = 'Nome do cliente é obrigatório';
    }
    
    if (!formData.clienteTelefone.trim()) {
      newErrors.clienteTelefone = 'Telefone é obrigatório para notificações';
    }
    
    if (!formData.clienteEmail.trim()) {
      newErrors.clienteEmail = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.clienteEmail)) {
      newErrors.clienteEmail = 'Email inválido';
    }
    
    if (formData.valor <= 0) {
      newErrors.valor = 'Valor deve ser maior que zero';
    }
    
    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }
    
    if (!formData.servicoPrestado.trim()) {
      newErrors.servicoPrestado = 'Serviço prestado é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    // Criar fatura(s)
    const baseInvoice = {
      id: `new_${Date.now()}`,
      clienteId: `cliente_${Date.now()}`,
      numeroFatura: formData.numeroFatura,
      valor: formData.parcelas > 1 ? formData.valor / formData.parcelas : formData.valor,
      descricao: formData.descricao,
      servicoPrestado: formData.servicoPrestado,
      dataEmissao: new Date(),
      dataVencimento: new Date(formData.dataVencimento),
      status: 'nova' as const,
      tentativasCobranca: 0,
      recorrente: formData.parcelas > 1, // Faturas com parcelas são recorrentes
      intervaloDias: 30,
      criadoPor: 'Usuário Atual',
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      observacoes: formData.observacoes,
      urgencia: formData.urgencia,
      // Dados do cliente
      clienteNome: formData.clienteNome,
      clienteEmail: formData.clienteEmail,
      clienteTelefone: formData.clienteTelefone,
    };

    if (formData.parcelas > 1) {
      // Criar múltiplas faturas para parcelas
      const faturas = [];
      for (let i = 0; i < formData.parcelas; i++) {
        const dataVencimento = new Date(formData.dataVencimento);
        dataVencimento.setMonth(dataVencimento.getMonth() + i);
        
        faturas.push({
          ...baseInvoice,
          id: `${baseInvoice.id}_parcela_${i + 1}`,
          numeroFatura: `${formData.numeroFatura}-${i + 1}/${formData.parcelas}`,
          dataVencimento,
          descricao: `${formData.descricao} - Parcela ${i + 1}/${formData.parcelas}`,
          proximaFaturaData: i < formData.parcelas - 1 ? new Date(dataVencimento.getTime() + 30 * 24 * 60 * 60 * 1000) : undefined,
          parcela: {
            numero: i + 1,
            total: formData.parcelas,
          }
        });
      }
      onSubmit(faturas);
    } else {
      onSubmit([baseInvoice]);
    }

    // Reset form
    setFormData({
      clienteNome: '',
      clienteEmail: '',
      clienteTelefone: '',
      numeroFatura: `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      valor: 0,
      descricao: '',
      servicoPrestado: '',
      dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      parcelas: 1,
      observacoes: '',
      urgencia: 'media',
    });
    setErrors({});
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getUrgencyColor = (urgencia: string) => {
    switch (urgencia) {
      case 'alta': return 'text-red-600';
      case 'media': return 'text-yellow-600';
      case 'baixa': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-primary" />
            <span>Nova Fatura - Sistema de Recebíveis</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dados do Cliente */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Dados do Cliente</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clienteNome">
                  Nome do Cliente *
                </Label>
                <Input
                  id="clienteNome"
                  value={formData.clienteNome}
                  onChange={(e) => handleInputChange('clienteNome', e.target.value)}
                  placeholder="Nome completo do cliente"
                  className={errors.clienteNome ? 'border-red-500' : ''}
                />
                {errors.clienteNome && (
                  <p className="text-red-500 text-xs">{errors.clienteNome}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clienteEmail">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email *
                </Label>
                <Input
                  id="clienteEmail"
                  type="email"
                  value={formData.clienteEmail}
                  onChange={(e) => handleInputChange('clienteEmail', e.target.value)}
                  placeholder="cliente@email.com"
                  className={errors.clienteEmail ? 'border-red-500' : ''}
                />
                {errors.clienteEmail && (
                  <p className="text-red-500 text-xs">{errors.clienteEmail}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="clienteTelefone">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Telefone/WhatsApp *
                </Label>
                <Input
                  id="clienteTelefone"
                  value={formData.clienteTelefone}
                  onChange={(e) => handleInputChange('clienteTelefone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  className={errors.clienteTelefone ? 'border-red-500' : ''}
                />
                {errors.clienteTelefone && (
                  <p className="text-red-500 text-xs">{errors.clienteTelefone}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Dados da Fatura */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Dados da Fatura</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numeroFatura">Número da Fatura</Label>
                <Input
                  id="numeroFatura"
                  value={formData.numeroFatura}
                  onChange={(e) => handleInputChange('numeroFatura', e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Valor Total *
                </Label>
                <Input
                  id="valor"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => handleInputChange('valor', parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className={errors.valor ? 'border-red-500' : ''}
                />
                {errors.valor && (
                  <p className="text-red-500 text-xs">{errors.valor}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="parcelas">Quantidade de Parcelas</Label>
                <Select
                  value={formData.parcelas.toString()}
                  onValueChange={(value) => handleInputChange('parcelas', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        {num === 1 ? '1x (À vista)' : `${num}x de ${formData.valor > 0 ? formatCurrency(formData.valor / num) : 'R$ 0,00'}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataVencimento">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Data de Vencimento *
                </Label>
                <Input
                  id="dataVencimento"
                  type="date"
                  value={formData.dataVencimento}
                  onChange={(e) => handleInputChange('dataVencimento', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgencia">Urgência</Label>
                <Select
                  value={formData.urgencia}
                  onValueChange={(value) => handleInputChange('urgencia', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">🟢 Baixa</SelectItem>
                    <SelectItem value="media">🟡 Média</SelectItem>
                    <SelectItem value="alta">🔴 Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="servicoPrestado">Serviço Prestado *</Label>
                <Input
                  id="servicoPrestado"
                  value={formData.servicoPrestado}
                  onChange={(e) => handleInputChange('servicoPrestado', e.target.value)}
                  placeholder="Ex: Consultoria Jurídica, Elaboração de Contrato..."
                  className={errors.servicoPrestado ? 'border-red-500' : ''}
                />
                {errors.servicoPrestado && (
                  <p className="text-red-500 text-xs">{errors.servicoPrestado}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descricao">Descrição *</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => handleInputChange('descricao', e.target.value)}
                  placeholder="Descrição detalhada do serviço prestado..."
                  className={errors.descricao ? 'border-red-500' : ''}
                />
                {errors.descricao && (
                  <p className="text-red-500 text-xs">{errors.descricao}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => handleInputChange('observacoes', e.target.value)}
                  placeholder="Observações adicionais (opcional)..."
                />
              </div>
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Resumo da Fatura</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Valor Total:</span>
                <div className="font-bold text-green-600">{formatCurrency(formData.valor)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Parcelas:</span>
                <div className="font-semibold">{formData.parcelas}x</div>
              </div>
              <div>
                <span className="text-muted-foreground">Valor por Parcela:</span>
                <div className="font-bold text-blue-600">
                  {formatCurrency(formData.valor / formData.parcelas)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Urgência:</span>
                <div className={`font-semibold ${getUrgencyColor(formData.urgencia)}`}>
                  {formData.urgencia.toUpperCase()}
                </div>
              </div>
            </div>
            
            {formData.parcelas > 1 && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center space-x-2 text-blue-600">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm font-medium">Fatura Recorrente</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.parcelas} faturas serão criadas automaticamente, uma a cada 30 dias
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex justify-between">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span>Campos marcados com * são obrigatórios</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Criar Fatura{formData.parcelas > 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
