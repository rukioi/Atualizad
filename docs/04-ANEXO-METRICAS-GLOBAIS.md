# 📊 ANEXO - MÉTRICAS GLOBAIS E FÓRMULAS

## 🎯 VISÃO GERAL

Este anexo contém todas as fórmulas exatas, queries SQL e cálculos utilizados para gerar os indicadores e métricas em cada módulo do sistema. Cada métrica está documentada com sua fórmula matemática, implementação em SQL e considerações especiais.

---

## 📈 DASHBOARD - MÉTRICAS PRINCIPAIS

### 💰 Receitas Totais

**Descrição**: Soma de todas as receitas registradas no Fluxo de Caixa para o período especificado.

**Fórmula Matemática**:

```
Receitas_Total = Σ(valor) WHERE tipo = 'receita' AND período
```

**Implementação SQL**:

```sql
SELECT
  SUM(amount) as total_receitas
FROM tenant_${tenantId}.cash_flow
WHERE type = 'receita'
  AND date >= DATE_TRUNC('month', NOW())
  AND date < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  AND is_active = true;
```

**Considerações**:

- Filtra apenas registros ativos (`is_active = true`)
- Por padrão calcula para o mês corrente
- Para Conta Simples: sempre retorna `0`

---

### 💸 Despesas Totais

**Descrição**: Soma de todas as despesas registradas no Fluxo de Caixa para o período especificado.

**Fórmula Matemática**:

```
Despesas_Total = Σ(valor) WHERE tipo = 'despesa' AND período
```

**Implementação SQL**:

```sql
SELECT
  SUM(amount) as total_despesas
FROM tenant_${tenantId}.cash_flow
WHERE type = 'despesa'
  AND date >= DATE_TRUNC('month', NOW())
  AND date < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  AND is_active = true;
```

**Considerações**:

- Filtra apenas registros ativos
- Para Conta Simples: sempre retorna `0`

---

### 💳 Saldo Total

**Descrição**: Diferença entre receitas e despesas totais.

**Fórmula Matemática**:

```
Saldo = Receitas_Total - Despesas_Total
```

**Implementação SQL**:

```sql
WITH financial_summary AS (
  SELECT
    SUM(CASE WHEN type = 'receita' THEN amount ELSE 0 END) as receitas,
    SUM(CASE WHEN type = 'despesa' THEN amount ELSE 0 END) as despesas
  FROM tenant_${tenantId}.cash_flow
  WHERE date >= DATE_TRUNC('month', NOW())
    AND date < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
    AND is_active = true
)
SELECT
  receitas,
  despesas,
  (receitas - despesas) as saldo
FROM financial_summary;
```

**Considerações**:

- Saldo positivo indica lucro, negativo indica prejuízo
- Para Conta Simples: sempre retorna `0`

---

### 👥 Total de Clientes

**Descrição**: Número total de clientes ativos cadastrados no CRM.

**Fórmula Matemática**:

```
Total_Clientes = COUNT(clientes) WHERE status = 'ativo'
```

**Implementação SQL**:

```sql
SELECT COUNT(*) as total_clientes
FROM tenant_${tenantId}.clients
WHERE is_active = true;
```

**Considerações**:

- Conta apenas clientes com status ativo
- Visível para todos os tipos de conta

---

### 📈 Crescimento de Clientes

**Descrição**: Percentual de crescimento de clientes comparando mês atual com anterior.

**Fórmula Matemática**:

```
Crescimento_% = ((Clientes_Mês_Atual - Clientes_Mês_Anterior) / Clientes_Mês_Anterior) × 100
```

**Implementação SQL**:

```sql
WITH monthly_clients AS (
  SELECT
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as new_clients,
    SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)) as cumulative_clients
  FROM tenant_${tenantId}.clients
  WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '2 months')
    AND is_active = true
  GROUP BY DATE_TRUNC('month', created_at)
),
growth_calc AS (
  SELECT
    month,
    cumulative_clients,
    LAG(cumulative_clients) OVER (ORDER BY month) as previous_month_total
  FROM monthly_clients
)
SELECT
  month,
  cumulative_clients as current_total,
  previous_month_total,
  CASE
    WHEN previous_month_total > 0 THEN
      ROUND(
        ((cumulative_clients - previous_month_total) * 100.0 / previous_month_total),
        2
      )
    ELSE 0
  END as growth_percentage
FROM growth_calc
WHERE month = DATE_TRUNC('month', NOW());
```

**Considerações**:

- Se não há clientes no mês anterior, crescimento = 0%
- Calcula com base no total acumulado, não apenas novos clientes do mês

---

## 🤝 CRM - MÉTRICAS DO PIPELINE

### 💰 Pipeline Total

**Descrição**: Soma do valor de todos os negócios ativos no pipeline de vendas.

**Fórmula Matemática**:

```
Pipeline_Total = Σ(valor_negócio) WHERE status ∉ ('fechado', 'perdido')
```

**Implementação SQL**:

```sql
SELECT
  SUM(value) as pipeline_total,
  COUNT(*) as total_deals
FROM tenant_${tenantId}.sales_pipeline
WHERE stage NOT IN ('fechado', 'perdido')
  AND is_active = true;
```

**Considerações**:

- Exclui negócios já fechados ou perdidos
- Inclui todos os estágios intermediários

---

### 📊 Taxa de Conversão

**Descrição**: Percentual de negócios fechados com sucesso em relação ao total de negócios.

**Fórmula Matemática**:

```
Taxa_Conversão = (Negócios_Fechados / Total_Negócios) × 100
```

**Implementação SQL**:

```sql
WITH conversion_stats AS (
  SELECT
    COUNT(*) FILTER (WHERE stage = 'fechado') as fechados,
    COUNT(*) as total_negocios
  FROM tenant_${tenantId}.sales_pipeline
  WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '6 months')
    AND is_active = true
)
SELECT
  fechados,
  total_negocios,
  CASE
    WHEN total_negocios > 0 THEN
      ROUND((fechados * 100.0 / total_negocios), 2)
    ELSE 0
  END as taxa_conversao
FROM conversion_stats;
```

**Considerações**:

- Calcula baseado nos últimos 6 meses para ter amostra significativa
- Se não há negócios, taxa = 0%

---

### 💵 Receita Fechada

**Descrição**: Valor total dos negócios fechados com sucesso no período.

**Fórmula Matemática**:

```
Receita_Fechada = Σ(valor_negócio) WHERE status = 'fechado' AND período
```

**Implementação SQL**:

```sql
SELECT
  SUM(value) as receita_fechada,
  COUNT(*) as negocios_fechados
FROM tenant_${tenantId}.sales_pipeline
WHERE stage = 'fechado'
  AND actual_close_date >= DATE_TRUNC('month', NOW())
  AND actual_close_date < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  AND is_active = true;
```

**Considerações**:

- Usa `actual_close_date` para período correto
- Soma apenas negócios efetivamente fechados

---

### ⏱️ Tempo Médio de Fechamento

**Descrição**: Tempo médio para fechar um negócio (desde criação até fechamento).

**Fórmula Matemática**:

```
Tempo_Médio = AVG(data_fechamento - data_criação) WHERE status = 'fechado'
```

**Implementação SQL**:

```sql
SELECT
  AVG(EXTRACT(DAY FROM (actual_close_date - created_at))) as tempo_medio_dias,
  COUNT(*) as sample_size
FROM tenant_${tenantId}.sales_pipeline
WHERE stage = 'fechado'
  AND actual_close_date IS NOT NULL
  AND actual_close_date >= NOW() - INTERVAL '6 months'
  AND is_active = true;
```

**Considerações**:

- Resultado em dias
- Amostra dos últimos 6 meses para relevância

---

## 🏗️ PROJETOS - MÉTRICAS DE PERFORMANCE

### 📊 Total de Projetos

**Descrição**: Número total de projetos ativos no sistema.

**Fórmula Matemática**:

```
Total_Projetos = COUNT(projetos) WHERE status ≠ 'cancelado'
```

**Implementação SQL**:

```sql
SELECT COUNT(*) as total_projetos
FROM tenant_${tenantId}.projects
WHERE status NOT IN ('cancelado')
  AND is_active = true;
```

---

### 📈 Progresso Médio

**Descrição**: Média do progresso de todos os projetos ativos baseado no progresso das tarefas.

**Fórmula Matemática**:

```
Progresso_Médio = AVG(Σ(progresso_tarefas) / COUNT(tarefas)) por projeto
```

**Implementação SQL**:

```sql
WITH project_progress AS (
  SELECT
    p.id,
    p.name,
    p.status,
    COALESCE(AVG(t.progress), 0) as calculated_progress
  FROM tenant_${tenantId}.projects p
  LEFT JOIN tenant_${tenantId}.tasks t ON t.project_id = p.id
    AND t.is_active = true
  WHERE p.is_active = true
    AND p.status NOT IN ('cancelado')
  GROUP BY p.id, p.name, p.status
)
SELECT
  AVG(calculated_progress) as progresso_medio,
  COUNT(*) as total_projetos_ativos
FROM project_progress;
```

**Considerações**:

- Se projeto não tem tarefas, progresso = 0%
- Progresso calculado dinamicamente baseado nas tarefas

---

### ⚠️ Projetos Vencidos

**Descrição**: Número de projetos que ultrapassaram a data de término prevista.

**Fórmula Matemática**:

```
Projetos_Vencidos = COUNT(projetos) WHERE data_término < hoje AND status ∉ ('concluído', 'cancelado')
```

**Implementação SQL**:

```sql
SELECT COUNT(*) as projetos_vencidos
FROM tenant_${tenantId}.projects
WHERE due_date < CURRENT_DATE
  AND status NOT IN ('concluido', 'cancelado')
  AND is_active = true;
```

**Considerações**:

- Compara apenas com a data (sem horário)
- Exclui projetos já finalizados

---

### 💰 Receita Realizada

**Descrição**: Valor total dos projetos concluídos no período.

**Fórmula Matemática**:

```
Receita_Realizada = Σ(valor_orçamento) WHERE status = 'concluído' AND período
```

**Implementação SQL**:

```sql
SELECT
  SUM(budget_value) as receita_realizada,
  COUNT(*) as projetos_concluidos
FROM tenant_${tenantId}.projects
WHERE status = 'concluido'
  AND completed_at >= DATE_TRUNC('month', NOW())
  AND completed_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  AND budget_value IS NOT NULL
  AND is_active = true;
```

**Considerações**:

- Usa `completed_at` para determinar o período
- Soma apenas projetos com valor orçamentário definido

---

## ✅ TAREFAS - MÉTRICAS DE PRODUTIVIDADE

### 📊 Total de Tarefas

**Descrição**: Número total de tarefas ativas no sistema.

**Fórmula Matemática**:

```
Total_Tarefas = COUNT(tarefas) WHERE status ≠ 'cancelada'
```

**Implementação SQL**:

```sql
SELECT COUNT(*) as total_tarefas
FROM tenant_${tenantId}.tasks
WHERE status NOT IN ('cancelled')
  AND is_active = true;
```

---

### ✅ Taxa de Conclusão

**Descrição**: Percentual de tarefas concluídas em relação ao total de tarefas.

**Fórmula Matemática**:

```
Taxa_Conclusão = (Tarefas_Concluídas / Total_Tarefas) × 100
```

**Implementação SQL**:

```sql
WITH task_stats AS (
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed') as concluidas,
    COUNT(*) as total_tarefas
  FROM tenant_${tenantId}.tasks
  WHERE is_active = true
    AND created_at >= DATE_TRUNC('month', NOW())
)
SELECT
  concluidas,
  total_tarefas,
  CASE
    WHEN total_tarefas > 0 THEN
      ROUND((concluidas * 100.0 / total_tarefas), 2)
    ELSE 0
  END as taxa_conclusao
FROM task_stats;
```

**Considerações**:

- Calcula para o mês corrente
- Se não há tarefas, taxa = 0%

---

### ⚠️ Tarefas Vencidas

**Descrição**: Número de tarefas que ultrapassaram a data de conclusão prevista.

**Fórmula Matemática**:

```
Tarefas_Vencidas = COUNT(tarefas) WHERE data_conclusão < agora AND status ∉ ('completed', 'cancelled')
```

**Implementação SQL**:

```sql
SELECT COUNT(*) as tarefas_vencidas
FROM tenant_${tenantId}.tasks
WHERE due_date < NOW()
  AND status NOT IN ('completed', 'cancelled')
  AND is_active = true;
```

**Considerações**:

- Compara com timestamp completo (data + hora)
- Exclui tarefas já finalizadas

---

### ⏱️ Tempo Médio de Conclusão

**Descrição**: Tempo médio para concluir uma tarefa (desde criação até conclusão).

**Fórmula Matemática**:

```
Tempo_Médio = AVG(data_conclusão - data_criação) WHERE status = 'completed'
```

**Implementação SQL**:

```sql
SELECT
  AVG(EXTRACT(DAY FROM (completed_at - created_at))) as tempo_medio_dias,
  AVG(EXTRACT(HOUR FROM (completed_at - created_at))) as tempo_medio_horas,
  COUNT(*) as sample_size
FROM tenant_${tenantId}.tasks
WHERE status = 'completed'
  AND completed_at IS NOT NULL
  AND completed_at >= NOW() - INTERVAL '3 months'
  AND is_active = true;
```

**Considerações**:

- Resultado em dias e horas
- Amostra dos últimos 3 meses

---

## 💰 COBRANÇA - MÉTRICAS FINANCEIRAS

### 💸 Total Pendente

**Descrição**: Valor total de cobranças com status pendente.

**Fórmula Matemática**:

```
Total_Pendente = Σ(valor) WHERE status = 'pendente'
```

**Implementação SQL**:

```sql
SELECT
  SUM(amount) as total_pendente,
  COUNT(*) as cobranças_pendentes
FROM tenant_${tenantId}.billing
WHERE status = 'pending'
  AND is_active = true;
```

---

### ✅ Receita Paga

**Descrição**: Valor total de cobranças pagas no período.

**Fórmula Matemática**:

```
Receita_Paga = Σ(valor) WHERE status = 'pago' AND período
```

**Implementação SQL**:

```sql
SELECT
  SUM(amount) as receita_paga,
  COUNT(*) as cobranças_pagas
FROM tenant_${tenantId}.billing
WHERE status = 'paid'
  AND paid_at >= DATE_TRUNC('month', NOW())
  AND paid_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  AND is_active = true;
```

**Considerações**:

- Usa `paid_at` para determinar o período de pagamento

---

### ⚠️ Valores Vencidos

**Descrição**: Valor total de cobranças vencidas e ainda pendentes.

**Fórmula Matemática**:

```
Valores_Vencidos = Σ(valor) WHERE data_vencimento < hoje AND status = 'pendente'
```

**Implementação SQL**:

```sql
SELECT
  SUM(amount) as valores_vencidos,
  COUNT(*) as cobranças_vencidas
FROM tenant_${tenantId}.billing
WHERE due_date < CURRENT_DATE
  AND status = 'pending'
  AND is_active = true;
```

---

### 📅 Este Mês

**Descrição**: Valor total de cobranças com vencimento no mês atual.

**Fórmula Matemática**:

```
Este_Mês = Σ(valor) WHERE data_vencimento ∈ mês_atual
```

**Implementação SQL**:

```sql
SELECT
  SUM(amount) as total_mes_atual,
  COUNT(*) as cobranças_mes_atual
FROM tenant_${tenantId}.billing
WHERE DATE_TRUNC('month', due_date) = DATE_TRUNC('month', NOW())
  AND is_active = true;
```

---

## 🧾 GESTÃO DE RECEBÍVEIS - MÉTRICAS DE FATURAMENTO

### ✅ Faturas Pagas

**Descrição**: Número e valor de faturas pagas no período.

**Fórmula Matemática**:

```
Faturas_Pagas = COUNT(faturas) WHERE status = 'pago' AND período
```

**Implementação SQL**:

```sql
SELECT
  COUNT(*) as faturas_pagas,
  SUM(amount) as valor_total_pago
FROM tenant_${tenantId}.invoices
WHERE status = 'paid'
  AND paid_at >= DATE_TRUNC('month', NOW())
  AND paid_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  AND is_active = true;
```

---

### ⏳ Pendentes

**Descrição**: Número e valor de faturas ainda pendentes de pagamento.

**Fórmula Matemática**:

```
Pendentes = COUNT(faturas) WHERE status = 'pendente'
```

**Implementação SQL**:

```sql
SELECT
  COUNT(*) as faturas_pendentes,
  SUM(amount) as valor_total_pendente
FROM tenant_${tenantId}.invoices
WHERE status = 'pending'
  AND is_active = true;
```

---

### ⚠️ Próximo Vencimento (3 dias)

**Descrição**: Faturas que vencem nos próximos 3 dias.

**Fórmula Matemática**:

```
Próximo_Vencimento = COUNT(faturas) WHERE data_vencimento ∈ [hoje, hoje+3]
```

**Implementação SQL**:

```sql
SELECT
  COUNT(*) as proximo_vencimento,
  SUM(amount) as valor_proximo_vencimento
FROM tenant_${tenantId}.invoices
WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
  AND status = 'pending'
  AND is_active = true;
```

---

### 🚨 Vencidas

**Descrição**: Faturas que já passaram da data de vencimento.

**Fórmula Matemática**:

```
Vencidas = COUNT(faturas) WHERE data_vencimento < hoje AND status = 'pendente'
```

**Implementação SQL**:

```sql
SELECT
  COUNT(*) as faturas_vencidas,
  SUM(amount) as valor_total_vencido,
  AVG(CURRENT_DATE - due_date) as dias_atraso_medio
FROM tenant_${tenantId}.invoices
WHERE due_date < CURRENT_DATE
  AND status = 'pending'
  AND is_active = true;
```

**Considerações**:

- Inclui cálculo de média de dias em atraso

---

## 💵 FLUXO DE CAIXA - MÉTRICAS AVANÇADAS

### 📊 Fluxo de Caixa Acumulado

**Descrição**: Saldo acumulado dia a dia considerando receitas e despesas.

**Fórmula Matemática**:

```
Fluxo_Acumulado[dia] = Saldo_Inicial + Σ(receitas - despesas)[até_dia]
```

**Implementação SQL**:

```sql
WITH daily_flow AS (
  SELECT
    date,
    SUM(CASE WHEN type = 'receita' THEN amount ELSE -amount END) as daily_balance
  FROM tenant_${tenantId}.cash_flow
  WHERE date >= DATE_TRUNC('month', NOW())
    AND date < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
    AND is_active = true
  GROUP BY date
  ORDER BY date
)
SELECT
  date,
  daily_balance,
  SUM(daily_balance) OVER (ORDER BY date) as accumulated_balance
FROM daily_flow;
```

---

### 📈 Tendência de Crescimento (Receitas)

**Descrição**: Taxa de crescimento mensal das receitas.

**Fórmula Matemática**:

```
Crescimento_Receitas = ((Receitas_Mês_Atual - Receitas_Mês_Anterior) / Receitas_Mês_Anterior) × 100
```

**Implementação SQL**:

```sql
WITH monthly_revenue AS (
  SELECT
    DATE_TRUNC('month', date) as month,
    SUM(amount) as revenue
  FROM tenant_${tenantId}.cash_flow
  WHERE type = 'receita'
    AND date >= DATE_TRUNC('month', NOW() - INTERVAL '12 months')
    AND is_active = true
  GROUP BY DATE_TRUNC('month', date)
  ORDER BY month
)
SELECT
  month,
  revenue,
  LAG(revenue) OVER (ORDER BY month) as previous_revenue,
  CASE
    WHEN LAG(revenue) OVER (ORDER BY month) > 0 THEN
      ROUND(
        ((revenue - LAG(revenue) OVER (ORDER BY month)) * 100.0 /
         LAG(revenue) OVER (ORDER BY month)), 2
      )
    ELSE NULL
  END as growth_percentage
FROM monthly_revenue;
```

---

### 💰 Margem de Lucro

**Descrição**: Percentual de lucro em relação à receita total.

**Fórmula Matemática**:

```
Margem_Lucro = ((Receitas - Despesas) / Receitas) × 100
```

**Implementação SQL**:

```sql
WITH profit_calc AS (
  SELECT
    SUM(CASE WHEN type = 'receita' THEN amount ELSE 0 END) as receitas,
    SUM(CASE WHEN type = 'despesa' THEN amount ELSE 0 END) as despesas
  FROM tenant_${tenantId}.cash_flow
  WHERE date >= DATE_TRUNC('month', NOW())
    AND date < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
    AND is_active = true
)
SELECT
  receitas,
  despesas,
  (receitas - despesas) as lucro,
  CASE
    WHEN receitas > 0 THEN
      ROUND(((receitas - despesas) * 100.0 / receitas), 2)
    ELSE 0
  END as margem_lucro_percentual
FROM profit_calc;
```

---

## 🧮 CÁLCULOS ESPECIAIS - SISTEMA DE RECEBÍVEIS

### 💰 Nova Fatura - Cálculo Completo

**Descrição**: Fórmula completa para cálculo de valores de fatura com impostos, descontos e multas.

**Implementação**:

```javascript
const calculateInvoiceValues = (baseData) => {
  // Valor base
  const subtotal = parseFloat(baseData.amount) || 0;

  // Configurações de impostos (por tenant)
  const taxRates = {
    iss: parseFloat(baseData.iss_rate) || 0, // %
    pis: parseFloat(baseData.pis_rate) || 0, // %
    cofins: parseFloat(baseData.cofins_rate) || 0, // %
    csll: parseFloat(baseData.csll_rate) || 0, // %
    irrf: parseFloat(baseData.irrf_rate) || 0, // %
  };

  // Cálculo dos impostos
  const taxes = {
    iss: subtotal * (taxRates.iss / 100),
    pis: subtotal * (taxRates.pis / 100),
    cofins: subtotal * (taxRates.cofins / 100),
    csll: subtotal * (taxRates.csll / 100),
    irrf: subtotal * (taxRates.irrf / 100),
  };

  const totalTaxes = Object.values(taxes).reduce((sum, tax) => sum + tax, 0);

  // Descontos
  const discountAmount = parseFloat(baseData.discount_amount) || 0;
  const discountPercentage = parseFloat(baseData.discount_percentage) || 0;
  const calculatedDiscountAmount =
    discountAmount || subtotal * (discountPercentage / 100);

  // Valor líquido (após impostos e descontos)
  const netAmount = subtotal - totalTaxes - calculatedDiscountAmount;

  // Cálculo de juros (se vencida)
  let interestAmount = 0;
  const dueDate = new Date(baseData.due_date);
  const today = new Date();

  if (dueDate < today) {
    const daysLate = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
    const monthsLate = daysLate / 30;
    const monthlyInterestRate = parseFloat(baseData.monthly_interest_rate) || 0;
    interestAmount = netAmount * (monthlyInterestRate / 100) * monthsLate;
  }

  // Multa por atraso
  const lateFeePercentage = parseFloat(baseData.late_fee_percentage) || 0;
  const lateFeeAmount = parseFloat(baseData.late_fee_amount) || 0;
  const calculatedLateFee =
    lateFeeAmount || netAmount * (lateFeePercentage / 100);

  // Total final
  const finalAmount = netAmount + interestAmount + calculatedLateFee;

  return {
    subtotal: subtotal,
    taxes: taxes,
    total_taxes: totalTaxes,
    discount_amount: calculatedDiscountAmount,
    net_amount: netAmount,
    interest_amount: interestAmount,
    late_fee_amount: calculatedLateFee,
    final_amount: finalAmount,
    breakdown: {
      "Valor Base": subtotal,
      ISS: -taxes.iss,
      PIS: -taxes.pis,
      COFINS: -taxes.cofins,
      CSLL: -taxes.csll,
      IRRF: -taxes.irrf,
      Desconto: -calculatedDiscountAmount,
      Juros: interestAmount,
      Multa: calculatedLateFee,
      TOTAL: finalAmount,
    },
  };
};
```

---

## 📊 MÉTRICAS DE PERFORMANCE DO SISTEMA

### ⚡ Tempo de Resposta por Módulo

**Descrição**: Tempo médio de resposta das APIs por módulo.

**Implementação SQL**:

```sql
-- Tabela de logs de requisições
SELECT
  module,
  endpoint,
  AVG(response_time_ms) as avg_response_time,
  MAX(response_time_ms) as max_response_time,
  COUNT(*) as request_count
FROM system_logs.api_requests
WHERE timestamp >= NOW() - INTERVAL '24 hours'
  AND status_code < 400
GROUP BY module, endpoint
ORDER BY avg_response_time DESC;
```

---

### 📈 Taxa de Sucesso por API Externa

**Descrição**: Percentual de requisições bem-sucedidas para APIs externas.

**Implementação SQL**:

```sql
WITH api_stats AS (
  SELECT
    api_provider,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'success') as successful_requests
  FROM tenant_${tenantId}.api_requests_log
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY api_provider
)
SELECT
  api_provider,
  total_requests,
  successful_requests,
  ROUND((successful_requests * 100.0 / total_requests), 2) as success_rate
FROM api_stats
ORDER BY success_rate DESC;
```

---

### 💾 Uso de Storage por Tenant

**Descrição**: Quantidade de storage utilizada por cada tenant.

**Implementação SQL**:

```sql
SELECT
  tenant_id,
  COUNT(*) as total_files,
  SUM(file_size) as total_size_bytes,
  ROUND(SUM(file_size) / 1024.0 / 1024.0, 2) as total_size_mb,
  AVG(file_size) as avg_file_size
FROM file_attachments
WHERE created_at >= DATE_TRUNC('month', NOW())
GROUP BY tenant_id
ORDER BY total_size_bytes DESC;
```

---

## 🎯 RESUMO DE APLICAÇÃO DAS MÉTRICAS

### Por Tipo de Conta:

#### 🔒 Conta Simples

- ✅ **Visível**: Métricas de clientes, projetos, tarefas
- ❌ **Oculto**: Todas as métricas financeiras (retornam 0)

#### 🔓 Conta Composta

- ✅ **Visível**: Todas as métricas exceto configurações avançadas
- ✅ **Acesso**: Visualização completa do fluxo de caixa

#### 👑 Conta Gerencial

- ✅ **Visível**: Todas as métricas incluindo administrativas
- ✅ **Acesso**: Métricas de sistema e performance
- ✅ **Controle**: Configuração de limites e thresholds

---

### Periodicidade de Cálculo:

- **Tempo Real**: Totais simples (contagens, somas básicas)
- **A cada 15 min**: Métricas de crescimento e tendências
- **Diário**: Relatórios consolidados e métricas históricas
- **Mensal**: Análises de performance e ajustes de fórmulas

---

_📅 Documento criado em: $(date)_  
_🔄 Última atualização: $(date)_  
_👤 Autor: Documentação Técnica - Métricas e Fórmulas_
