/**
 * COMPONENTE - MODAL DE EDIÇÃO DE FATURA
 * =====================================
 *
 * Modal para editar informações de uma fatura existente
 */

import React, { useState, useEffect } from "react";
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit,
  Save,
  User,
  DollarSign,
  Calendar,
  FileText,
  AlertTriangle,
} from "lucide-react";

interface InvoiceEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: any;
  onSaveInvoice: (invoiceData: any) => void;
}

export function InvoiceEditModal({ 
  open, 
  onOpenChange, 
  invoice, 
  onSaveInvoice 
}: InvoiceEditModalProps) {
  
  const [formData, setFormData] = useState({
    clienteNome: "",
    clienteEmail: "",
    clienteTelefone: "",
    numeroFatura: "",
    valor: "",
    descricao: "",
    servicoPrestado: "",
    dataVencimento: "",
    observacoes: "",
    urgencia: "media"
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Preencher formulário quando fatura for carregada
  useEffect(() => {
    if (invoice && open) {
      setFormData({
        clienteNome: invoice.clienteNome || "",
        clienteEmail: invoice.clienteEmail || "",
        clienteTelefone: invoice.clienteTelefone || "",
        numeroFatura: invoice.numeroFatura || "",
        valor: invoice.valor?.toString() || "",
        descricao: invoice.descricao || "",
        servicoPrestado: invoice.servicoPrestado || "",
        dataVencimento: invoice.dataVencimento ? 
          new Date(invoice.dataVencimento).toISOString().split('T')[0] : "",
        observacoes: invoice.observacoes || "",
        urgencia: invoice.urgencia || "media"
      });
      setErrors({});
    }
  }, [invoice, open]);

  const handleInputChange = (field: string, value: string) => {
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
    
    if (!formData.clienteEmail.trim()) {
      newErrors.clienteEmail = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.clienteEmail)) {
      newErrors.clienteEmail = 'Email inválido';
    }
    
    if (!formData.clienteTelefone.trim()) {
      newErrors.clienteTelefone = 'Telefone é obrigatório';
    }
    
    if (!formData.numeroFatura.trim()) {
      newErrors.numeroFatura = 'Número da fatura é obrigatório';
    }
    
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      newErrors.valor = 'Valor deve ser maior que zero';
    }
    
    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }
    
    if (!formData.servicoPrestado.trim()) {
      newErrors.servicoPrestado = 'Serviço prestado é obrigatório';
    }
    
    if (!formData.dataVencimento) {
      newErrors.dataVencimento = 'Data de vencimento é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const updatedInvoice = {
      ...invoice,
      clienteNome: formData.clienteNome,
      clienteEmail: formData.clienteEmail,
      clienteTelefone: formData.clienteTelefone,
      numeroFatura: formData.numeroFatura,
      valor: parseFloat(formData.valor),
      descricao: formData.descricao,
      servicoPrestado: formData.servicoPrestado,
      dataVencimento: new Date(formData.dataVencimento),
      observacoes: formData.observacoes,
      urgencia: formData.urgencia,
      atualizadoEm: new Date()
    };

    onSaveInvoice(updatedInvoice);
    onOpenChange(false);
  };

  const formatCurrency = (value: string) => {
    if (!value) return "";
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return "";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numericValue);
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="h-5 w-5 text-primary" />
            <span>Editar Fatura - {invoice.numeroFatura}</span>
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
                <Label htmlFor="clienteNome">Nome do Cliente *</Label>
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
                <Label htmlFor="clienteEmail">Email *</Label>
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
                <Label htmlFor="clienteTelefone">Telefone/WhatsApp *</Label>
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
                <Label htmlFor="numeroFatura">Número da Fatura *</Label>
                <Input
                  id="numeroFatura"
                  value={formData.numeroFatura}
                  onChange={(e) => handleInputChange('numeroFatura', e.target.value)}
                  className={`font-mono ${errors.numeroFatura ? 'border-red-500' : ''}`}
                />
                {errors.numeroFatura && (
                  <p className="text-red-500 text-xs">{errors.numeroFatura}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor">Valor *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="valor"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => handleInputChange('valor', e.target.value)}
                    placeholder="0,00"
                    className={`pl-10 ${errors.valor ? 'border-red-500' : ''}`}
                  />
                </div>
                {formData.valor && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(formData.valor)}
                  </p>
                )}
                {errors.valor && (
                  <p className="text-red-500 text-xs">{errors.valor}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataVencimento">Data de Vencimento *</Label>
                <Input
                  id="dataVencimento"
                  type="date"
                  value={formData.dataVencimento}
                  onChange={(e) => handleInputChange('dataVencimento', e.target.value)}
                  className={errors.dataVencimento ? 'border-red-500' : ''}
                />
                {errors.dataVencimento && (
                  <p className="text-red-500 text-xs">{errors.dataVencimento}</p>
                )}
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

          <Separator />

          {/* Ações */}
          <div className="flex justify-between">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span>Campos marcados com * são obrigatórios</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
