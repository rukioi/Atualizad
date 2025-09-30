# 🚨 ERROR HANDLING COMPLETO - CENÁRIOS E TRATAMENTOS

## 🎯 VISÃO GERAL

Este documento detalha todos os cenários de erro possíveis no sistema SAAS de advocacia, suas causas, tratamentos e estratégias de recuperação. Cada erro está categorizado por severidade e módulo afetado.

---

## 🏗️ CLASSIFICAÇÃO DE ERROS

### Níveis de Severidade:

- 🔴 **CRÍTICO**: Sistema inoperante ou perda de dados
- 🟠 **ALTO**: Funcionalidade principal comprometida
- 🟡 **MÉDIO**: Funcionalidade secundária afetada
- 🟢 **BAIXO**: Inconveniente menor, sistema funcional

### Categorias:

- **🔐 Autenticação/Autorização**
- **🗄️ Banco de Dados**
- **🌐 APIs Externas**
- **📁 Arquivos/Storage**
- **🔔 Notificações**
- **💰 Pagamentos**
- **🏢 Multi-tenant**
- **⚡ Performance**

---

## 🔐 ERROS DE AUTENTICAÇÃO E AUTORIZAÇÃO

### 🚨 Token JWT Expirado

**Severidade**: 🟡 MÉDIO  
**Código**: `AUTH_001`

**Causa**:

```javascript
// Token access expirou (15 minutos)
const decoded = jwt.verify(token, secret); // Throws TokenExpiredError
```

**Tratamento**:

```javascript
const handleExpiredToken = async (req, res, next) => {
  try {
    const decoded = jwt.verify(token, jwtConfig.accessToken.secret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expirado",
        code: "AUTH_001",
        message: "Por favor, faça login novamente",
        action: "REDIRECT_TO_LOGIN",
      });
    }
    throw error;
  }
};
```

**Estratégia de Recuperação**:

1. Frontend detecta código `AUTH_001`
2. Tenta refresh automático com refresh token
3. Se refresh falha, redireciona para login
4. Usuário perde trabalho não salvo (implementar auto-save)

---

### 🚨 Refresh Token Inválido/Rotativo

**Severidade**: 🟠 ALTO  
**Código**: `AUTH_002`

**Causa**:

- Refresh token usado mais de uma vez
- Token comprometido ou expirado
- Tentativa de ataque

**Tratamento**:

```javascript
const handleInvalidRefreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, jwtConfig.refreshToken.secret);

    // Verificar se token existe no banco
    const storedToken = await db.refresh_tokens.findByUserId(decoded.userId);
    const isValid = await bcrypt.compare(refreshToken, storedToken.token_hash);

    if (!isValid) {
      // ALERTA DE SEGURANÇA - possível token comprometido
      await securityAlert.tokenCompromised(decoded.userId, req.ip);

      // Invalidar TODOS os tokens do usuário
      await db.refresh_tokens.invalidateAllForUser(decoded.userId);

      throw new Error("Token comprometido");
    }

    // Continuar com rotação normal...
  } catch (error) {
    return {
      error: "Refresh token inválido",
      code: "AUTH_002",
      severity: "HIGH",
      action: "FORCE_LOGOUT_ALL_DEVICES",
      details: error.message,
    };
  }
};
```

**Estratégia de Recuperação**:

1. Logout forçado em todos os dispositivos
2. Invalidação de todos os tokens
3. Email de alerta de segurança para o usuário
4. Log de auditoria detalhado

---

### 🚨 Tentativa de Acesso Cross-Tenant

**Severidade**: 🔴 CRÍTICO  
**Código**: `AUTH_003`

**Causa**:

```javascript
// Usuário tenta acessar dados de outro tenant
const clientData = await db.clients.findById(clientId);
if (clientData.tenant_id !== req.user.tenant_id) {
  // VIOLAÇÃO CRÍTICA DE SEGURANÇA
}
```

**Tratamento**:

```javascript
const validateTenantAccess = async (resourceTenantId, userTenantId, req) => {
  if (resourceTenantId !== userTenantId) {
    // Log crítico de segurança
    await securityLog.critical({
      type: "CROSS_TENANT_ACCESS_ATTEMPT",
      user_id: req.user.id,
      user_tenant: userTenantId,
      attempted_tenant: resourceTenantId,
      resource: req.path,
      ip_address: req.ip,
      user_agent: req.get("User-Agent"),
      timestamp: new Date(),
    });

    // Alerta imediato para administradores
    await alertService.securityBreach({
      severity: "CRITICAL",
      message: "Tentativa de acesso cross-tenant detectada",
      user: req.user,
      details: { resourceTenantId, userTenantId },
    });

    // Suspender conta temporariamente
    await userService.suspendAccount(req.user.id, "SECURITY_VIOLATION");

    throw new SecurityError("Acesso negado", "AUTH_003");
  }
};
```

**Estratégia de Recuperação**:

1. Suspensão imediata da conta
2. Alerta para administradores do sistema
3. Investigação de segurança obrigatória
4. Possível auditoria completa do tenant

---

## 🗄️ ERROS DE BANCO DE DADOS

### 🚨 Falha de Conexão com PostgreSQL

**Severidade**: 🔴 CRÍTICO  
**Código**: `DB_001`

**Causa**:

- Servidor PostgreSQL inativo
- Problemas de rede
- Credenciais inválidas
- Pool de conexões esgotado

**Tratamento**:

```javascript
const handleDatabaseError = async (error, operation) => {
  const errorHandlers = {
    ECONNREFUSED: {
      code: "DB_001",
      message: "Banco de dados indisponível",
      severity: "CRITICAL",
      action: "RETRY_WITH_BACKOFF",
    },
    ENOTFOUND: {
      code: "DB_002",
      message: "Servidor de banco não encontrado",
      severity: "CRITICAL",
      action: "FAILOVER_TO_REPLICA",
    },
    ECONNRESET: {
      code: "DB_003",
      message: "Conexão com banco resetada",
      severity: "HIGH",
      action: "RETRY_IMMEDIATE",
    },
  };

  const handler = errorHandlers[error.code] || {
    code: "DB_999",
    message: "Erro de banco desconhecido",
    severity: "HIGH",
    action: "LOG_AND_RETRY",
  };

  // Log estruturado
  await logger.error("Database Error", {
    error_code: handler.code,
    severity: handler.severity,
    operation: operation,
    error_message: error.message,
    stack_trace: error.stack,
    connection_pool_stats: await db.getPoolStats(),
  });

  // Estratégia de recuperação baseada no tipo de erro
  switch (handler.action) {
    case "RETRY_WITH_BACKOFF":
      return await retryWithExponentialBackoff(operation, 3);
    case "FAILOVER_TO_REPLICA":
      return await failoverToReadReplica(operation);
    case "RETRY_IMMEDIATE":
      return await retryImmediate(operation, 1);
    default:
      throw new DatabaseError(handler.message, handler.code);
  }
};

const retryWithExponentialBackoff = async (operation, maxRetries) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000),
      );
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await logger.warn(`Retry attempt ${attempt}/${maxRetries} failed`, {
        error: error.message,
      });
    }
  }
};
```

**Estratégia de Recuperação**:

1. **Retry automático** com backoff exponencial
2. **Failover** para read replica (operações de leitura)
3. **Circuit breaker** para prevenir cascata de falhas
4. **Health check** contínuo e alertas

---

### 🚨 Deadlock na Transação

**Severidade**: 🟡 MÉDIO  
**Código**: `DB_004`

**Causa**:

```sql
-- Transação 1
BEGIN;
UPDATE clients SET name = 'New Name' WHERE id = 'client-1';
UPDATE projects SET status = 'active' WHERE client_id = 'client-1';

-- Transação 2 (simultânea)
BEGIN;
UPDATE projects SET budget = 50000 WHERE client_id = 'client-1';
UPDATE clients SET status = 'updated' WHERE id = 'client-1';
-- DEADLOCK detectado pelo PostgreSQL
```

**Tratamento**:

```javascript
const handleDeadlock = async (operation, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await db.transaction(async (trx) => {
        // Implementar ordem consistente de lock
        await trx.raw("SET LOCAL lock_timeout = 5000"); // 5 segundos
        return await operation(trx);
      });
    } catch (error) {
      if (error.code === "40P01" && attempt < maxRetries) {
        // PostgreSQL deadlock
        const backoffTime = Math.random() * Math.pow(2, attempt) * 100; // Jitter
        await new Promise((resolve) => setTimeout(resolve, backoffTime));

        await logger.warn("Deadlock detectado, tentando novamente", {
          attempt: attempt,
          maxRetries: maxRetries,
          operation: operation.name,
        });

        continue;
      }
      throw new DatabaseError("Deadlock não resolvido", "DB_004", error);
    }
  }
};

// Prevenir deadlocks com ordem consistente
const lockOrder = {
  tables: ["users", "clients", "projects", "tasks", "invoices"],
  getOrder: (tables) => {
    return tables.sort(
      (a, b) => lockOrder.tables.indexOf(a) - lockOrder.tables.indexOf(b),
    );
  },
};
```

**Estratégia de Recuperação**:

1. **Retry automático** com jitter para evitar sincronização
2. **Ordem consistente** de aquisição de locks
3. **Timeout** nas transações para evitar locks prolongados
4. **Monitoramento** de deadlocks frequentes

---

### 🚨 Schema de Tenant Corrompido

**Severidade**: 🔴 CRÍTICO  
**Código**: `DB_005`

**Causa**:

- Migration incompleta
- Corruption de dados
- Acesso direto indevido ao banco

**Tratamento**:

```javascript
const validateTenantSchema = async (tenantId) => {
  const requiredTables = [
    "users",
    "clients",
    "projects",
    "tasks",
    "cash_flow",
    "billing",
    "invoices",
    "audit_log",
  ];

  const schemaName = `tenant_${tenantId}`;

  try {
    // Verificar existência do schema
    const schemaExists = await db.query(
      `
      SELECT 1 FROM information_schema.schemata 
      WHERE schema_name = $1
    `,
      [schemaName],
    );

    if (schemaExists.length === 0) {
      throw new SchemaError("Schema não encontrado", "DB_005_SCHEMA_MISSING");
    }

    // Verificar tabelas obrigatórias
    const existingTables = await db.query(
      `
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = $1
    `,
      [schemaName],
    );

    const missingTables = requiredTables.filter(
      (table) =>
        !existingTables.some((existing) => existing.table_name === table),
    );

    if (missingTables.length > 0) {
      await emergencyService.recreateTenantSchema(tenantId, missingTables);

      throw new SchemaError(
        `Tabelas ausentes: ${missingTables.join(", ")}`,
        "DB_005_TABLES_MISSING",
      );
    }

    // Verificar integridade das constraints
    await validateConstraints(schemaName);
  } catch (error) {
    await logger.critical("Schema corruption detected", {
      tenant_id: tenantId,
      error: error.message,
      schema_name: schemaName,
    });

    // Colocar tenant em modo de manutenção
    await tenantService.setMaintenanceMode(tenantId, true);

    // Alerta crítico para equipe técnica
    await alertService.critical({
      type: "SCHEMA_CORRUPTION",
      tenant_id: tenantId,
      error: error.message,
      action_required: "IMMEDIATE_INTERVENTION",
    });

    throw error;
  }
};
```

**Estratégia de Recuperação**:

1. **Modo de manutenção** imediato para o tenant
2. **Backup restore** da última versão íntegra
3. **Recriação do schema** com migrations
4. **Auditoria completa** dos dados

---

## 🌐 ERROS DE APIS EXTERNAS

### 🚨 Stripe API - Falha de Pagamento

**Severidade**: 🟠 ALTO  
**Código**: `STRIPE_001`

**Causa**:

- Cartão rejeitado
- Insufficient funds
- API rate limit
- Webhook delivery failure

**Tratamento**:

```javascript
const handleStripeError = async (error, context) => {
  const stripeErrorHandlers = {
    card_declined: {
      code: "STRIPE_001",
      user_message:
        "Cartão recusado. Verifique os dados ou tente outro cartão.",
      internal_action: "LOG_AND_NOTIFY_USER",
      retry: false,
    },
    insufficient_funds: {
      code: "STRIPE_002",
      user_message: "Saldo insuficiente. Verifique sua conta.",
      internal_action: "LOG_AND_NOTIFY_USER",
      retry: false,
    },
    rate_limit_error: {
      code: "STRIPE_003",
      user_message: "Muitas tentativas. Tente novamente em alguns minutos.",
      internal_action: "EXPONENTIAL_BACKOFF",
      retry: true,
    },
    api_connection_error: {
      code: "STRIPE_004",
      user_message: "Erro temporário no processamento. Tente novamente.",
      internal_action: "RETRY_WITH_BACKOFF",
      retry: true,
    },
  };

  const handler = stripeErrorHandlers[error.type] || {
    code: "STRIPE_999",
    user_message: "Erro no processamento do pagamento.",
    internal_action: "LOG_AND_ALERT",
    retry: false,
  };

  // Log detalhado
  await logger.error("Stripe API Error", {
    error_code: handler.code,
    stripe_error_type: error.type,
    stripe_error_code: error.code,
    user_message: handler.user_message,
    context: context,
    payment_intent_id: context.payment_intent_id,
    amount: context.amount,
    tenant_id: context.tenant_id,
  });

  // Atualizar status da fatura
  if (context.invoice_id) {
    await db.invoices.update(context.invoice_id, {
      status: "payment_failed",
      payment_error: handler.user_message,
      last_payment_attempt: new Date(),
    });
  }

  // Notificar cliente sobre falha
  await notificationService.paymentFailed({
    tenant_id: context.tenant_id,
    invoice_id: context.invoice_id,
    error_message: handler.user_message,
    retry_available: handler.retry,
  });

  // Estratégias específicas
  switch (handler.internal_action) {
    case "EXPONENTIAL_BACKOFF":
      return await schedulePaymentRetry(context, calculateBackoffDelay());
    case "RETRY_WITH_BACKOFF":
      return await retryPaymentAfterDelay(context, 30000); // 30 segundos
    default:
      return {
        success: false,
        error: handler.user_message,
        code: handler.code,
      };
  }
};

const schedulePaymentRetry = async (context, delayMs) => {
  await paymentQueue.add(
    "retry-payment",
    {
      ...context,
      retry_count: (context.retry_count || 0) + 1,
    },
    {
      delay: delayMs,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 10000,
      },
    },
  );
};
```

**Estratégia de Recuperação**:

1. **Retry automático** para erros temporários
2. **Notificação imediata** para cliente
3. **Scheduling** de tentativas futuras
4. **Fallback** para outros métodos de pagamento

---

### 🚨 Resend API - Falha no Envio de Email

**Severidade**: 🟡 MÉDIO  
**Código**: `RESEND_001`

**Causa**:

- Rate limit excedido
- Email inválido
- Domínio não verificado
- API temporariamente indisponível

**Tratamento**:

```javascript
const handleResendError = async (error, emailData, tenantId) => {
  const resendErrorHandlers = {
    rate_limit_exceeded: {
      code: "RESEND_001",
      action: "QUEUE_FOR_LATER",
      delay: 3600000, // 1 hora
      severity: "MEDIUM",
    },
    invalid_email: {
      code: "RESEND_002",
      action: "MARK_INVALID_EMAIL",
      delay: 0,
      severity: "LOW",
    },
    domain_not_verified: {
      code: "RESEND_003",
      action: "ALERT_ADMIN",
      delay: 0,
      severity: "HIGH",
    },
    api_error: {
      code: "RESEND_004",
      action: "RETRY_LATER",
      delay: 300000, // 5 minutos
      severity: "MEDIUM",
    },
  };

  const handler =
    resendErrorHandlers[error.type] || resendErrorHandlers["api_error"];

  // Log do erro
  await db.email_log.create({
    tenant_id: tenantId,
    to_email: emailData.to,
    subject: emailData.subject,
    status: "failed",
    error_code: handler.code,
    error_message: error.message,
    attempted_at: new Date(),
  });

  // Ações específicas
  switch (handler.action) {
    case "QUEUE_FOR_LATER":
      await emailQueue.add(
        "send-email",
        {
          emailData,
          tenantId,
          retry_count: (emailData.retry_count || 0) + 1,
        },
        {
          delay: handler.delay,
          attempts: 3,
        },
      );
      break;

    case "MARK_INVALID_EMAIL":
      await db.clients.update(
        { email: emailData.to },
        { email_status: "invalid", email_validated_at: new Date() },
      );
      break;

    case "ALERT_ADMIN":
      await alertService.high({
        type: "EMAIL_DOMAIN_NOT_VERIFIED",
        tenant_id: tenantId,
        message: "Domínio de email não verificado no Resend",
        action_required: "VERIFY_DOMAIN",
      });
      break;

    case "RETRY_LATER":
      await emailQueue.add(
        "send-email",
        {
          emailData,
          tenantId,
        },
        {
          delay: handler.delay,
          attempts: 2,
        },
      );
      break;
  }

  return { success: false, code: handler.code, action: handler.action };
};
```

**Estratégia de Recuperação**:

1. **Queue system** para retry automático
2. **Validação de emails** inválidos
3. **Alertas** para problemas de configuração
4. **Fallback** para outros provedores de email

---

### 🚨 WhatsApp API (n8n) - Timeout/Indisponível

**Severidade**: 🟡 MÉDIO  
**Código**: `WHATSAPP_001`

**Tratamento**:

```javascript
const handleWhatsAppError = async (error, messageData, tenantId) => {
  const errorTypes = {
    TIMEOUT: {
      code: "WHATSAPP_001",
      action: "RETRY_AFTER_DELAY",
      delay: 60000, // 1 minuto
    },
    RATE_LIMITED: {
      code: "WHATSAPP_002",
      action: "QUEUE_FOR_NEXT_WINDOW",
      delay: 3600000, // 1 hora
    },
    INVALID_NUMBER: {
      code: "WHATSAPP_003",
      action: "MARK_INVALID_PHONE",
      delay: 0,
    },
    SERVICE_UNAVAILABLE: {
      code: "WHATSAPP_004",
      action: "FALLBACK_TO_EMAIL",
      delay: 0,
    },
  };

  const handler = errorTypes[error.type] || errorTypes["SERVICE_UNAVAILABLE"];

  // Log da tentativa
  await db.whatsapp_log.create({
    tenant_id: tenantId,
    phone: messageData.phone,
    message: messageData.message,
    status: "failed",
    error_code: handler.code,
    error_message: error.message,
    attempted_at: new Date(),
  });

  // Estratégias de recuperação
  switch (handler.action) {
    case "RETRY_AFTER_DELAY":
      await whatsappQueue.add(
        "send-message",
        {
          messageData,
          tenantId,
          retry_count: (messageData.retry_count || 0) + 1,
        },
        { delay: handler.delay },
      );
      break;

    case "FALLBACK_TO_EMAIL":
      // Converter mensagem WhatsApp para email
      if (messageData.fallback_email) {
        const emailData = {
          to: messageData.fallback_email,
          subject: "Notificação Importante",
          html: convertWhatsAppToEmail(messageData.message),
        };
        await emailService.sendEmail(emailData, tenantId);
      }
      break;

    case "MARK_INVALID_PHONE":
      await db.clients.update(
        { phone: messageData.phone },
        { phone_status: "invalid", phone_validated_at: new Date() },
      );
      break;
  }

  return { success: false, code: handler.code, fallback_used: handler.action };
};
```

---

## 📁 ERROS DE ARQUIVOS E STORAGE

### 🚨 Falha no Upload AWS S3

**Severidade**: 🟠 ALTO  
**Código**: `S3_001`

**Causa**:

- Credenciais AWS inválidas
- Bucket não existe
- Permissões insuficientes
- Arquivo muito grande

**Tratamento**:

```javascript
const handleS3Error = async (error, fileData, tenantId) => {
  const s3ErrorHandlers = {
    NoSuchBucket: {
      code: "S3_001",
      message: "Bucket de armazenamento não encontrado",
      action: "CREATE_BUCKET_OR_ALERT",
      severity: "HIGH",
    },
    AccessDenied: {
      code: "S3_002",
      message: "Permissões insuficientes para upload",
      action: "CHECK_CREDENTIALS",
      severity: "HIGH",
    },
    EntityTooLarge: {
      code: "S3_003",
      message: "Arquivo muito grande para upload",
      action: "REJECT_FILE",
      severity: "LOW",
    },
    NetworkingError: {
      code: "S3_004",
      message: "Erro de conexão com AWS",
      action: "RETRY_WITH_BACKOFF",
      severity: "MEDIUM",
    },
  };

  const handler = s3ErrorHandlers[error.code] || {
    code: "S3_999",
    message: "Erro desconhecido no S3",
    action: "LOG_AND_ALERT",
    severity: "MEDIUM",
  };

  // Log detalhado
  await logger.error("S3 Upload Error", {
    error_code: handler.code,
    s3_error_code: error.code,
    severity: handler.severity,
    file_name: fileData.originalname,
    file_size: fileData.size,
    tenant_id: tenantId,
    bucket: process.env.S3_BUCKET_NAME,
    aws_region: process.env.AWS_REGION,
  });

  // Estratégias específicas
  switch (handler.action) {
    case "CREATE_BUCKET_OR_ALERT":
      try {
        await s3.createBucket({ Bucket: process.env.S3_BUCKET_NAME }).promise();
        // Retry o upload
        return await retryS3Upload(fileData, tenantId);
      } catch (createError) {
        await alertService.critical({
          type: "S3_BUCKET_MISSING",
          message: "Bucket S3 não existe e não pôde ser criado",
          error: createError.message,
        });
      }
      break;

    case "CHECK_CREDENTIALS":
      await alertService.high({
        type: "S3_CREDENTIALS_INVALID",
        message: "Credenciais AWS podem estar inválidas",
        action_required: "VERIFY_AWS_CREDENTIALS",
      });
      break;

    case "REJECT_FILE":
      return {
        success: false,
        code: handler.code,
        message: `Arquivo muito grande. Máximo permitido: ${MAX_FILE_SIZE_MB}MB`,
      };

    case "RETRY_WITH_BACKOFF":
      return await retryWithBackoff(() => uploadToS3(fileData, tenantId), 3);
  }

  throw new StorageError(handler.message, handler.code);
};

// Fallback para storage local temporário
const fallbackToLocalStorage = async (fileData, tenantId) => {
  const localPath = `temp/${tenantId}/${Date.now()}_${fileData.originalname}`;

  await fs.writeFile(localPath, fileData.buffer);

  // Agendar tentativa de upload para S3 mais tarde
  await fileUploadQueue.add(
    "retry-s3-upload",
    {
      localPath,
      tenantId,
      originalData: fileData,
    },
    { delay: 300000 },
  ); // 5 minutos

  return {
    success: true,
    temporary: true,
    local_path: localPath,
    message:
      "Arquivo salvo temporariamente. Upload para cloud será tentado novamente.",
  };
};
```

**Estratégia de Recuperação**:

1. **Retry automático** com backoff exponencial
2. **Fallback** para storage local temporário
3. **Queue** para tentar upload posterior
4. **Alertas** para problemas de infraestrutura

---

### 🚨 Limite de Arquivos Excedido

**Severidade**: 🟢 BAIXO  
**Código**: `FILE_001`

**Tratamento**:

```javascript
const validateFileUploadLimits = async (tenantId, entityId, newFile) => {
  // Verificar limite por entidade
  const currentFiles = await db.file_attachments.count({
    where: { tenant_id: tenantId, entity_id: entityId },
  });

  const tenantConfig = await db.tenant_config.findByTenantId(tenantId);
  const maxFiles = tenantConfig?.max_files_per_entity || 3;

  if (currentFiles >= maxFiles) {
    throw new ValidationError(
      `Limite de ${maxFiles} arquivos por item atingido`,
      "FILE_001",
    );
  }

  // Verificar tamanho total do tenant
  const totalSize = await db.file_attachments.sum("file_size", {
    where: { tenant_id: tenantId },
  });

  const maxStorage = tenantConfig?.max_storage_bytes || 1024 * 1024 * 1024; // 1GB

  if (totalSize + newFile.size > maxStorage) {
    throw new ValidationError(
      "Limite de armazenamento do tenant excedido",
      "FILE_002",
    );
  }
};
```

---

## 🔔 ERROS DE NOTIFICAÇÕES

### 🚨 Queue de Notificações Congestionada

**Severidade**: 🟡 MÉDIO  
**Código**: `NOTIF_001`

**Tratamento**:

```javascript
const monitorNotificationQueue = async () => {
  const queueStats = await notificationQueue.getWaiting();
  const processingStats = await notificationQueue.getActive();

  const QUEUE_THRESHOLD = 1000;
  const PROCESSING_THRESHOLD = 100;

  if (queueStats.length > QUEUE_THRESHOLD) {
    await logger.warn("Notification queue congested", {
      waiting_jobs: queueStats.length,
      active_jobs: processingStats.length,
      threshold: QUEUE_THRESHOLD,
    });

    // Escalar workers temporariamente
    await scaleNotificationWorkers(5); // +5 workers

    // Pausar notificações não-críticas
    await pauseNonCriticalNotifications();

    // Alerta para equipe
    await alertService.medium({
      type: "QUEUE_CONGESTION",
      service: "notifications",
      waiting_jobs: queueStats.length,
      action: "SCALED_WORKERS",
    });
  }

  // Detectar jobs presos
  const stuckJobs = await notificationQueue.getJobs(["stuck"], 0, 10);
  if (stuckJobs.length > 0) {
    await logger.error("Stuck notification jobs detected", {
      stuck_count: stuckJobs.length,
      job_ids: stuckJobs.map((job) => job.id),
    });

    // Reprocessar jobs presos
    for (const job of stuckJobs) {
      await job.retry();
    }
  }
};

const pauseNonCriticalNotifications = async () => {
  const nonCriticalTypes = [
    "task_reminder",
    "project_update",
    "weekly_summary",
  ];

  await db.scheduled_notifications.update(
    {
      type: { in: nonCriticalTypes },
      status: "pending",
    },
    {
      status: "paused",
      paused_reason: "queue_congestion",
      paused_at: new Date(),
    },
  );
};
```

---

## 💰 ERROS DE PAGAMENTOS

### 🚨 Webhook Stripe Não Recebido

**Severidade**: 🟠 ALTO  
**Código**: `PAYMENT_001`

**Causa**:

- Problema de rede
- Endpoint indisponível
- Webhook mal configurado

**Tratamento**:

```javascript
const detectMissingWebhooks = async () => {
  // Buscar pagamentos pendentes há mais de 10 minutos
  const pendingPayments = await db.payments.findMany({
    where: {
      status: "pending",
      created_at: { lt: new Date(Date.now() - 10 * 60 * 1000) },
    },
  });

  for (const payment of pendingPayments) {
    try {
      // Verificar status diretamente na Stripe
      const stripePayment = await stripe.paymentIntents.retrieve(
        payment.stripe_payment_intent_id,
      );

      if (stripePayment.status === "succeeded") {
        // Webhook perdido - processar manualmente
        await logger.warn("Missing webhook detected", {
          payment_id: payment.id,
          stripe_payment_intent_id: payment.stripe_payment_intent_id,
          actual_status: stripePayment.status,
        });

        // Processar como se fosse webhook
        await processPaymentSuccess(stripePayment);

        // Alerta para investigação
        await alertService.medium({
          type: "MISSING_WEBHOOK",
          payment_id: payment.id,
          message: "Webhook não recebido, processado manualmente",
        });
      }
    } catch (error) {
      await logger.error("Error checking Stripe payment status", {
        payment_id: payment.id,
        error: error.message,
      });
    }
  }
};

// Executar verificação a cada 5 minutos
setInterval(detectMissingWebhooks, 5 * 60 * 1000);
```

---

## 🏢 ERROS MULTI-TENANT

### 🚨 Tenant Excedeu Limite de Usuários

**Severidade**: 🟡 MÉDIO  
**Código**: `TENANT_001`

**Tratamento**:

```javascript
const validateUserLimit = async (tenantId) => {
  const currentUsers = await db.users.count({
    where: { tenant_id: tenantId, is_active: true },
  });

  const tenantPlan = await db.tenant_plans.findByTenantId(tenantId);
  const maxUsers = tenantPlan.max_users;

  if (currentUsers >= maxUsers) {
    // Notificar administrador do tenant
    await notificationService.sendToTenantAdmins({
      tenant_id: tenantId,
      type: "USER_LIMIT_REACHED",
      message: `Limite de ${maxUsers} usuários atingido`,
      action_required: "UPGRADE_PLAN",
    });

    // Oferecer upgrade automático
    await billingService.suggestPlanUpgrade(tenantId, {
      reason: "USER_LIMIT_EXCEEDED",
      current_users: currentUsers,
      plan_limit: maxUsers,
    });

    throw new TenantLimitError(
      "Limite de usuários atingido. Faça upgrade do seu plano.",
      "TENANT_001",
    );
  }
};
```

---

## ⚡ ERROS DE PERFORMANCE

### 🚨 Query Lenta Detectada

**Severidade**: 🟡 MÉDIO  
**Código**: `PERF_001`

**Tratamento**:

```javascript
const queryPerformanceMiddleware = (slowThreshold = 1000) => {
  return async (req, res, next) => {
    const startTime = Date.now();

    // Override da função query para monitorar
    const originalQuery = req.db.query;
    req.db.query = async (...args) => {
      const queryStart = Date.now();
      const result = await originalQuery.apply(req.db, args);
      const queryDuration = Date.now() - queryStart;

      if (queryDuration > slowThreshold) {
        await logger.warn("Slow query detected", {
          tenant_id: req.tenantId,
          user_id: req.user?.id,
          endpoint: req.path,
          query_duration: queryDuration,
          sql: args[0],
          params: args[1],
        });

        // Sugerir otimização
        await performanceOptimizer.analyzeQuery({
          sql: args[0],
          duration: queryDuration,
          tenant_id: req.tenantId,
        });
      }

      return result;
    };

    next();

    const totalDuration = Date.now() - startTime;
    if (totalDuration > slowThreshold * 2) {
      await logger.warn("Slow endpoint detected", {
        endpoint: req.path,
        method: req.method,
        duration: totalDuration,
        tenant_id: req.tenantId,
      });
    }
  };
};
```

---

## 📊 MONITORAMENTO E ALERTAS

### Sistema de Alertas por Severidade:

```javascript
const alertService = {
  async critical(alert) {
    // PagerDuty, SMS, call
    await pagerDuty.trigger(alert);
    await sms.sendToOnCall(alert);
    await slack.sendToChannel("#critical-alerts", alert);
  },

  async high(alert) {
    // Slack, email
    await slack.sendToChannel("#alerts", alert);
    await email.sendToTeam(alert);
  },

  async medium(alert) {
    // Slack
    await slack.sendToChannel("#monitoring", alert);
  },

  async low(alert) {
    // Log apenas
    await logger.info("Low priority alert", alert);
  },
};
```

### Health Checks Contínuos:

```javascript
const healthChecks = {
  async database() {
    try {
      await db.query("SELECT 1");
      return { status: "healthy", latency: measureLatency() };
    } catch (error) {
      return { status: "unhealthy", error: error.message };
    }
  },

  async externalAPIs() {
    const apis = ["stripe", "resend", "whatsapp"];
    const results = {};

    for (const api of apis) {
      results[api] = await testAPIHealth(api);
    }

    return results;
  },

  async queues() {
    const queues = [notificationQueue, emailQueue, paymentQueue];
    const stats = {};

    for (const queue of queues) {
      stats[queue.name] = {
        waiting: await queue.getWaiting().length,
        active: await queue.getActive().length,
        failed: await queue.getFailed().length,
      };
    }

    return stats;
  },
};
```

---

## 🎯 RESUMO DE ESTRATÉGIAS

### Por Categoria de Erro:

1. **🔐 Autenticação**: Logout forçado + alertas de segurança
2. **🗄️ Banco de Dados**: Retry + failover + circuit breaker
3. **🌐 APIs Externas**: Queue + backoff + fallback
4. **📁 Storage**: Retry + local fallback + alertas
5. **🔔 Notificações**: Scale workers + pause não-críticos
6. **💰 Pagamentos**: Verificação ativa + alertas + reconciliação
7. **🏢 Multi-tenant**: Isolamento + limites + upgrades
8. **⚡ Performance**: Monitoramento + otimização + cache

### Princípios Gerais:

- **🔄 Graceful Degradation**: Sistema continua funcionando com funcionalidade reduzida
- **🚨 Fail Fast**: Detectar e reportar erros rapidamente
- **📝 Observabilidade**: Logs estruturados e métricas detalhadas
- **🔧 Auto-Recovery**: Tentativas automáticas de recuperação
- **👥 Human-in-the-Loop**: Alertas para intervenção quando necessário

---

_📅 Documento criado em: $(date)_  
_🔄 Última atualização: $(date)_  
_👤 Autor: Documentação Técnica - Error Handling_
