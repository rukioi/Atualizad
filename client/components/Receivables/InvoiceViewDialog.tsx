/**
 * COMPONENTE - DIALOG DE VISUALIZAÇÃO DE FATURA
 * ============================================
 *
 * Modal para exibir os detalhes completos de uma fatura do sistema de recebíveis.
 * Inclui todas as informações da fatura de forma organizada e funcional.
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NotificationModal } from "./NotificationModal";
import { InvoiceEditModal } from "./InvoiceEditModal";
import {
  Calendar,
  FileText,
  Building2,
  User,
  Clock,
  AlertTriangle,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  MessageSquare,
  ExternalLink,
  Edit,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { Invoice, InvoiceStatus } from "@/types/receivables";

interface InvoiceViewDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  onNotify?: (invoice: Invoice) => void;
  onUpdateStatus?: (invoice: Invoice, newStatus: InvoiceStatus) => void;
  onSendNotification?: (notificationData: any) => void;
  onSaveInvoice?: (invoiceData: any) => void;
}

const getStatusConfig = (status: InvoiceStatus) => {
  const configs = {
    nova: {
      label: "Nova",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      icon: FileText,
    },
    pendente: {
      label: "Pendente",
      className:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      icon: Clock,
    },
    atribuida: {
      label: "Atribuída",
      className:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      icon: User,
    },
    paga: {
      label: "Paga",
      className:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      icon: CheckCircle,
    },
    vencida: {
      label: "Vencida",
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      icon: AlertTriangle,
    },
    cancelada: {
      label: "Cancelada",
      className:
        "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
      icon: FileText,
    },
    processando: {
      label: "Processando",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      icon: CreditCard,
    },
  };

  return (
    configs[status] || {
      label: status,
      className:
        "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
      icon: FileText,
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

export function InvoiceViewDialog({
  invoice,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onNotify,
  onUpdateStatus,
  onSendNotification,
  onSaveInvoice,
}: InvoiceViewDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus>(
    invoice?.status || "nova",
  );
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Sincronizar selectedStatus com o status da fatura quando ela mudar
  useEffect(() => {
    if (invoice?.status) {
      setSelectedStatus(invoice.status);
    }
  }, [invoice?.status]);

  if (!invoice) return null;

  const statusConfig = getStatusConfig(invoice.status);
  const StatusIcon = statusConfig.icon;
  const diasVencimento = calcularDiasVencimento(invoice.dataVencimento);

  const handleStatusChange = (newStatus: InvoiceStatus) => {
    setSelectedStatus(newStatus);
    if (onUpdateStatus) {
      onUpdateStatus(invoice, newStatus);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm(`Deseja realmente excluir a fatura ${invoice.numeroFatura}?`)) {
      if (onDelete) {
        onDelete(invoice);
      }
      // Fechar modal automaticamente após exclusão
      onOpenChange(false);
    }
  };

  const handleOpenNotification = () => {
    setShowNotificationModal(true);
  };

  const handleSendNotification = (notificationData: any) => {
    if (onSendNotification) {
      onSendNotification(notificationData);
    }
    setShowNotificationModal(false);
  };

  const handleOpenEdit = () => {
    setShowEditModal(true);
  };

  const handleSaveInvoice = (invoiceData: any) => {
    if (onSaveInvoice) {
      onSaveInvoice(invoiceData);
    }
    setShowEditModal(false);
  };

  const statusOptions = [
    { value: "nova", label: "Nova" },
    { value: "pendente", label: "Pendente" },
    { value: "processando", label: "Processando" },
    { value: "paga", label: "Paga" },
    { value: "cancelada", label: "Cancelada" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <span>Detalhes da Fatura - {invoice.numeroFatura}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Cabeçalho com Status e Ações */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center space-x-4">
                {isEditing ? (
                  <div className="flex items-center space-x-2">
                    <Select
                      value={selectedStatus}
                      onValueChange={handleStatusChange}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Badge
                      className={`${statusConfig.className} px-3 py-1 flex items-center space-x-1`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      <span>{statusConfig.label}</span>
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      title="Editar Status"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {invoice.recorrente && (
                  <Badge variant="outline" className="text-blue-600">
                    🔄 Recorrente
                  </Badge>
                )}
                {(invoice.status === "pendente" ||
                  invoice.status === "nova") && (
                  <div className="flex items-center space-x-1 text-sm">
                    {diasVencimento < 0 ? (
                      <div className="flex items-center space-x-1 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-semibold">
                          {Math.abs(diasVencimento)} dias em atraso
                        </span>
                      </div>
                    ) : diasVencimento <= 3 ? (
                      <div className="flex items-center space-x-1 text-orange-600">
                        <Clock className="h-4 w-4" />
                        <span className="font-semibold">
                          Vence em {diasVencimento} dias
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        Vence em {diasVencimento} dias
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleOpenEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                {(invoice.status === "pendente" ||
                  invoice.status === "nova") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenNotification}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Notificar
                  </Button>
                )}
                {invoice.linkPagamento && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={invoice.linkPagamento}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir Pagamento
                    </a>
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                )}
              </div>
            </div>

            {/* Informações Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Informações da Fatura
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Número da Fatura</p>
                        <p className="font-mono text-sm text-muted-foreground">
                          {invoice.numeroFatura}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Valor</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(invoice.valor)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Serviço Prestado</p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.servicoPrestado}
                        </p>
                      </div>
                    </div>
                    {invoice.criadoPor && (
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Criado por</p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.criadoPor}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Datas e Prazos
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Data de Emissão</p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.dataEmissao.toLocaleDateString("pt-BR", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          Data de Vencimento
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.dataVencimento.toLocaleDateString("pt-BR", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    {invoice.dataPagamento && (
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-sm font-medium">
                            Data de Pagamento
                          </p>
                          <p className="text-sm text-green-600">
                            {invoice.dataPagamento.toLocaleDateString("pt-BR", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                    {invoice.recorrente && invoice.proximaFaturaData && (
                      <div className="flex items-center space-x-3">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium">
                            Próxima Cobrança
                          </p>
                          <p className="text-sm text-blue-600">
                            {invoice.proximaFaturaData.toLocaleDateString(
                              "pt-BR",
                            )}
                            {invoice.intervaloDias &&
                              ` (a cada ${invoice.intervaloDias} dias)`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Informações do Cliente */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Dados do Cliente
              </h3>
              <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Nome</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.clienteNome || "Cliente não identificado"}
                    </p>
                  </div>
                </div>
                {invoice.clienteEmail && (
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.clienteEmail}
                      </p>
                    </div>
                  </div>
                )}
                {invoice.clienteTelefone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Telefone</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.clienteTelefone}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Descrição */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Descrição do Serviço
              </h3>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm leading-relaxed">
                  {invoice.descricao || "Sem descrição adicional"}
                </p>
              </div>
            </div>

            {/* Observações */}
            {invoice.observacoes && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Observações
                </h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200">
                    {invoice.observacoes}
                  </p>
                </div>
              </div>
            )}

            {/* Histórico de Notificações */}
            {(invoice.tentativasCobranca > 0 || invoice.ultimaNotificacao) && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Histórico de Cobrança
                </h3>
                <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Tentativas de cobrança:</span>
                    <span className="font-semibold">
                      {invoice.tentativasCobranca}
                    </span>
                  </div>
                  {invoice.ultimaNotificacao && (
                    <div className="flex items-center justify-between text-sm">
                      <span>Última notificação:</span>
                      <span>
                        {invoice.ultimaNotificacao.toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                  {invoice.proximaNotificacao && (
                    <div className="flex items-center justify-between text-sm">
                      <span>Próxima notificação:</span>
                      <span className="text-orange-600">
                        {invoice.proximaNotificacao.toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Informações do Sistema */}
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
              <div>
                <p className="font-medium">ID da Fatura</p>
                <p className="font-mono">{invoice.id}</p>
              </div>
              <div>
                <p className="font-medium">Criado em</p>
                <p>{invoice.criadoEm.toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <p className="font-medium">Última atualização</p>
                <p>{invoice.atualizadoEm.toLocaleString("pt-BR")}</p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Modal de Notificação */}
        <NotificationModal
          open={showNotificationModal}
          onOpenChange={setShowNotificationModal}
          invoice={invoice}
          onSendNotification={handleSendNotification}
        />

        {/* Modal de Edição */}
        <InvoiceEditModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          invoice={invoice}
          onSaveInvoice={handleSaveInvoice}
        />
      </DialogContent>
    </Dialog>
  );
}
