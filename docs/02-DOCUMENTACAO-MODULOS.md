# 📦 DOCUMENTAÇÃO DETALHADA DOS MÓDULOS

## 📊 1. DASHBOARD

### Visão Geral

Centro de controle com métricas e gráficos em tempo real, com diferentes níveis de visibilidade baseados no tipo de conta.

### Níveis de Acesso

#### 🔒 Conta Simples

```javascript
// Dados visíveis
const simpleAccountData = {
  clientes: {
    total: actualClientCount,
    crescimento: calculatedGrowth,
    porStatus: actualStatusData,
  },
  financeiro: {
    receitas: 0, // Sempre zero
    despesas: 0, // Sempre zero
    saldo: 0, // Sempre zero
    graficos: [], // Array vazio
  },
};
```

#### 🔓 Conta Composta/Gerencial

```javascript
// Dados completos do Fluxo de Caixa
const fullAccountData = {
  clientes: fromCRMModule(),
  financeiro: fromCashFlowModule(),
  projetos: fromProjectsModule(),
  tarefas: fromTasksModule(),
};
```

### Conexões com Outros Módulos

#### 🔗 Dashboard ↔ Fluxo de Caixa

```sql
-- Receitas (Dashboard)
SELECT SUM(valor) as total_receitas
FROM tenant_x.cash_flow
WHERE tipo = 'receita'
  AND DATE_TRUNC('month', data) = DATE_TRUNC('month', NOW());

-- Despesas (Dashboard)
SELECT SUM(valor) as total_despesas
FROM tenant_x.cash_flow
WHERE tipo = 'despesa'
  AND DATE_TRUNC('month', data) = DATE_TRUNC('month', NOW());

-- Saldo (Dashboard)
SELECT
  (SELECT SUM(valor) FROM tenant_x.cash_flow WHERE tipo = 'receita') -
  (SELECT SUM(valor) FROM tenant_x.cash_flow WHERE tipo = 'despesa')
  AS saldo_total;
```

#### 🔗 Dashboard ↔ CRM

```sql
-- Total de Clientes
SELECT COUNT(*) as total_clientes
FROM tenant_x.clients
WHERE is_active = true;

-- Crescimento de Clientes (Mês atual vs anterior)
WITH monthly_counts AS (
  SELECT
    DATE_TRUNC('month', created_at) as mes,
    COUNT(*) as novos_clientes
  FROM tenant_x.clients
  WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
  GROUP BY DATE_TRUNC('month', created_at)
)
SELECT
  (atual.novos_clientes - anterior.novos_clientes) * 100.0 / anterior.novos_clientes as crescimento_percentual
FROM monthly_counts atual, monthly_counts anterior
WHERE atual.mes = DATE_TRUNC('month', NOW())
  AND anterior.mes = DATE_TRUNC('month', NOW() - INTERVAL '1 month');
```

### Gráficos e Visualizações

- **Receitas vs Despesas**: Gráfico de barras mensal
- **Fluxo de Caixa**: Linha temporal
- **Crescimento de Clientes**: Gráfico de linha
- **Distribuição por Status**: Pizza/Donut

---

## 👥 2. CRM (CUSTOMER RELATIONSHIP MANAGEMENT)

### Funcionalidades Principais

#### ➕ Criar Cliente

```javascript
const createClient = async (clientData) => {
  // 1. Validação de dados
  const validatedData = clientSchema.parse(clientData);

  // 2. Adição automática do colaborador que cadastrou
  const clientWithCreator = {
    ...validatedData,
    created_by: currentUser.id,
    created_at: new Date(),
    tenant_id: currentUser.tenant_id,
  };

  // 3. Inserção no banco
  const client = await db.clients.create(clientWithCreator);

  // 4. Notificação para todas as contas do tenant
  await notificationService.sendToTenant({
    tenant_id: currentUser.tenant_id,
    type: "client_created",
    message: `${currentUser.name} cadastrou novo cliente: ${client.name}`,
    data: { client_id: client.id },
  });

  // 5. Log de auditoria
  await auditLog.create({
    user_id: currentUser.id,
    table_name: "clients",
    operation: "CREATE",
    new_data: client,
  });

  return client;
};
```

#### ✏️ Editar Cliente

```javascript
const updateClient = async (clientId, updateData) => {
  // 1. Buscar dados atuais
  const oldClient = await db.clients.findById(clientId);

  // 2. Validar permissões
  await validateTenantAccess(oldClient.tenant_id);

  // 3. Atualizar dados
  const updatedClient = await db.clients.update(clientId, updateData);

  // 4. Notificação de edição
  await notificationService.sendToTenant({
    tenant_id: currentUser.tenant_id,
    type: "client_updated",
    message: `${currentUser.name} editou o cliente: ${updatedClient.name}`,
    data: {
      client_id: clientId,
      changes: diffData(oldClient, updatedClient),
    },
  });

  // 5. Auditoria
  await auditLog.create({
    user_id: currentUser.id,
    table_name: "clients",
    operation: "UPDATE",
    old_data: oldClient,
    new_data: updatedClient,
  });

  return updatedClient;
};
```

### Pipeline de Vendas

#### Estrutura do Pipeline

```sql
CREATE TABLE tenant_x.sales_pipeline (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES tenant_x.clients(id),
  stage VARCHAR CHECK (stage IN ('lead', 'contato', 'proposta', 'negociacao', 'fechado', 'perdido')),
  value DECIMAL(15,2),
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  actual_close_date DATE,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Indicadores do Pipeline

##### 📈 Total de Clientes

```sql
-- Contagem simples de clientes ativos
SELECT COUNT(*) as total_clientes
FROM tenant_x.clients
WHERE is_active = true;
```

##### 💰 Pipeline Total

```sql
-- Soma de todos os valores em negociação
SELECT SUM(value) as pipeline_total
FROM tenant_x.sales_pipeline
WHERE stage NOT IN ('fechado', 'perdido')
  AND is_active = true;
```

##### 📊 Taxa de Conversão

```sql
-- Percentual de negócios fechados
WITH conversion_stats AS (
  SELECT
    COUNT(*) FILTER (WHERE stage = 'fechado') as fechados,
    COUNT(*) as total_negocios
  FROM tenant_x.sales_pipeline
  WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '6 months')
)
SELECT
  (fechados * 100.0 / NULLIF(total_negocios, 0)) as taxa_conversao
FROM conversion_stats;
```

##### 💵 Receita Fechada

```sql
-- Soma dos valores de negócios fechados
SELECT SUM(value) as receita_fechada
FROM tenant_x.sales_pipeline
WHERE stage = 'fechado'
  AND actual_close_date >= DATE_TRUNC('month', NOW());
```

### Filtros do CRM

```javascript
const crmFilters = {
  // Filtro por colaborador (contas do tenant)
  created_by: {
    type: "select",
    options: await getTenantUsers(currentTenant.id),
    label: "Colaborador",
  },

  // Status do cliente
  status: {
    type: "select",
    options: ["ativo", "inativo", "prospecto", "cliente"],
    label: "Status",
  },

  // Filtro por data
  date_range: {
    type: "daterange",
    label: "Período de Cadastro",
  },

  // Filtro por valor do pipeline
  pipeline_value: {
    type: "range",
    label: "Valor do Negócio",
  },
};
```

---

## 🏗️ 3. PROJETOS

### Funcionalidades Principais

#### ➕ Criar Projeto

```javascript
const createProject = async (projectData) => {
  const project = await db.transaction(async (trx) => {
    // 1. Criar projeto
    const newProject = await trx.projects.create({
      ...projectData,
      created_by: currentUser.id,
      tenant_id: currentUser.tenant_id,
      progress: 0, // Progresso inicial
    });

    // 2. Criar tarefas iniciais (se fornecidas)
    if (projectData.initial_tasks) {
      await trx.tasks.createMany(
        projectData.initial_tasks.map((task) => ({
          ...task,
          project_id: newProject.id,
          tenant_id: currentUser.tenant_id,
        })),
      );
    }

    return newProject;
  });

  // 3. Notificação
  await notificationService.sendToTenant({
    type: "project_created",
    message: `Novo projeto criado: ${project.name}`,
    data: { project_id: project.id },
  });

  return project;
};
```

### Indicadores de Projetos

#### 📊 Total de Projetos

```sql
SELECT COUNT(*) as total_projetos
FROM tenant_x.projects
WHERE is_active = true;
```

#### 📈 Progresso Médio

```sql
-- Cálculo baseado no progresso das tarefas
WITH project_progress AS (
  SELECT
    p.id,
    p.name,
    COALESCE(AVG(t.progress), 0) as calculated_progress
  FROM tenant_x.projects p
  LEFT JOIN tenant_x.tasks t ON t.project_id = p.id AND t.is_active = true
  WHERE p.is_active = true
  GROUP BY p.id, p.name
)
SELECT AVG(calculated_progress) as progresso_medio
FROM project_progress;
```

#### ⚠️ Projetos Vencidos

```sql
SELECT COUNT(*) as projetos_vencidos
FROM tenant_x.projects
WHERE due_date < NOW()
  AND status NOT IN ('concluido', 'cancelado')
  AND is_active = true;
```

#### 💰 Receita Realizada

```sql
-- Receita de projetos concluídos
SELECT SUM(budget_value) as receita_realizada
FROM tenant_x.projects
WHERE status = 'concluido'
  AND completed_at >= DATE_TRUNC('month', NOW());
```

### Relacionamento Projetos ↔ Tarefas

```sql
-- Atualização automática do progresso do projeto
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tenant_x.projects
  SET
    progress = (
      SELECT COALESCE(AVG(progress), 0)
      FROM tenant_x.tasks
      WHERE project_id = NEW.project_id
        AND is_active = true
    ),
    updated_at = NOW()
  WHERE id = NEW.project_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualização automática
CREATE TRIGGER update_project_progress_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_x.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_project_progress();
```

---

## ✅ 4. TAREFAS

### Funcionalidades Principais

#### ➕ Criar Tarefa

```javascript
const createTask = async (taskData) => {
  // 1. Validação de responsável (deve ser do mesmo tenant)
  const responsible = await validateTenantUser(taskData.responsible_id);

  const task = await db.tasks.create({
    ...taskData,
    created_by: currentUser.id,
    tenant_id: currentUser.tenant_id,
    status: "pending",
  });

  // 2. Notificação para o responsável
  await notificationService.sendToUser({
    user_id: task.responsible_id,
    type: "task_assigned",
    message: `Nova tarefa atribuída: ${task.title}`,
    data: { task_id: task.id },
  });

  // 3. Atualização do progresso do projeto (se aplicável)
  if (task.project_id) {
    await updateProjectProgress(task.project_id);
  }

  return task;
};
```

### Indicadores de Tarefas

#### 📊 Total de Tarefas

```sql
SELECT COUNT(*) as total_tarefas
FROM tenant_x.tasks
WHERE is_active = true;
```

#### ✅ Taxa de Conclusão

```sql
WITH task_stats AS (
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed') as concluidas,
    COUNT(*) as total_tarefas
  FROM tenant_x.tasks
  WHERE is_active = true
    AND created_at >= DATE_TRUNC('month', NOW())
)
SELECT
  (concluidas * 100.0 / NULLIF(total_tarefas, 0)) as taxa_conclusao
FROM task_stats;
```

#### ⚠️ Tarefas Vencidas

```sql
SELECT COUNT(*) as tarefas_vencidas
FROM tenant_x.tasks
WHERE due_date < NOW()
  AND status NOT IN ('completed', 'cancelled')
  AND is_active = true;
```

#### ⏱️ Tempo Médio de Conclusão

```sql
SELECT
  AVG(EXTRACT(DAY FROM (completed_at - created_at))) as tempo_medio_dias
FROM tenant_x.tasks
WHERE status = 'completed'
  AND completed_at IS NOT NULL
  AND completed_at >= NOW() - INTERVAL '6 months';
```

### Sistema de Filtros para Tarefas

```javascript
const taskFilters = {
  // Responsável (contas do tenant)
  responsible: {
    type: "select",
    options: await getTenantUsers(currentTenant.id),
    label: "Responsável",
  },

  // Status específicos do módulo
  status: {
    type: "select",
    options: ["pending", "in_progress", "completed", "cancelled"],
    label: "Status",
  },

  // Projeto relacionado
  project: {
    type: "select",
    options: await getTenantProjects(currentTenant.id),
    label: "Projeto",
  },

  // Prioridade
  priority: {
    type: "select",
    options: ["baixa", "media", "alta", "urgente"],
    label: "Prioridade",
  },
};
```

---

## 💰 5. COBRANÇA

### Funcionalidades com Resend API

#### 📧 Envio de Cobrança por Email

```javascript
const sendBillingEmail = async (billingId) => {
  const billing = await db.billing.findById(billingId);
  const client = await db.clients.findById(billing.client_id);

  // Template de email personalizado
  const emailTemplate = {
    from: `${tenantConfig.company_name} <${tenantConfig.sender_email}>`,
    to: client.email,
    subject: `Cobrança ${billing.number} - ${tenantConfig.company_name}`,
    html: generateBillingEmailTemplate(billing, client, tenantConfig),
    attachments: billing.attachments
      ? [
          {
            filename: `cobranca-${billing.number}.pdf`,
            content: await generateBillingPDF(billing),
          },
        ]
      : [],
  };

  // Envio via Resend
  const result = await resendClient.emails.send(emailTemplate);

  // Log da notificação
  await db.notification_log.create({
    tenant_id: billing.tenant_id,
    type: "billing_email",
    recipient: client.email,
    status: result.error ? "failed" : "sent",
    external_id: result.id,
    billing_id: billingId,
  });

  return result;
};
```

### Indicadores de Cobrança

#### 💸 Total Pendente

```sql
SELECT SUM(amount) as total_pendente
FROM tenant_x.billing
WHERE status = 'pending'
  AND is_active = true;
```

#### ✅ Receita Paga

```sql
SELECT SUM(amount) as receita_paga
FROM tenant_x.billing
WHERE status = 'paid'
  AND paid_at >= DATE_TRUNC('month', NOW());
```

#### ⚠️ Valores Vencidos

```sql
SELECT SUM(amount) as valores_vencidos
FROM tenant_x.billing
WHERE due_date < NOW()
  AND status = 'pending'
  AND is_active = true;
```

#### 📅 Este Mês

```sql
SELECT SUM(amount) as este_mes
FROM tenant_x.billing
WHERE DATE_TRUNC('month', due_date) = DATE_TRUNC('month', NOW())
  AND is_active = true;
```

---

## 🧾 6. GESTÃO DE RECEBÍVEIS

### Integração com Múltiplas APIs

#### 💳 Integração Stripe

```javascript
const createStripePayment = async (invoiceData) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(invoiceData.amount * 100), // Centavos
    currency: "brl",
    metadata: {
      tenant_id: invoiceData.tenant_id,
      invoice_id: invoiceData.id,
      client_id: invoiceData.client_id,
    },
    receipt_email: invoiceData.client_email,
  });

  // Salvar referência do pagamento
  await db.payments.create({
    invoice_id: invoiceData.id,
    stripe_payment_intent_id: paymentIntent.id,
    amount: invoiceData.amount,
    status: "pending",
    tenant_id: invoiceData.tenant_id,
  });

  return paymentIntent;
};
```

#### 📱 Integração WhatsApp (via n8n)

```javascript
const sendWhatsAppInvoice = async (invoiceId) => {
  const invoice = await db.invoices.findById(invoiceId);
  const client = await db.clients.findById(invoice.client_id);

  const whatsappMessage = {
    number: client.phone,
    message: `
🧾 *Fatura ${invoice.number}*

Olá ${client.name}! 

Você tem uma nova fatura no valor de *R$ ${invoice.amount.toFixed(2)}*

📅 Vencimento: ${formatDate(invoice.due_date)}
💳 Link para pagamento: ${invoice.payment_link}

Em caso de dúvidas, entre em contato conosco.
    `,
    media_url: invoice.pdf_url, // PDF da fatura
  };

  // Envio via webhook n8n
  const response = await fetch(process.env.N8N_WHATSAPP_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(whatsappMessage),
  });

  // Log da notificação
  await db.notification_log.create({
    tenant_id: invoice.tenant_id,
    type: "whatsapp_invoice",
    recipient: client.phone,
    status: response.ok ? "sent" : "failed",
    invoice_id: invoiceId,
  });

  return response;
};
```

### Sistema de Notificações Automáticas

#### ⏰ Agendamento de Notificações

```javascript
const scheduleInvoiceNotifications = async (invoiceId) => {
  const invoice = await db.invoices.findById(invoiceId);

  // 3 dias antes do vencimento
  await scheduleNotification({
    invoice_id: invoiceId,
    type: "reminder_3_days",
    scheduled_for: subDays(invoice.due_date, 3),
    message: "Lembrete: Fatura vence em 3 dias",
  });

  // No dia do vencimento
  await scheduleNotification({
    invoice_id: invoiceId,
    type: "due_date",
    scheduled_for: invoice.due_date,
    message: "URGENTE: Fatura vence hoje!",
  });

  // 1 dia após vencimento
  await scheduleNotification({
    invoice_id: invoiceId,
    type: "overdue",
    scheduled_for: addDays(invoice.due_date, 1),
    message: "ATENÇÃO: Fatura em atraso",
  });
};
```

#### ✅ Cancelamento de Notificações (Pagamento Confirmado)

```javascript
const handlePaymentConfirmation = async (stripePaymentIntent) => {
  const payment = await db.payments.findByStripeId(stripePaymentIntent.id);

  if (payment && stripePaymentIntent.status === "succeeded") {
    // 1. Atualizar status da fatura
    await db.invoices.update(payment.invoice_id, {
      status: "paid",
      paid_at: new Date(),
      payment_method: "stripe",
    });

    // 2. Cancelar notificações pendentes
    await db.scheduled_notifications.cancelPending(payment.invoice_id);

    // 3. Verificar se é recorrente
    const invoice = await db.invoices.findById(payment.invoice_id);
    if (invoice.is_recurring) {
      const nextInvoice = await createRecurringInvoice(invoice);
      await scheduleInvoiceNotifications(nextInvoice.id);
    }

    // 4. Notificar sucesso
    await notificationService.sendToTenant({
      tenant_id: invoice.tenant_id,
      type: "payment_received",
      message: `Pagamento recebido: Fatura ${invoice.number}`,
      data: { invoice_id: invoice.id, amount: invoice.amount },
    });
  }
};
```

### Indicadores de Recebíveis

#### ✅ Faturas Pagas

```sql
SELECT COUNT(*) as faturas_pagas
FROM tenant_x.invoices
WHERE status = 'paid'
  AND paid_at >= DATE_TRUNC('month', NOW());
```

#### ⏳ Pendentes

```sql
SELECT COUNT(*) as pendentes
FROM tenant_x.invoices
WHERE status = 'pending'
  AND is_active = true;
```

#### ⚠️ Próximo Vencimento (3 dias)

```sql
SELECT COUNT(*) as proximo_vencimento
FROM tenant_x.invoices
WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '3 days'
  AND status = 'pending'
  AND is_active = true;
```

#### 🚨 Vencidas

```sql
SELECT COUNT(*) as vencidas
FROM tenant_x.invoices
WHERE due_date < NOW()
  AND status = 'pending'
  AND is_active = true;
```

### Importação de Cobranças

```javascript
const importFromBilling = async (billingIds, tenantId) => {
  const billings = await db.billing.findMany({
    where: {
      id: { in: billingIds },
      tenant_id: tenantId,
    },
    include: { client: true },
  });

  const invoices = await Promise.all(
    billings.map(async (billing) => {
      const invoice = await db.invoices.create({
        number: `INV-${generateInvoiceNumber()}`,
        client_id: billing.client_id,
        amount: billing.amount,
        due_date: billing.due_date,
        description: billing.description,
        status: "pending",
        source: "imported_from_billing",
        original_billing_id: billing.id,
        tenant_id: tenantId,
      });

      // Agendar notificações automáticas
      await scheduleInvoiceNotifications(invoice.id);

      return invoice;
    }),
  );

  return invoices;
};
```

---

## 💰 7. FLUXO DE CAIXA

### Estrutura Completa do Módulo

#### 🏗️ Estrutura de Dados

```sql
CREATE TABLE tenant_x.cash_flow (
  id UUID PRIMARY KEY,
  type VARCHAR CHECK (type IN ('receita', 'despesa')),
  category_id UUID REFERENCES tenant_x.cash_flow_categories(id),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  project_id UUID REFERENCES tenant_x.projects(id),
  client_id UUID REFERENCES tenant_x.clients(id),
  created_by UUID REFERENCES tenant_x.users(id),
  payment_method VARCHAR,
  tags TEXT[],
  is_recurring BOOLEAN DEFAULT false,
  recurring_config JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tenant_x.cash_flow_categories (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  type VARCHAR CHECK (type IN ('receita', 'despesa')),
  color VARCHAR,
  tenant_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true
);
```

#### 💡 Funcionalidades Principais

##### 📊 Relatórios Automáticos

```javascript
const generateCashFlowReport = async (tenantId, period) => {
  const { startDate, endDate } = parsePeriod(period);

  const report = await db.query(
    `
    WITH monthly_data AS (
      SELECT 
        DATE_TRUNC('month', date) as month,
        type,
        SUM(amount) as total
      FROM tenant_${tenantId}.cash_flow 
      WHERE date BETWEEN $1 AND $2
      GROUP BY DATE_TRUNC('month', date), type
    ),
    consolidated AS (
      SELECT 
        month,
        SUM(CASE WHEN type = 'receita' THEN total ELSE 0 END) as receitas,
        SUM(CASE WHEN type = 'despesa' THEN total ELSE 0 END) as despesas
      FROM monthly_data
      GROUP BY month
    )
    SELECT 
      month,
      receitas,
      despesas,
      (receitas - despesas) as saldo,
      LAG(receitas - despesas) OVER (ORDER BY month) as saldo_anterior
    FROM consolidated
    ORDER BY month;
  `,
    [startDate, endDate],
  );

  return report;
};
```

##### 🔄 Lançamentos Recorrentes

```javascript
const processRecurringEntries = async () => {
  const recurringEntries = await db.cash_flow.findMany({
    where: {
      is_recurring: true,
      "recurring_config.next_date": { lte: new Date() },
    },
  });

  for (const entry of recurringEntries) {
    const config = entry.recurring_config;

    // Criar próximo lançamento
    await db.cash_flow.create({
      ...entry,
      id: generateUUID(),
      date: config.next_date,
      description: `${entry.description} (Recorrente)`,
      created_at: new Date(),
    });

    // Calcular próxima data
    const nextDate = calculateNextDate(config.next_date, config.frequency);

    // Atualizar configuração
    await db.cash_flow.update(entry.id, {
      recurring_config: {
        ...config,
        next_date: nextDate,
      },
    });
  }
};
```

#### 🔗 Conexão com Dashboard

```javascript
const getCashFlowDashboardData = async (tenantId, accountType) => {
  // Para Conta Simples, retornar zeros
  if (accountType === "simples") {
    return {
      receitas: 0,
      despesas: 0,
      saldo: 0,
      graficos: [],
    };
  }

  // Para Conta Composta/Gerencial, dados reais
  const currentMonth = await db.query(`
    SELECT 
      SUM(CASE WHEN type = 'receita' THEN amount ELSE 0 END) as receitas,
      SUM(CASE WHEN type = 'despesa' THEN amount ELSE 0 END) as despesas
    FROM tenant_${tenantId}.cash_flow 
    WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())
  `);

  const { receitas, despesas } = currentMonth[0];

  return {
    receitas,
    despesas,
    saldo: receitas - despesas,
    graficos: await generateChartData(tenantId),
  };
};
```

---

## 📰 8. PAINEL DE PUBLICAÇÕES

### Funcionalidade Exclusiva por Conta

**IMPORTANTE**: Este módulo é único onde cada conta tem seus dados isolados, diferente dos outros módulos que compartilham dados entre contas do mesmo tenant.

#### 🏗️ Estrutura de Dados

```sql
CREATE TABLE tenant_x.publications_panel (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES tenant_x.users(id), -- Isolamento por usuário
  oab_number VARCHAR NOT NULL,
  process_number VARCHAR,
  publication_date DATE,
  content TEXT,
  source VARCHAR, -- 'CNJ-DATAJUD', 'Codilo', 'JusBrasil'
  external_id VARCHAR,
  status VARCHAR CHECK (status IN ('novo', 'lido', 'arquivado')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, external_id)
);
```

#### 📡 Integração com APIs Jurídicas

```javascript
const loadPublications = async (userId, oabNumber) => {
  const user = await db.users.findById(userId);

  // Determinar qual API usar (configurável)
  const apiProvider = await getApiProvider(user.tenant_id);

  let publications = [];

  try {
    switch (apiProvider) {
      case "CNJ-DATAJUD":
        publications = await loadFromCNJ(oabNumber);
        break;
      case "Codilo":
        publications = await loadFromCodilo(oabNumber);
        break;
      case "JusBrasil":
        publications = await loadFromJusBrasil(oabNumber);
        break;
    }

    // Salvar publicações com isolamento por usuário
    const savedPublications = await Promise.all(
      publications.map((pub) =>
        db.publications_panel.upsert({
          user_id: userId, // ISOLAMENTO CRÍTICO
          oab_number: oabNumber,
          process_number: pub.process_number,
          publication_date: pub.date,
          content: pub.content,
          source: apiProvider,
          external_id: pub.id,
          status: "novo",
        }),
      ),
    );

    return savedPublications;
  } catch (error) {
    // Log de erro específico por API
    await db.api_error_log.create({
      user_id: userId,
      api_provider: apiProvider,
      error_message: error.message,
      timestamp: new Date(),
    });

    throw new Error(`Erro ao carregar publicações: ${error.message}`);
  }
};
```

#### 🔒 Middleware de Isolamento

```javascript
const publicationsIsolationMiddleware = (req, res, next) => {
  // Garantir que usuário só acesse suas próprias publicações
  req.publicationsFilter = {
    user_id: req.user.id, // Sempre filtrar por usuário logado
  };

  next();
};
```

#### 📊 Cálculos do Sistema de Recebíveis

##### 🧮 Nova Fatura - Cálculos Detalhados

```javascript
const calculateInvoiceValues = (baseData) => {
  const calculations = {
    // Valor base da fatura
    subtotal: baseData.amount,

    // Impostos (configurável por tenant)
    taxes: {
      iss: baseData.amount * (baseData.iss_rate / 100),
      pis: baseData.amount * (baseData.pis_rate / 100),
      cofins: baseData.amount * (baseData.cofins_rate / 100),
      csll: baseData.amount * (baseData.csll_rate / 100),
      irrf: baseData.amount * (baseData.irrf_rate / 100),
    },

    // Descontos
    discounts: {
      amount: baseData.discount_amount || 0,
      percentage: baseData.discount_percentage || 0,
    },

    // Multa por atraso (se aplicável)
    late_fee: {
      percentage: baseData.late_fee_percentage || 0,
      fixed_amount: baseData.late_fee_amount || 0,
    },

    // Juros mensais
    monthly_interest: baseData.monthly_interest_rate || 0,
  };

  // Cálculo do valor total dos impostos
  const totalTaxes = Object.values(calculations.taxes).reduce(
    (sum, tax) => sum + tax,
    0,
  );

  // Desconto por valor ou percentual
  const discountAmount =
    calculations.discounts.amount ||
    baseData.amount * (calculations.discounts.percentage / 100);

  // Valor líquido
  const netAmount = calculations.subtotal - totalTaxes - discountAmount;

  // Cálculo de juros se vencida
  let interestAmount = 0;
  if (baseData.due_date < new Date()) {
    const daysLate = Math.ceil(
      (new Date() - baseData.due_date) / (1000 * 60 * 60 * 24),
    );
    const monthsLate = daysLate / 30;
    interestAmount =
      netAmount * (calculations.monthly_interest / 100) * monthsLate;
  }

  // Multa por atraso
  const lateFeeAmount =
    calculations.late_fee.fixed_amount ||
    netAmount * (calculations.late_fee.percentage / 100);

  // Total final
  const finalAmount = netAmount + interestAmount + lateFeeAmount;

  return {
    subtotal: calculations.subtotal,
    taxes: calculations.taxes,
    total_taxes: totalTaxes,
    discount_amount: discountAmount,
    net_amount: netAmount,
    interest_amount: interestAmount,
    late_fee_amount: lateFeeAmount,
    final_amount: finalAmount,
    breakdown: {
      base: calculations.subtotal,
      taxes: -totalTaxes,
      discounts: -discountAmount,
      interest: interestAmount,
      late_fee: lateFeeAmount,
      total: finalAmount,
    },
  };
};
```

---

## ⚙️ 9. CONFIGURAÇÕES

### Acesso Exclusivo - Conta Gerencial

#### 🏢 Submódulo Empresa

```javascript
const companyConfigSchema = {
  name: "string",
  cnpj: "string",
  address: "object",
  phone: "string",
  email: "string",
  website: "string",
  sender_email: "string", // Para APIs de email
  logo_data: "base64", // Armazenado no banco
  favicon_data: "base64", // Armazenado no banco
};

const updateCompanyConfig = async (tenantId, configData) => {
  // Validar que usuário é conta gerencial
  await validateManagerialAccount(req.user);

  // Upload de logo/favicon para S3 (opcional)
  if (configData.logo_file) {
    const logoUrl = await uploadToS3(
      configData.logo_file,
      `tenant-${tenantId}/logo`,
    );
    configData.logo_url = logoUrl;
  }

  if (configData.favicon_file) {
    const faviconUrl = await uploadToS3(
      configData.favicon_file,
      `tenant-${tenantId}/favicon`,
    );
    configData.favicon_url = faviconUrl;
  }

  // Atualizar configurações
  const config = await db.tenant_config.upsert({
    tenant_id: tenantId,
    company_data: configData,
    updated_at: new Date(),
  });

  return config;
};
```

#### 👥 Submódulo Usuários

```javascript
const manageUsers = {
  // Listar todas as contas do tenant
  async list(tenantId) {
    return await db.users.findMany({
      where: { tenant_id: tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        account_type: true,
        is_active: true,
        last_login: true,
        created_at: true,
      },
    });
  },

  // Ativar/Desativar conta
  async toggleActive(userId, isActive) {
    // Validar que não é conta gerencial
    const user = await db.users.findById(userId);
    if (user.account_type === "gerencial") {
      throw new Error("Conta gerencial não pode ser desativada");
    }

    return await db.users.update(userId, { is_active: isActive });
  },

  // Resetar senha
  async resetPassword(userId) {
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    await db.users.update(userId, {
      password_hash: hashedPassword,
      must_change_password: true,
    });

    // Enviar por email
    await sendPasswordResetEmail(userId, tempPassword);

    return { success: true };
  },
};
```

#### 🔔 Submódulo Notificações

```javascript
const notificationSettings = {
  // Configurações de timing
  timing: {
    invoice_reminder: 3, // dias antes do vencimento
    overdue_alert: 1, // dias após vencimento
    task_reminder: 24, // horas antes do prazo
    project_milestone: 7, // dias antes do marco
  },

  // Canais habilitados
  channels: {
    email: true,
    whatsapp: true,
    in_app: true,
    sms: false,
  },

  // Templates personalizáveis
  templates: {
    invoice_reminder: "Template personalizado...",
    payment_received: "Template personalizado...",
    task_assigned: "Template personalizado...",
  },
};

const updateNotificationSettings = async (tenantId, settings) => {
  await validateManagerialAccount(req.user);

  return await db.notification_settings.upsert({
    tenant_id: tenantId,
    settings: settings,
    updated_at: new Date(),
  });
};
```

---

## 📎 SISTEMA DE ARQUIVOS (AWS S3)

### Configuração Global

```javascript
const fileUploadConfig = {
  maxFiles: 3, // Configurável por tenant no painel admin
  maxFileSize: 10, // MB - Configurável por tenant
  allowedTypes: [".pdf", ".doc", ".docx", ".jpg", ".png"],

  // Estrutura no S3
  s3Structure: {
    bucket: "law-saas-documents",
    keyPattern: "{tenant_id}/{module}/{entity_id}/{filename}",
  },
};

const uploadFile = async (file, tenantId, module, entityId) => {
  // Validações
  await validateFileLimit(tenantId, entityId);
  await validateFileSize(file);
  await validateFileType(file);

  // Upload para S3
  const key = `${tenantId}/${module}/${entityId}/${file.name}`;
  const uploadResult = await s3Client
    .upload({
      Bucket: fileUploadConfig.s3Structure.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
    .promise();

  // Salvar referência no banco
  const fileRecord = await db.file_attachments.create({
    tenant_id: tenantId,
    module: module,
    entity_id: entityId,
    filename: file.name,
    original_name: file.originalname,
    file_size: file.size,
    mime_type: file.mimetype,
    s3_url: uploadResult.Location,
    s3_key: key,
    uploaded_by: req.user.id,
  });

  return fileRecord;
};
```

---

## 🏷️ SISTEMA DE TAGS POR MÓDULO

### Implementação Modular

```javascript
const tagSystem = {
  // Tags independentes por módulo
  modules: ["crm", "projects", "tasks", "billing", "receivables", "cashflow"],

  // Estrutura de dados
  schema: `
    CREATE TABLE tenant_x.tags (
      id UUID PRIMARY KEY,
      name VARCHAR NOT NULL,
      color VARCHAR,
      module VARCHAR NOT NULL,
      tenant_id UUID NOT NULL,
      created_by UUID REFERENCES tenant_x.users(id),
      usage_count INTEGER DEFAULT 0,
      UNIQUE(tenant_id, module, name)
    );
  `,

  // Função para buscar tags por módulo
  async getModuleTags(tenantId, module) {
    return await db.tags.findMany({
      where: {
        tenant_id: tenantId,
        module: module,
      },
      orderBy: { usage_count: "desc" },
    });
  },

  // Criar nova tag
  async createTag(tenantId, module, tagName, color) {
    return await db.tags.create({
      tenant_id: tenantId,
      module: module,
      name: tagName,
      color: color,
      created_by: req.user.id,
    });
  },

  // Atualizar contador de uso
  async incrementUsage(tagId) {
    await db.tags.update(tagId, {
      usage_count: { increment: 1 },
    });
  },
};
```

---

_📅 Documento criado em: $(date)_  
_🔄 Última atualização: $(date)_  
_👤 Autor: Documentação Técnica - Módulos_
