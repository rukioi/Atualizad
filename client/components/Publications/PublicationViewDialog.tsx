/**
 * COMPONENTE - DIALOG DE VISUALIZAÇÃO DE PUBLICAÇÃO
 * ================================================
 *
 * Modal para exibir os detalhes completos de uma publicação.
 * Inclui todas as informações da publicação de forma organizada.
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
  Calendar,
  FileText,
  Building2,
  User,
  Clock,
  AlertTriangle,
  Scale,
  Eye,
  Edit,
  Trash2,
  Download,
  Share,
} from "lucide-react";
import { Publication, PublicationStatus } from "@/types/publications";

interface PublicationViewDialogProps {
  publication: Publication;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getStatusBadge = (status: PublicationStatus) => {
  const statusConfig = {
    descartada: {
      label: "Descartada",
      variant: "secondary" as const,
      color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    },
    atribuida: {
      label: "Atribuída",
      variant: "default" as const,
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    },
    finalizada: {
      label: "Finalizada",
      variant: "outline" as const,
      color:
        "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    },
  };

  return statusConfig[status];
};

const getUrgencyConfig = (urgencia?: string) => {
  switch (urgencia) {
    case "alta":
      return {
        label: "ALTA",
        color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
        icon: AlertTriangle,
      };
    case "media":
      return {
        label: "MÉDIA",
        color:
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
        icon: Clock,
      };
    case "baixa":
      return {
        label: "BAIXA",
        color:
          "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
        icon: Clock,
      };
    default:
      return {
        label: "NÃO DEFINIDA",
        color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        icon: Clock,
      };
  }
};

export function PublicationViewDialog({
  publication,
  open,
  onOpenChange,
}: PublicationViewDialogProps) {
  const statusConfig = getStatusBadge(publication.status);
  const urgencyConfig = getUrgencyConfig(publication.urgencia);
  const UrgencyIcon = urgencyConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>Detalhes da Publicação</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4 min-h-0">
          <div className="space-y-6">
            {/* Cabeçalho com Status e Ações */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center space-x-4">
                <Badge
                  variant={statusConfig.variant}
                  className={`${statusConfig.color} px-3 py-1`}
                >
                  {statusConfig.label}
                </Badge>
                <div className="flex items-center space-x-2">
                  <UrgencyIcon className="h-4 w-4" />
                  <Badge variant="outline" className={urgencyConfig.color}>
                    {urgencyConfig.label}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" size="sm">
                  <Share className="h-4 w-4 mr-2" />
                  Compartilhar
                </Button>
              </div>
            </div>

            {/* Informações Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Informações do Processo
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Scale className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          Número do Processo
                        </p>
                        <p className="font-mono text-sm text-muted-foreground">
                          {publication.processo}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Vara/Comarca</p>
                        <p className="text-sm text-muted-foreground">
                          {publication.varaComarca}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Nome Pesquisado</p>
                        <p className="text-sm text-muted-foreground">
                          {publication.nomePesquisado}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Informações da Publicação
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          Data de Publicação
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {publication.dataPublicacao.toLocaleDateString(
                            "pt-BR",
                            {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Diário</p>
                        <p className="text-sm text-muted-foreground">
                          {publication.diario}
                        </p>
                      </div>
                    </div>
                    {publication.responsavel && (
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Responsável</p>
                          <p className="text-sm text-muted-foreground">
                            {publication.responsavel}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Conteúdo da Publicação */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Conteúdo da Publicação
              </h3>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm leading-relaxed">
                  {publication.conteudo || "Conteúdo não disponível"}
                </p>
              </div>
            </div>

            {/* Observações */}
            {publication.observacoes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Observações
                  </h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200">
                      {publication.observacoes}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Informações Adicionais */}
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
              <div>
                <p className="font-medium">ID da Publicação</p>
                <p className="font-mono">{publication.id}</p>
              </div>
              {publication.dataAtualizacao && (
                <div>
                  <p className="font-medium">Última Atualização</p>
                  <p>{publication.dataAtualizacao.toLocaleString("pt-BR")}</p>
                </div>
              )}
              {publication.cliente && (
                <div>
                  <p className="font-medium">Cliente</p>
                  <p>{publication.cliente}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
