import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  Check, 
  X, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  FileText,
  Users,
  ExternalLink
} from 'lucide-react';

interface Notification {
  id: string;
  userId: string;
  actorId?: string;
  type: 'task' | 'invoice' | 'system' | 'client' | 'project';
  title: string;
  message: string;
  payload: any;
  link?: string;
  read: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}


export function NotificationsPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiService.getNotifications({ limit: 10, unreadOnly: false }),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => apiService.getUnreadCount(),
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = unreadData?.unreadCount || 0;

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => apiService.markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiService.markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  /**
   * Marca uma notificação como lida
   * @param id - ID da notificação
   */
  const markAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  /**
   * Marca todas as notificações como lidas
   */
  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  /**
   * Remove uma notificação da lista
   * @param id - ID da notificação a ser removida
   */
  const removeNotification = (id: string) => {
    deleteNotificationMutation.mutate(id);
  };

  /**
   * Retorna ícone baseado no tipo de notificação
   * @param type - Tipo da notificação
   */
  const getIcon = (type: string) => {
    switch (type) {
      case 'invoice':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'system':
        return <X className="h-4 w-4 text-red-500" />;
      case 'task':
        return <Calendar className="h-4 w-4 text-orange-500" />;
      case 'client':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'project':
        return <FileText className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };

  /**
   * Função para navegar aos detalhes da notificação
   * Redireciona para a página apropriada baseada no tipo de notificação
   * @param notification - Notificação clicada
   */
  const handleViewDetails = (notification: Notification) => {
    try {
      console.log('Navegando para detalhes da notificação:', notification);

      // Marcar como lida ao acessar detalhes
      markAsRead(notification.id);

      // Navigate based on link or type
      if (notification.link) {
        navigate(notification.link);
      } else {
        // Fallback navigation based on type
        switch (notification.type) {
          case 'invoice':
            navigate('/cobranca');
            break;
          case 'client':
            navigate('/crm');
            break;
          case 'project':
            navigate('/projetos');
            break;
          case 'task':
            navigate('/tarefas');
            break;
          default:
            navigate('/');
        }
      }
      
    } catch (error) {
      console.error('Erro ao navegar para detalhes da notificação:', error);
      
      // Mostrar erro ao usuário
      const errorNotification = document.createElement('div');
      errorNotification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
        z-index: 9999;
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      `;
      errorNotification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 20px;">❌</div>
          <div>
            <div style="font-weight: 600;">Erro na navegação</div>
            <div style="opacity: 0.9; font-size: 12px;">Tente novamente</div>
          </div>
        </div>
      `;
      
      document.body.appendChild(errorNotification);
      setTimeout(() => {
        if (document.body.contains(errorNotification)) {
          document.body.removeChild(errorNotification);
        }
      }, 4000);
    }
  };

  /**
   * Navega para página de todas as notificações
   */
  const handleViewAllNotifications = () => {
    try {
      console.log('Navegando para todas as notificações');

      // IMPLEMENTAÇÃO: Navegar para página dedicada de notificações
      // Esta página mostrará todas as notificações com detalhes completos
      navigate('/notificacoes');

      // Mostrar feedback de navegação
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
        z-index: 9999;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        max-width: 320px;
      `;
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 20px;">🔔</div>
          <div>
            <div style="font-weight: 600; margin-bottom: 2px;">Central de Notificações</div>
            <div style="opacity: 0.9; font-size: 12px;">Redirecionando...</div>
          </div>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.transform = 'translateX(0)';
      }, 50);
      
      setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }, 3000);
      
    } catch (error) {
      console.error('Erro ao navegar para todas as notificações:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="h-auto p-1 text-xs"
            >
              Marcar todas como lidas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 hover:bg-muted/50 cursor-pointer border-l-2 transition-all duration-200 ${
                    notification.read 
                      ? 'border-transparent opacity-70' 
                      : 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          className="h-auto p-1 opacity-50 hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">
                          {getRelativeTime(new Date(notification.createdAt))}
                        </p>
                        {(notification.link || notification.type !== 'system') && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 text-xs hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(notification);
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Ver Detalhes
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200"
                onClick={handleViewAllNotifications}
              >
                <Bell className="h-4 w-4 mr-2" />
                Ver Todas as Notificações
              </Button>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
