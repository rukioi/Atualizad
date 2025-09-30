# 💳 GESTÃO DE RECEBÍVEIS - DOCUMENTAÇÃO TÉCNICA

## 📋 VISÃO GERAL

O módulo **Gestão de Recebíveis** é um sistema completo para administração de pagamentos, automação de cobranças e comunicação com clientes. Integra Stripe (pagamentos), n8n (automação) e WhatsApp Business API (comunicação) para criar um fluxo inteligente e automatizado de cobrança.

---

## 🎯 FUNCIONALIDADES PRINCIPAIS

### 📊 Dashboard Inteligente
- **Faturas Pagas**: Total e valor recebido
- **Faturas Pendentes**: Aguardando pagamento 
- **Próximo Vencimento**: Faturas com vencimento em 3 dias ou menos
- **Faturas Vencidas**: Em atraso (crítico)
- **Métricas**: Taxa de cobrança, tempo médio de pagamento, crescimento mensal

### 💰 Gestão de Faturas
- **CRUD Completo**: Criar, visualizar, editar e cancelar faturas
- **Recorrência Automática**: Cobrança a cada 30 dias (configurável)
- **Links de Pagamento**: Integração direta com Stripe Checkout
- **Status Tracking**: Acompanhamento em tempo real
- **Cobrança em Lote**: Seleção múltipla para envio

### 👥 Gestão de Clientes
- **Dados de Cobrança**: Endereço, preferências de comunicação
- **Histórico Financeiro**: Total faturado, pago, pendências
- **Integração Stripe**: Customer ID para pagamentos recorrentes
- **Preferências**: Horário preferencial, canais de comunicação

### 🤖 Automação Inteligente
- **Detecção de Vencimentos**: CRON job diário às 09:00
- **Notificações Automáticas**: 3 dias antes, 1 dia antes, no vencimento, após atraso
- **WhatsApp Automatizado**: Mensagens via n8n com link de pagamento
- **Retry Logic**: Reenvio automático em caso de falha

---

## 🔧 ARQUITETURA TÉCNICA

### 🏗️ Stack Tecnológico

#### **Frontend**
- **React + TypeScript**: Interface moderna e type-safe
- **Tailwind CSS**: Estilização responsiva
- **Lucide Icons**: Iconografia consistente
- **React Hook Form**: Formulários com validação

#### **Backend (a implementar)**
- **API RESTful**: Endpoints padronizados
- **Webhooks**: Integração bidirecional
- **CRON Jobs**: Automação temporal
- **Queue System**: Processamento assíncrono

#### **Integrações**
- **Stripe API**: Processamento de pagamentos
- **n8n**: Automação de workflows
- **WhatsApp Business API**: Comunicação
- **Banco de Dados**: PostgreSQL recomendado

---

## 📡 INTEGRAÇÕES NECESSÁRIAS

### 💳 **STRIPE INTEGRATION**

#### **Setup Inicial**
```bash
npm install stripe
```

#### **Configuração**
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Criar Customer
const customer = await stripe.customers.create({
  email: cliente.email,
  name: cliente.nome,
  phone: cliente.telefone,
  address: cliente.enderecoCobranca
});

// Criar Invoice
const invoice = await stripe.invoices.create({
  customer: customer.id,
  auto_advance: false,
  collection_method: 'send_invoice',
  days_until_due: 30
});

// Gerar Payment Link
const paymentLink = await stripe.paymentLinks.create({
  line_items: [{
    price_data: {
      currency: 'brl',
      product_data: { name: fatura.descricao },
      unit_amount: fatura.valor * 100
    },
    quantity: 1
  }]
});
```

#### **Webhooks Stripe**
```javascript
// Endpoint: POST /webhooks/stripe
app.post('/webhooks/stripe', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed.`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      // Atualizar status da fatura para 'paga'
      break;
    case 'invoice.payment_failed':
      // Marcar como falha e reagendar cobrança
      break;
  }

  res.json({received: true});
});
```

### 🤖 **N8N INTEGRATION**

#### **Webhook para n8n**
```javascript
// Função para disparar automação
const triggerN8nWorkflow = async (payload) => {
  const response = await fetch(process.env.N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  return response.json();
};

// Payload Structure
const webhookPayload = {
  evento: 'lembrete_pagamento',
  fatura: {
    id: fatura.id,
    numero: fatura.numeroFatura,
    valor: fatura.valor,
    vencimento: fatura.dataVencimento.toISOString(),
    linkPagamento: fatura.linkPagamento
  },
  cliente: {
    id: cliente.id,
    nome: cliente.nome,
    whatsapp: cliente.whatsapp,
    email: cliente.email
  },
  configuracao: {
    diasAntesVencimento: 3,
    mensagem: "Olá {{cliente.nome}}! Sua fatura {{fatura.numero}} no valor de R$ {{fatura.valor}} vence em {{dias}} dias. Clique para pagar: {{fatura.linkPagamento}}",
    horarioEnvio: "09:00"
  }
};
```

#### **n8n Workflow Estrutura**
```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "recebiveis-cobranca"
      }
    },
    {
      "name": "Process Data",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "code": "// Processar dados da fatura e cliente"
      }
    },
    {
      "name": "WhatsApp Send",
      "type": "n8n-nodes-base.whatsApp",
      "parameters": {
        "operation": "sendMessage",
        "chatId": "{{cliente.whatsapp}}",
        "message": "{{mensagem_processada}}"
      }
    }
  ]
}
```

### 📱 **WHATSAPP BUSINESS API**

#### **Setup**
```javascript
const WhatsAppAPI = require('whatsapp-business-api');

const whatsapp = new WhatsAppAPI({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID
});

// Enviar Mensagem
const sendPaymentReminder = async (cliente, fatura) => {
  const message = `
🏛️ *${process.env.COMPANY_NAME}*

Olá ${cliente.nome}! 

📄 *Fatura:* ${fatura.numeroFatura}
💰 *Valor:* R$ ${fatura.valor.toLocaleString('pt-BR')}
📅 *Vencimento:* ${fatura.dataVencimento.toLocaleDateString('pt-BR')}

🔗 *Pagar agora:* ${fatura.linkPagamento}

❓ Dúvidas? Responda esta mensagem.
  `;

  return await whatsapp.sendMessage({
    to: cliente.whatsapp,
    type: 'text',
    text: { body: message }
  });
};
```

---

## 🗄️ ESTRUTURA DO BANCO DE DADOS

### 📊 **Tabelas Principais**

#### **faturas**
```sql
CREATE TABLE faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id),
  numero_fatura VARCHAR(50) UNIQUE NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  descricao TEXT,
  servico_prestado VARCHAR(255),
  data_emissao DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento TIMESTAMP,
  status VARCHAR(20) CHECK (status IN ('pendente', 'paga', 'vencida', 'cancelada', 'processando')),
  tentativas_cobranca INTEGER DEFAULT 0,
  
  -- Stripe Integration
  stripe_invoice_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  link_pagamento TEXT,
  
  -- Automação
  webhook_n8n_id VARCHAR(255),
  ultima_notificacao TIMESTAMP,
  proxima_notificacao TIMESTAMP,
  
  -- Recorrência
  recorrente BOOLEAN DEFAULT FALSE,
  intervalo_dias INTEGER DEFAULT 30,
  proxima_fatura_data DATE,
  
  -- Metadata
  criado_por VARCHAR(255),
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),
  observacoes TEXT
);
```

#### **clientes_cobranca**
```sql
CREATE TABLE clientes_cobranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id),
  
  -- Dados Cobrança
  endereco_cobranca JSONB,
  stripe_customer_id VARCHAR(255),
  
  -- Preferências
  receber_whatsapp BOOLEAN DEFAULT TRUE,
  receber_email BOOLEAN DEFAULT TRUE,
  hora_preferencial_notificacao TIME,
  
  -- Estatísticas
  total_faturado DECIMAL(12,2) DEFAULT 0,
  total_pago DECIMAL(12,2) DEFAULT 0,
  faturas_pendentes INTEGER DEFAULT 0,
  ultimo_pagamento DATE,
  
  -- Status
  ativo BOOLEAN DEFAULT TRUE,
  bloqueado BOOLEAN DEFAULT FALSE,
  motivo_bloqueio TEXT,
  
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);
```

#### **notificacoes_automaticas**
```sql
CREATE TABLE notificacoes_automaticas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id UUID REFERENCES faturas(id),
  cliente_id UUID REFERENCES clientes(id),
  
  -- Conteúdo
  tipo VARCHAR(30) CHECK (tipo IN ('lembrete_3_dias', 'lembrete_1_dia', 'vencimento_hoje', 'atraso')),
  canal VARCHAR(20) CHECK (canal IN ('whatsapp', 'email', 'sms')),
  conteudo TEXT,
  
  -- Agendamento
  data_agendada TIMESTAMP,
  data_enviada TIMESTAMP,
  status VARCHAR(20) CHECK (status IN ('nao_enviada', 'agendada', 'enviada', 'falhou', 'lida')),
  
  -- Integração
  n8n_workflow_id VARCHAR(255),
  whatsapp_message_id VARCHAR(255),
  resposta_cliente TEXT,
  
  -- Controle
  tentativas_envio INTEGER DEFAULT 0,
  ultima_falha TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);
```

#### **pagamentos**
```sql
CREATE TABLE pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id UUID REFERENCES faturas(id),
  cliente_id UUID REFERENCES clientes(id),
  
  -- Dados Pagamento
  valor DECIMAL(10,2) NOT NULL,
  valor_taxa DECIMAL(10,2),
  valor_liquido DECIMAL(10,2),
  metodo_pagamento VARCHAR(20),
  
  -- Datas
  data_pagamento TIMESTAMP,
  data_confirmacao TIMESTAMP,
  
  -- Stripe
  stripe_payment_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  stripe_fee DECIMAL(10,2),
  
  -- Status
  status VARCHAR(20) CHECK (status IN ('confirmado', 'pendente', 'falhou', 'estornado')),
  
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);
```

---

## ⚙️ SISTEMA DE AUTOMAÇÃO

### 🕘 **CRON JOB - DETECÇÃO DE VENCIMENTOS**

**⚠️ CRÍTICO: Esta é a funcionalidade mais importante do sistema!**

#### **Implementação Recomendada**
```javascript
// CRON Job que executa diariamente às 09:00
const cron = require('node-cron');

cron.schedule('0 9 * * *', async () => {
  console.log('🔍 Verificando faturas próximas ao vencimento...');
  
  try {
    // 1. Buscar faturas que vencem em 3 dias
    const faturas3Dias = await db.query(`
      SELECT f.*, c.nome, c.whatsapp, c.email 
      FROM faturas f
      JOIN clientes_cobranca cc ON f.cliente_id = cc.cliente_id
      JOIN clientes c ON cc.cliente_id = c.id
      WHERE f.data_vencimento = CURRENT_DATE + INTERVAL '3 days'
      AND f.status = 'pendente'
      AND cc.receber_whatsapp = true
      AND cc.ativo = true
    `);

    // 2. Para cada fatura, criar notificação e disparar webhook
    for (const fatura of faturas3Dias) {
      await processarNotificacaoAutomatica(fatura, 'lembrete_3_dias');
    }

    // 3. Buscar faturas que vencem em 1 dia
    const faturas1Dia = await db.query(`
      SELECT f.*, c.nome, c.whatsapp, c.email 
      FROM faturas f
      JOIN clientes_cobranca cc ON f.cliente_id = cc.cliente_id
      JOIN clientes c ON cc.cliente_id = c.id
      WHERE f.data_vencimento = CURRENT_DATE + INTERVAL '1 day'
      AND f.status = 'pendente'
      AND cc.receber_whatsapp = true
    `);

    for (const fatura of faturas1Dia) {
      await processarNotificacaoAutomatica(fatura, 'lembrete_1_dia');
    }

    // 4. Buscar faturas que vencem hoje
    const faturasHoje = await db.query(`
      SELECT f.*, c.nome, c.whatsapp, c.email 
      FROM faturas f
      JOIN clientes_cobranca cc ON f.cliente_id = cc.cliente_id
      JOIN clientes c ON cc.cliente_id = c.id
      WHERE f.data_vencimento = CURRENT_DATE
      AND f.status = 'pendente'
    `);

    for (const fatura of faturasHoje) {
      await processarNotificacaoAutomatica(fatura, 'vencimento_hoje');
    }

    // 5. Atualizar status de faturas vencidas
    await db.query(`
      UPDATE faturas 
      SET status = 'vencida', atualizado_em = NOW()
      WHERE data_vencimento < CURRENT_DATE 
      AND status = 'pendente'
    `);

    console.log('✅ Verificação concluída com sucesso');
    
  } catch (error) {
    console.error('❌ Erro na verificação de vencimentos:', error);
    // Implementar notificação para admins em caso de falha
  }
});

// Função principal de processamento
const processarNotificacaoAutomatica = async (fatura, tipo) => {
  try {
    // 1. Criar registro de notificação
    const notificacao = await db.query(`
      INSERT INTO notificacoes_automaticas 
      (fatura_id, cliente_id, tipo, canal, data_agendada, status)
      VALUES ($1, $2, $3, 'whatsapp', NOW(), 'agendada')
      RETURNING id
    `, [fatura.id, fatura.cliente_id, tipo]);

    // 2. Preparar payload para n8n
    const payload = {
      evento: 'lembrete_pagamento',
      notificacao_id: notificacao.rows[0].id,
      fatura: {
        id: fatura.id,
        numero: fatura.numero_fatura,
        valor: fatura.valor,
        vencimento: fatura.data_vencimento,
        linkPagamento: fatura.link_pagamento
      },
      cliente: {
        id: fatura.cliente_id,
        nome: fatura.nome,
        whatsapp: fatura.whatsapp,
        email: fatura.email
      },
      tipo: tipo
    };

    // 3. Disparar webhook para n8n
    const response = await fetch(process.env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      // 4. Marcar como enviada
      await db.query(`
        UPDATE notificacoes_automaticas 
        SET status = 'enviada', data_enviada = NOW()
        WHERE id = $1
      `, [notificacao.rows[0].id]);
      
      // 5. Atualizar última notificação na fatura
      await db.query(`
        UPDATE faturas 
        SET ultima_notificacao = NOW(), tentativas_cobranca = tentativas_cobranca + 1
        WHERE id = $1
      `, [fatura.id]);
      
      console.log(`📲 Notificaç��o ${tipo} enviada para ${fatura.nome}`);
    } else {
      throw new Error('Falha na resposta do webhook n8n');
    }

  } catch (error) {
    console.error(`❌ Erro ao processar notificação para fatura ${fatura.numero_fatura}:`, error);
    
    // Marcar como falha
    await db.query(`
      UPDATE notificacoes_automaticas 
      SET status = 'falhou', ultima_falha = $1, tentativas_envio = tentativas_envio + 1
      WHERE fatura_id = $2 AND tipo = $3
    `, [error.message, fatura.id, tipo]);
  }
};
```

### 🔄 **RETRY MECHANISM**

```javascript
// CRON para reprocessar notificações que falharam
cron.schedule('*/30 * * * *', async () => {
  console.log('🔄 Reprocessando notificações que falharam...');
  
  const notificacoesFalharam = await db.query(`
    SELECT * FROM notificacoes_automaticas
    WHERE status = 'falhou' 
    AND tentativas_envio < 3
    AND data_agendada > NOW() - INTERVAL '24 hours'
  `);

  for (const notificacao of notificacoesFalharam.rows) {
    // Tentar reenviar
    await reprocessarNotificacao(notificacao);
  }
});
```

---

## 📡 ENDPOINTS DA API

### 📊 **Dashboard**
```
GET /api/recebiveis/dashboard
Response: DashboardRecebiveis
```

### 💰 **Faturas**
```
GET    /api/recebiveis/faturas              # Listar com filtros
POST   /api/recebiveis/faturas              # Criar nova
GET    /api/recebiveis/faturas/{id}         # Detalhes
PATCH  /api/recebiveis/faturas/{id}         # Atualizar
DELETE /api/recebiveis/faturas/{id}         # Cancelar

POST   /api/recebiveis/faturas/lote-cobranca # Cobrança em lote
POST   /api/recebiveis/notificar/{id}        # Notificar manualmente
```

### 👥 **Clientes**
```
GET    /api/recebiveis/clientes             # Listar clientes
GET    /api/recebiveis/clientes/{id}        # Dados de cobrança
PATCH  /api/recebiveis/clientes/{id}        # Atualizar dados
```

### 🔔 **Notificações**
```
GET    /api/recebiveis/notificacoes         # Histórico
POST   /api/recebiveis/notificacoes         # Criar manual
```

### ⚙️ **Configurações**
```
GET    /api/recebiveis/configuracoes        # Buscar config
PATCH  /api/recebiveis/configuracoes        # Atualizar
```

### 📈 **Relatórios**
```
GET    /api/recebiveis/relatorios/financeiro
GET    /api/recebiveis/relatorios/cobrancas
GET    /api/recebiveis/relatorios/performance
```

### 🎣 **Webhooks**
```
POST   /webhooks/stripe                     # Stripe events
POST   /webhooks/n8n-callback               # n8n confirmations
POST   /webhooks/whatsapp                   # WhatsApp status
```

---

## 🚀 IMPLEMENTAÇÃO EM FASES

### **FASE 1: Base (2-3 semanas)**
- ✅ Estrutura de dados (PostgreSQL)
- ✅ CRUD de faturas e clientes
- ✅ Integração básica com Stripe
- ✅ Interface do usuário principal

### **FASE 2: Automação (2-3 semanas)**
- 🤖 CRON job de detecção de vencimentos
- 🔗 Integração com n8n
- 📱 Setup WhatsApp Business API
- 📊 Sistema de notificações

### **FASE 3: Inteligência (1-2 semanas)**
- 📈 Relatórios avançados
- 🎯 Segmentação de clientes
- 📊 Analytics de performance
- 🔄 Retry automático

### **FASE 4: Otimização (1 semana)**
- ⚡ Performance optimization
- 🛡️ Security hardening
- 📱 Mobile responsiveness
- 🧪 Testes automatizados

---

## 🛡️ SEGURANÇA E COMPLIANCE

### 🔐 **Dados Sensíveis**
- **Criptografia**: Dados financeiros em rest e transit
- **Tokens**: Rotação automática de API keys
- **Logs**: Auditoria completa de operações financeiras
- **LGPD**: Consentimento explícito para comunicações

### 🔒 **API Security**
- **Authentication**: JWT com refresh tokens
- **Rate Limiting**: Por IP e usuário
- **CORS**: Configuração restritiva
- **Input Validation**: Sanitização de todos os inputs

### 💳 **PCI Compliance**
- **Stripe**: Não armazenar dados de cartão
- **Tokenização**: Uso exclusivo de tokens Stripe
- **SSL**: HTTPS obrigatório em produção
- **Webhooks**: Verificação de assinatura

---

## 📊 MONITORAMENTO E MÉTRICAS

### 📈 **KPIs Principais**
- **Taxa de Cobrança**: % de faturas pagas no prazo
- **Tempo Médio de Pagamento**: Dias entre emissão e pagamento
- **Taxa de Conversão**: % de links de pagamento utilizados
- **Eficácia das Notificações**: % de pagamentos após notificação

### 🔍 **Logs Críticos**
- Execução de CRON jobs
- Falhas de integração (Stripe, n8n, WhatsApp)
- Pagamentos processados
- Notificações enviadas/falharam

### 🚨 **Alertas**
- CRON job falhou por mais de 2 execuções
- Taxa de falha de notificações > 10%
- Webhook Stripe fora do ar
- Faturas vencidas não processadas

---

## 🧪 TESTES RECOMENDADOS

### **Testes Unitários**
- Cálculo de dias até vencimento
- Validação de dados de fatura
- Formatação de mensagens WhatsApp

### **Testes de Integração**
- Fluxo completo Stripe
- Webhook n8n end-to-end
- CRON job execution

### **Testes de Performance**
- Processamento de 1000+ faturas
- Envio simultâneo de notificações
- Consultas com grandes volumes

---

## 📞 SUPORTE E MANUTENÇÃO

### 🔧 **Manutenção Preventiva**
- **Limpeza de logs**: Rotação automática (30 dias)
- **Backup de dados**: Diário com retenção de 90 dias
- **Atualização de tokens**: Verificação semanal
- **Monitoramento de APIs**: Health checks automáticos

### 📚 **Documentação para Usuários**
- Manual de configuração inicial
- Guia de troubleshooting
- FAQ de integrações
- Vídeos tutoriais

---

## 🎯 CONCLUSÃO

O sistema de **Gestão de Recebíveis** oferece uma solução completa e profissional para automação de cobranças. A integração entre Stripe, n8n e WhatsApp cria um fluxo inteligente que:

1. **Detecta automaticamente** faturas próximas ao vencimento
2. **Envia notificações personalizadas** via WhatsApp 
3. **Facilita o pagamento** com links diretos do Stripe
4. **Monitora a performance** com métricas detalhadas
5. **Reduz inadimplência** através de lembretes inteligentes

A arquitetura modular permite implementação em fases e fácil manutenção. O sistema foi projetado para escalar e se adaptar às necessidades específicas do escritório de advocacia.

**🚀 Próximos Passos:**
1. Configurar ambiente de desenvolvimento
2. Implementar estrutura de dados
3. Desenvolver integração com Stripe
4. Configurar automação n8n
5. Testes e deploy em produção

---

*Este documento deve ser mantido atualizado conforme evolução do sistema. Para dúvidas técnicas ou sugestões de melhorias, consulte a equipe de desenvolvimento.*
