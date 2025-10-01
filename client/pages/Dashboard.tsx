/**
 * SISTEMA DE GESTÃO JURÍDICA - DASHBOARD PRINCIPAL
 * ================================================
 *
 * Dashboard central do sistema de gestão para escritórios de advocacia.
 * Fornece uma visão geral completa das operações do escritório incluindo:
 *
 * MÉTRICAS PRINCIPAIS:
 * - Receitas e despesas do período
 * - Saldo atual e tendências
 * - Número de clientes ativos
 *
 * SEÇÕES DE MONITORAMENTO:
 * - Notificações urgentes e lembretes
 * - Projetos com prazos próximos
 * - Faturas a vencer
 * - Atividades recentes
 *
 * FUNCIONALIDADES:
 * - Navegação suave entre módulos
 * - Gráficos e visualizações
 * - Links rápidos para ações principais
 * - Feedback visual aprimorado
 *
 * Autor: Sistema de Gestão Jurídica
 * Data: 2024
 * Versão: 2.0
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  AlertCircle,
  FileText,
  Clock,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardCharts } from '@/components/Dashboard/Charts';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '@/hooks/useDashboard';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'client': return Users;
    case 'invoice': return AlertCircle;
    case 'project': return FileText;
    case 'task': return Clock;
    default: return FileText;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'client': return 'text-blue-600';
    case 'invoice': return 'text-yellow-600';
    case 'project': return 'text-green-600';
    case 'task': return 'text-purple-600';
    default: return 'text-gray-600';
  }
};

function MetricCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  format = 'currency',
  className
}: {
  title: string;
  value: number;
  change: number;
  trend: 'up' | 'down';
  icon: React.ElementType;
  format?: 'currency' | 'number';
  className?: string;
}) {
  const formattedValue = format === 'currency'
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    : value.toLocaleString('pt-BR');

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        <div className="flex items-center text-xs text-muted-foreground">
          {trend === 'up' ? (
            <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
          ) : (
            <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
          )}
          <span className={trend === 'up' ? 'text-green-600' : 'text-red-600'}>
            {change > 0 ? '+' : ''}{change}% mês
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { metrics, recentActivity, chartData, isLoading, error } = useDashboard();

  // Safe navigation handlers
  const handleViewAllNotifications = () => {
    try {
      navigate('/notificacoes');
    } catch (err) {
      console.error('Navigation error:', err);
    }
  };

  const handleViewAllProjects = () => {
    // Enhanced smooth transition with page fade
    const button = document.activeElement as HTMLElement;
    if (button) {
      button.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
      button.style.transform = 'scale(0.95)';
      button.style.opacity = '0.7';

      // Add ripple effect
      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(59, 130, 246, 0.3);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
      `;
      button.style.position = 'relative';
      button.style.overflow = 'hidden';
      button.appendChild(ripple);

      setTimeout(() => {
        button.style.transform = 'scale(1)';
        button.style.opacity = '1';

        // Smooth page transition
        document.body.style.transition = 'opacity 0.2s ease-out';
        document.body.style.opacity = '0.95';

        setTimeout(() => {
          navigate('/projetos');
          document.body.style.opacity = '1';
        }, 100);
      }, 150);
    } else {
      navigate('/projetos');
    }
  };

  const handleViewAllInvoices = () => {
    // Enhanced smooth transition for invoices
    const button = document.activeElement as HTMLElement;
    if (button) {
      button.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
      button.style.transform = 'scale(0.95)';
      button.style.opacity = '0.7';

      setTimeout(() => {
        button.style.transform = 'scale(1)';
        button.style.opacity = '1';

        // Smooth page transition with visual feedback
        document.body.style.transition = 'opacity 0.2s ease-out';
        document.body.style.opacity = '0.95';

        setTimeout(() => {
          navigate('/cobranca');
          document.body.style.opacity = '1';
        }, 100);
      }, 150);
    } else {
      navigate('/cobranca');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do seu escritório de advocacia
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">Erro ao carregar dados</h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metric Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : metrics ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="💰 RECEITAS"
            value={metrics.financial.revenue}
            change={15} // Calculate from previous period
            trend="up"
            icon={DollarSign}
            className="metric-revenue"
          />
          <MetricCard
            title="📉 DESPESAS"
            value={metrics.financial.expenses}
            change={-8} // Calculate from previous period
            trend="down"
            icon={TrendingDown}
            className="metric-expense"
          />
          <MetricCard
            title="🏦 SALDO"
            value={metrics.financial.balance}
            change={23} // Calculate from previous period
            trend={metrics.financial.balance >= 0 ? 'up' : 'down'}
            icon={TrendingUp}
            className="metric-balance-positive"
          />
          <MetricCard
            title="👥 CLIENTES"
            value={metrics.clients.total}
            change={metrics.clients.thisMonth > 0 ? 12 : 0}
            trend="up"
            icon={Users}
            format="number"
            className="metric-clients"
          />
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {error || 'Erro ao carregar métricas'}
          </p>
        </div>
      )}

      {/* Charts Section */}
      <DashboardCharts />

      {/* Activity Sections */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Activities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Notificações</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewAllNotifications}
              className="transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Ver todas
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.isArray(recentActivity) && recentActivity.length > 0 ? (
              recentActivity.slice(0, 4).map((activity) => {
                try {
                  const IconComponent = getActivityIcon(activity.type);
                  const colorClass = getActivityColor(activity.type);

                  return (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <IconComponent className={cn("h-4 w-4 mt-1", colorClass)} />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">{activity.title || 'Atividade sem título'}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.date ? new Date(activity.date).toLocaleDateString('pt-BR') : 'Data não disponível'}
                        </p>
                      </div>
                    </div>
                  );
                } catch (err) {
                  console.error('Error rendering activity:', err, activity);
                  return (
                    <div key={activity.id || Math.random()} className="flex items-start space-x-3">
                      <FileText className="h-4 w-4 mt-1 text-gray-400" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm text-muted-foreground">Erro ao exibir atividade</p>
                      </div>
                    </div>
                  );
                }
              })
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={handleViewAllNotifications}>
              <Plus className="h-4 w-4 mr-2" />
              Ver mais
            </Button>
          </CardContent>
        </Card>

        {/* Urgent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Projetos Urgentes</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewAllProjects}
              className="transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Ver todos
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.isArray(recentActivity) ? (
              recentActivity
                .filter(activity => activity && activity.type === 'project')
                .slice(0, 3)
                .map((project, index) => (
                  <div key={project.id || index} className="flex flex-col space-y-2 p-3 border rounded-lg">
                    <h4 className="text-sm font-medium">{project.title || 'Projeto sem título'}</h4>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {project.date ? new Date(project.date).toLocaleDateString('pt-BR') : 'Data não disponível'}
                      </span>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                        {project.status || 'Em Andamento'}
                      </span>
                    </div>
                  </div>
                ))
            ) : null}
            {!Array.isArray(recentActivity) || recentActivity.filter(a => a && a.type === 'project').length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum projeto recente
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* Upcoming Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Faturas Vencendo</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewAllInvoices}
              className="transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Ver todas
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.isArray(recentActivity) ? (
              recentActivity
                .filter(activity => activity && activity.type === 'invoice')
                .slice(0, 3)
                .map((invoice, index) => (
                  <div key={invoice.id || index} className="flex flex-col space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">{invoice.title || 'Fatura sem título'}</h4>
                      {invoice.amount && typeof invoice.amount === 'number' && (
                        <span className="text-sm font-bold text-green-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.amount)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{invoice.description || 'Sem descrição'}</span>
                      <span className="text-red-600">
                        {invoice.date ? new Date(invoice.date).toLocaleDateString('pt-BR') : 'Data não disponível'}
                      </span>
                    </div>
                  </div>
                ))
            ) : null}
            {!Array.isArray(recentActivity) || recentActivity.filter(a => a && a.type === 'invoice').length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma fatura recente
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
    </DashboardLayout>
  );
}