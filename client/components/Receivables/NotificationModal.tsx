/**
 * COMPONENTE - MODAL DE NOTIFICAÇÃO COM AGENDAMENTO
 * ================================================
 *
 * Modal para enviar notificações para clientes com opção de agendamento
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Calendar,
  Clock,
  Send,
  Edit,
  User,
  Mail,
  Phone,
} from "lucide-react";

interface NotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: any;
  onSendNotification: (notificationData: any) => void;
}

export function NotificationModal({ 
  open, 
  onOpenChange, 
  invoice, 
  onSendNotification 
}: NotificationModalProps) {
  
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notificationType, setNotificationType] = useState("whatsapp");
  const [customMessage, setCustomMessage] = useState("");
  const [isEditingMessage, setIsEditingMessage] = useState(false);

  if (!invoice) return null;

  // Função para formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Mensagem padrão baseada no status da fatura
  const getDefaultMessage = () => {
    const clientName = invoice.clienteNome || "Cliente";
    const invoiceNumber = invoice.numeroFatura;
    const amount = formatCurrency(invoice.valor);
    const dueDate = invoice.dataVencimento.toLocaleDateString('pt-BR');

    return `Olá ${clientName}! 👋

Esta é uma notificação sobre sua fatura:

📄 *Fatura:* ${invoiceNumber}
💰 *Valor:* ${amount}
📅 *Vencimento:* ${dueDate}

${invoice.status === 'pendente' 
  ? '⏰ Sua fatura está próxima do vencimento. Para evitar atraso, efetue o pagamento até a data de vencimento.'
  : invoice.status === 'nova'
  ? '🆕 Nova fatura disponível para pagamento.'
  : '��� Informações sobre sua fatura.'
}

${invoice.linkPagamento 
  ? `💳 *Pagar agora:* ${invoice.linkPagamento}`
  : '📞 Entre em contato conosco para mais informações sobre o pagamento.'
}

Obrigado!
Equipe Financeira`;
  };

  const defaultMessage = getDefaultMessage();
  const displayMessage = isEditingMessage ? customMessage : defaultMessage;

  const handleSendNotification = () => {
    const notificationData = {
      invoiceId: invoice.id,
      clientName: invoice.clienteNome,
      clientEmail: invoice.clienteEmail,
      clientPhone: invoice.clienteTelefone,
      type: notificationType,
      message: isEditingMessage ? customMessage : defaultMessage,
      isScheduled,
      scheduledDate: isScheduled ? scheduledDate : null,
      scheduledTime: isScheduled ? scheduledTime : null,
      createdAt: new Date(),
      status: isScheduled ? 'agendada' : 'enviada'
    };

    onSendNotification(notificationData);
    onOpenChange(false);
    
    // Reset form
    setIsScheduled(false);
    setScheduledDate("");
    setScheduledTime("");
    setCustomMessage("");
    setIsEditingMessage(false);
    setNotificationType("whatsapp");
  };

  const canSend = () => {
    if (isScheduled && (!scheduledDate || !scheduledTime)) {
      return false;
    }
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span>Enviar Notificação ao Cliente</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Cliente */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-medium mb-3 flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Informações do Cliente</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <User className="h-3 w-3 text-muted-foreground" />
                <span><strong>Nome:</strong> {invoice.clienteNome}</span>
              </div>
              {invoice.clienteEmail && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span><strong>Email:</strong> {invoice.clienteEmail}</span>
                </div>
              )}
              {invoice.clienteTelefone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span><strong>Telefone:</strong> {invoice.clienteTelefone}</span>
                </div>
              )}
              <div>
                <span><strong>Fatura:</strong> {invoice.numeroFatura}</span>
              </div>
            </div>
          </div>

          {/* Tipo de Notificação */}
          <div className="space-y-3">
            <Label>Tipo de Notificação</Label>
            <Select value={notificationType} onValueChange={setNotificationType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">📱 WhatsApp</SelectItem>
                <SelectItem value="email">📧 Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Agendamento */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Agendar Envio</Label>
                <p className="text-xs text-muted-foreground">
                  Envie agora ou agende para um horário específico
                </p>
              </div>
              <Switch 
                checked={isScheduled} 
                onCheckedChange={setIsScheduled}
              />
            </div>
            
            {isScheduled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduled-date">Data</Label>
                  <Input
                    id="scheduled-date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="scheduled-time">Horário</Label>
                  <Input
                    id="scheduled-time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Mensagem */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Mensagem</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditingMessage(!isEditingMessage);
                  if (!isEditingMessage) {
                    setCustomMessage(defaultMessage);
                  }
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                {isEditingMessage ? 'Usar Padrão' : 'Editar Mensagem'}
              </Button>
            </div>
            
            {isEditingMessage ? (
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Digite sua mensagem personalizada..."
                className="min-h-40"
              />
            ) : (
              <div className="bg-muted/30 p-4 rounded-lg border">
                <div className="text-sm whitespace-pre-wrap">
                  {defaultMessage}
                </div>
              </div>
            )}
          </div>

          {/* Preview da Notificação */}
          {isScheduled && scheduledDate && scheduledTime && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-200">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Agendamento</span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                A notificação será enviada em {new Date(scheduledDate).toLocaleDateString('pt-BR')} às {scheduledTime}
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSendNotification}
              disabled={!canSend()}
              className="bg-green-600 hover:bg-green-700"
            >
              {isScheduled ? (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Agendar Notificação
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Agora
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
