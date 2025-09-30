/**
 * COMPONENTE - DIALOG DE VISUALIZAÇÃO DE CLIENTE
 * =============================================
 *
 * Modal para exibir os detalhes completos de um cliente do sistema de recebíveis.
 */

import React from "react";
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
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  FileText,
  Smartphone,
} from "lucide-react";

interface ClientData {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  whatsapp?: string;
  totalFaturado: number;
  totalPago: number;
  faturasPendentes: number;
  ultimoPagamento?: Date;
  faturas: any[];
}

interface ClientViewDialogProps {
  client: ClientData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function ClientViewDialog({
  client,
  open,
  onOpenChange,
}: ClientViewDialogProps) {
  if (!client) return null;

  const percentualPago =
    client.totalFaturado > 0
      ? (client.totalPago / client.totalFaturado) * 100
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5 text-primary" />
            <span>Detalhes do Cliente - {client.nome}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4 min-h-0">
          <div className="space-y-6">
            {/* Informações Principais do Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Informações de Contato
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Nome</p>
                        <p className="text-sm text-muted-foreground">
                          {client.nome}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">
                          {client.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Telefone</p>
                        <p className="text-sm text-muted-foreground">
                          {client.telefone}
                        </p>
                      </div>
                    </div>
                    {client.whatsapp && (
                      <div className="flex items-center space-x-3">
                        <Smartphone className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-sm font-medium">WhatsApp</p>
                          <p className="text-sm text-green-600">
                            {client.whatsapp}
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
                    Informações Financeiras
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Total Faturado</p>
                        <p className="text-lg font-bold text-blue-600">
                          {formatCurrency(client.totalFaturado)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">Total Pago</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(client.totalPago)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <div>
                        <p className="text-sm font-medium">Faturas Pendentes</p>
                        <p className="text-lg font-bold text-red-600">
                          {client.faturasPendentes}
                        </p>
                      </div>
                    </div>
                    {client.ultimoPagamento && (
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            Último Pagamento
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {client.ultimoPagamento.toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Indicador de Performance */}
            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Performance de Pagamento</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Taxa de Pagamento:</span>
                  <span
                    className={`font-bold ${percentualPago >= 80 ? "text-green-600" : percentualPago >= 50 ? "text-yellow-600" : "text-red-600"}`}
                  >
                    {percentualPago.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${percentualPago >= 80 ? "bg-green-600" : percentualPago >= 50 ? "bg-yellow-600" : "bg-red-600"}`}
                    style={{ width: `${percentualPago}%` }}
                  ></div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {percentualPago >= 80 &&
                    "🟢 Cliente excelente - pagamentos em dia"}
                  {percentualPago >= 50 &&
                    percentualPago < 80 &&
                    "🟡 Cliente regular - acompanhar"}
                  {percentualPago < 50 && "🔴 Cliente requer atenção especial"}
                </div>
              </div>
            </div>

            <Separator />

            {/* Histórico de Faturas */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Histórico de Faturas ({client.faturas.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {client.faturas.length > 0 ? (
                  client.faturas.map((fatura, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {fatura.numeroFatura}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {fatura.descricao}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">
                          {formatCurrency(fatura.valor)}
                        </p>
                        <Badge
                          className={
                            fatura.status === "paga"
                              ? "bg-green-100 text-green-800"
                              : fatura.status === "pendente"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                          }
                        >
                          {fatura.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma fatura encontrada</p>
                  </div>
                )}
              </div>
            </div>

            {/* Informações do Sistema */}
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>
                <p className="font-medium">ID do Cliente</p>
                <p className="font-mono">{client.id}</p>
              </div>
              <div>
                <p className="font-medium">Cadastrado em</p>
                <p>Sistema de Recebíveis</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end flex-shrink-0 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
