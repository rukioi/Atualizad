# 🛠️ PLAYBOOK TÉCNICO - DEVOPS E BACKEND

## 🔐 IMPLEMENTAÇÃO DE SEGURANÇA

### Sistema de Autenticação JWT + Refresh Rotativo

#### 🔑 Configuração JWT

```javascript
// config/jwt.js
const jwtConfig = {
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET,
    expiresIn: "15m",
    algorithm: "HS256",
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: "7d",
    algorithm: "HS256",
  },
};

// Middleware de validação JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token de acesso necessário" });
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.accessToken.secret);

    // Validar se usuário ainda está ativo
    const user = await db.users.findById(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: "Usuário inativo" });
    }

    // Adicionar informações do usuário e tenant à requisição
    req.user = user;
    req.tenant = decoded.tenant;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Token expirado", code: "TOKEN_EXPIRED" });
    }
    return res.status(403).json({ error: "Token inválido" });
  }
};
```

#### 🔄 Sistema de Refresh Token Rotativo

```javascript
// services/authService.js
class AuthService {
  async generateTokens(user) {
    const payload = {
      userId: user.id,
      tenantId: user.tenant_id,
      accountType: user.account_type,
      permissions: await this.getUserPermissions(user),
    };

    const accessToken = jwt.sign(payload, jwtConfig.accessToken.secret, {
      expiresIn: jwtConfig.accessToken.expiresIn,
    });

    const refreshToken = jwt.sign(
      { userId: user.id, type: "refresh" },
      jwtConfig.refreshToken.secret,
      { expiresIn: jwtConfig.refreshToken.expiresIn },
    );

    // Salvar refresh token no banco (com hash para segurança)
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await db.refresh_tokens.create({
      user_id: user.id,
      token_hash: hashedRefreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      is_active: true,
    });

    return { accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, jwtConfig.refreshToken.secret);

      // Verificar se refresh token existe no banco
      const storedTokens = await db.refresh_tokens.findActive(decoded.userId);
      const validToken = await Promise.all(
        storedTokens.map(async (stored) => {
          const isValid = await bcrypt.compare(refreshToken, stored.token_hash);
          return isValid ? stored : null;
        }),
      ).then((results) => results.find((token) => token !== null));

      if (!validToken) {
        throw new Error("Refresh token inválido");
      }

      // Invalidar o refresh token usado (rotação)
      await db.refresh_tokens.update(validToken.id, { is_active: false });

      // Buscar usuário atualizado
      const user = await db.users.findById(decoded.userId);
      if (!user || !user.is_active) {
        throw new Error("Usuário inativo");
      }

      // Gerar novos tokens
      return await this.generateTokens(user);
    } catch (error) {
      // Invalidar todos os refresh tokens do usuário em caso de erro
      await db.refresh_tokens.invalidateAllForUser(decoded.userId);
      throw new Error("Refresh token inválido");
    }
  }
}
```

#### 🛡️ Hash de Senhas

```javascript
// services/passwordService.js
const bcrypt = require("bcrypt");

class PasswordService {
  constructor() {
    this.saltRounds = 12; // Configuração forte para produção
  }

  async hashPassword(plainPassword) {
    // Validações de força da senha
    this.validatePasswordStrength(plainPassword);

    return await bcrypt.hash(plainPassword, this.saltRounds);
  }

  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  validatePasswordStrength(password) {
    const requirements = {
      minLength: 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const errors = [];
    if (password.length < requirements.minLength) {
      errors.push("Senha deve ter pelo menos 8 caracteres");
    }
    if (!requirements.hasUpperCase) {
      errors.push("Senha deve conter ao menos uma letra maiúscula");
    }
    if (!requirements.hasLowerCase) {
      errors.push("Senha deve conter ao menos uma letra minúscula");
    }
    if (!requirements.hasNumbers) {
      errors.push("Senha deve conter ao menos um número");
    }
    if (!requirements.hasSpecialChars) {
      errors.push("Senha deve conter ao menos um caractere especial");
    }

    if (errors.length > 0) {
      throw new Error(`Senha não atende aos requisitos: ${errors.join(", ")}`);
    }
  }
}
```

---

## 🏢 ISOLAMENTO DE DADOS POR TENANT

### Middleware de Tenant

```javascript
// middleware/tenantMiddleware.js
const tenantMiddleware = (req, res, next) => {
  // Extrair tenant do JWT (já validado no authenticateToken)
  const tenantId = req.user.tenant_id;

  if (!tenantId) {
    return res.status(403).json({ error: "Tenant não identificado" });
  }

  // Configurar conexão com schema específico do tenant
  req.db = createTenantConnection(tenantId);
  req.tenantId = tenantId;

  next();
};

// Função para criar conexão com schema específico
const createTenantConnection = (tenantId) => {
  const schemaName = `tenant_${tenantId}`;

  return {
    // Wrapper que adiciona schema em todas as queries
    query: async (sql, params) => {
      // Substituir schema padrão pelo schema do tenant
      const tenantSql = sql.replace(/\${schema}/g, schemaName);
      return await mainDbConnection.query(tenantSql, params);
    },

    // Métodos específicos para cada tabela
    clients: createTableMethods(schemaName, "clients"),
    projects: createTableMethods(schemaName, "projects"),
    tasks: createTableMethods(schemaName, "tasks"),
    // ... outros módulos
  };
};

// Factory para métodos de tabela
const createTableMethods = (schema, tableName) => ({
  async findMany(where = {}, options = {}) {
    const whereClause =
      Object.keys(where).length > 0
        ? `WHERE ${Object.keys(where)
            .map((key) => `${key} = $${Object.keys(where).indexOf(key) + 1}`)
            .join(" AND ")}`
        : "";

    const sql = `SELECT * FROM ${schema}.${tableName} ${whereClause}`;
    return await mainDbConnection.query(sql, Object.values(where));
  },

  async findById(id) {
    const sql = `SELECT * FROM ${schema}.${tableName} WHERE id = $1`;
    const result = await mainDbConnection.query(sql, [id]);
    return result[0];
  },

  async create(data) {
    const columns = Object.keys(data).join(", ");
    const values = Object.keys(data)
      .map((_, i) => `$${i + 1}`)
      .join(", ");
    const sql = `INSERT INTO ${schema}.${tableName} (${columns}) VALUES (${values}) RETURNING *`;

    const result = await mainDbConnection.query(sql, Object.values(data));
    return result[0];
  },

  async update(id, data) {
    const setClause = Object.keys(data)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(", ");
    const sql = `UPDATE ${schema}.${tableName} SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;

    const result = await mainDbConnection.query(sql, [
      id,
      ...Object.values(data),
    ]);
    return result[0];
  },
});
```

### Validação de Acesso por Tipo de Conta

```javascript
// middleware/accountTypeMiddleware.js
const requireAccountType = (allowedTypes) => {
  return (req, res, next) => {
    const userAccountType = req.user.account_type;

    if (!allowedTypes.includes(userAccountType)) {
      return res.status(403).json({
        error: "Acesso negado",
        required: allowedTypes,
        current: userAccountType,
      });
    }

    next();
  };
};

// Exemplo de uso nas rotas
app.get(
  "/dashboard/financial",
  authenticateToken,
  tenantMiddleware,
  requireAccountType(["composta", "gerencial"]), // Conta Simples não tem acesso
  dashboardController.getFinancialData,
);

app.get(
  "/settings",
  authenticateToken,
  tenantMiddleware,
  requireAccountType(["gerencial"]), // Apenas Conta Gerencial
  settingsController.getSettings,
);
```

---

## 🔗 INTEGRAÇÃO COM APIS EXTERNAS

### Rate Limiting Implementação

```javascript
// services/rateLimitService.js
const Redis = require("redis");
const redisClient = Redis.createClient(process.env.REDIS_URL);

class RateLimitService {
  constructor() {
    this.limits = {
      stripe: { requests: 100, windowMs: 60 * 60 * 1000 }, // 100 req/hora
      resend: { requests: 1000, windowMs: 60 * 60 * 1000 }, // 1000 req/hora
      whatsapp: { requests: 50, windowMs: 60 * 60 * 1000 }, // 50 req/hora
      juridicas: { requests: 200, windowMs: 60 * 60 * 1000 }, // 200 req/hora
    };
  }

  async checkLimit(tenantId, apiType) {
    const key = `rate_limit:${tenantId}:${apiType}`;
    const limit = this.limits[apiType];

    const current = await redisClient.get(key);

    if (current === null) {
      // Primeira requisição na janela
      await redisClient.setex(key, Math.floor(limit.windowMs / 1000), 1);
      return { allowed: true, remaining: limit.requests - 1 };
    }

    const count = parseInt(current);
    if (count >= limit.requests) {
      const ttl = await redisClient.ttl(key);
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + ttl * 1000,
      };
    }

    await redisClient.incr(key);
    return { allowed: true, remaining: limit.requests - count - 1 };
  }
}

// Middleware de rate limiting
const rateLimitMiddleware = (apiType) => {
  return async (req, res, next) => {
    const rateLimitService = new RateLimitService();
    const result = await rateLimitService.checkLimit(req.tenantId, apiType);

    // Adicionar headers de rate limit
    res.set({
      "X-RateLimit-Limit": rateLimitService.limits[apiType].requests,
      "X-RateLimit-Remaining": result.remaining,
      "X-RateLimit-Reset": result.resetTime || "",
    });

    if (!result.allowed) {
      return res.status(429).json({
        error: "Rate limit excedido",
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      });
    }

    next();
  };
};
```

### Integração Stripe

```javascript
// services/stripeService.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

class StripeService {
  async createPaymentIntent(invoiceData, tenantId) {
    // Rate limiting
    const rateLimitCheck = await rateLimitService.checkLimit(
      tenantId,
      "stripe",
    );
    if (!rateLimitCheck.allowed) {
      throw new Error("Rate limit excedido para Stripe API");
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(invoiceData.amount * 100), // Centavos
        currency: "brl",
        metadata: {
          tenant_id: tenantId,
          invoice_id: invoiceData.id,
          client_id: invoiceData.client_id,
        },
        receipt_email: invoiceData.client_email,
        description: `Fatura ${invoiceData.number} - ${invoiceData.description}`,
      });

      // Log da requisição
      await db.api_requests_log.create({
        tenant_id: tenantId,
        api_provider: "stripe",
        endpoint: "payment_intents",
        request_data: invoiceData,
        response_data: paymentIntent,
        status: "success",
      });

      return paymentIntent;
    } catch (error) {
      // Log de erro
      await db.api_requests_log.create({
        tenant_id: tenantId,
        api_provider: "stripe",
        endpoint: "payment_intents",
        request_data: invoiceData,
        error_message: error.message,
        status: "error",
      });

      throw error;
    }
  }

  // Webhook para confirmação de pagamento
  async handleWebhook(req, res) {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (error) {
      console.error("Webhook signature verification failed:", error.message);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    switch (event.type) {
      case "payment_intent.succeeded":
        await this.handlePaymentSuccess(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await this.handlePaymentFailure(event.data.object);
        break;
    }

    res.json({ received: true });
  }

  async handlePaymentSuccess(paymentIntent) {
    const { tenant_id, invoice_id } = paymentIntent.metadata;

    // Atualizar status da fatura
    await db.invoices.update(invoice_id, {
      status: "paid",
      paid_at: new Date(),
      payment_method: "stripe",
      stripe_payment_intent_id: paymentIntent.id,
    });

    // Cancelar notificações pendentes
    await db.scheduled_notifications.update(
      { invoice_id: invoice_id, status: "pending" },
      { status: "cancelled", cancelled_reason: "payment_received" },
    );

    // Enviar notificação de confirmação
    await notificationService.sendPaymentConfirmation(tenant_id, invoice_id);
  }
}
```

### Integração Resend API

```javascript
// services/emailService.js
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

class EmailService {
  async sendEmail(emailData, tenantId) {
    // Rate limiting
    const rateLimitCheck = await rateLimitService.checkLimit(
      tenantId,
      "resend",
    );
    if (!rateLimitCheck.allowed) {
      throw new Error("Rate limit excedido para Resend API");
    }

    try {
      const result = await resend.emails.send({
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        attachments: emailData.attachments || [],
      });

      // Log de sucesso
      await db.email_log.create({
        tenant_id: tenantId,
        to_email: emailData.to,
        subject: emailData.subject,
        resend_id: result.id,
        status: "sent",
        sent_at: new Date(),
      });

      return result;
    } catch (error) {
      // Log de erro
      await db.email_log.create({
        tenant_id: tenantId,
        to_email: emailData.to,
        subject: emailData.subject,
        status: "failed",
        error_message: error.message,
        attempted_at: new Date(),
      });

      throw error;
    }
  }

  async sendBulkEmail(emailList, tenantId) {
    const results = [];

    for (const email of emailList) {
      try {
        // Delay entre envios para respeitar rate limit
        await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms
        const result = await this.sendEmail(email, tenantId);
        results.push({ email: email.to, status: "success", id: result.id });
      } catch (error) {
        results.push({
          email: email.to,
          status: "failed",
          error: error.message,
        });
      }
    }

    return results;
  }
}
```

### Integração WhatsApp (via n8n)

```javascript
// services/whatsappService.js
class WhatsAppService {
  constructor() {
    this.webhookUrl = process.env.N8N_WHATSAPP_WEBHOOK;
  }

  async sendMessage(messageData, tenantId) {
    // Rate limiting
    const rateLimitCheck = await rateLimitService.checkLimit(
      tenantId,
      "whatsapp",
    );
    if (!rateLimitCheck.allowed) {
      throw new Error("Rate limit excedido para WhatsApp API");
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.N8N_API_KEY}`,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          phone: messageData.phone,
          message: messageData.message,
          media_url: messageData.media_url || null,
          message_type: messageData.type || "text",
        }),
      });

      const result = await response.json();

      // Log do envio
      await db.whatsapp_log.create({
        tenant_id: tenantId,
        phone: messageData.phone,
        message: messageData.message,
        n8n_response: result,
        status: response.ok ? "sent" : "failed",
        sent_at: new Date(),
      });

      return result;
    } catch (error) {
      // Log de erro
      await db.whatsapp_log.create({
        tenant_id: tenantId,
        phone: messageData.phone,
        message: messageData.message,
        status: "error",
        error_message: error.message,
        attempted_at: new Date(),
      });

      throw error;
    }
  }
}
```

---

## 🗄️ CONFIGURAÇÃO DO BANCO DE DADOS

### Script de Criação de Schema por Tenant

```sql
-- scripts/create_tenant_schema.sql
CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_uuid UUID)
RETURNS VOID AS $$
DECLARE
    schema_name TEXT := 'tenant_' || replace(tenant_uuid::text, '-', '');
BEGIN
    -- Criar schema
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);

    -- Criar tabelas base
    EXECUTE format('
        CREATE TABLE %I.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR UNIQUE NOT NULL,
            password_hash VARCHAR NOT NULL,
            name VARCHAR NOT NULL,
            account_type VARCHAR CHECK (account_type IN (''simples'', ''composta'', ''gerencial'')),
            is_active BOOLEAN DEFAULT true,
            must_change_password BOOLEAN DEFAULT false,
            last_login TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE %I.clients (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR NOT NULL,
            email VARCHAR,
            phone VARCHAR,
            document VARCHAR,
            address JSONB,
            status VARCHAR DEFAULT ''ativo'',
            created_by UUID REFERENCES %I.users(id),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE %I.projects (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR NOT NULL,
            description TEXT,
            client_id UUID REFERENCES %I.clients(id),
            status VARCHAR DEFAULT ''novo'',
            priority VARCHAR DEFAULT ''media'',
            start_date DATE,
            due_date DATE,
            completed_at TIMESTAMP,
            budget_value DECIMAL(15,2),
            progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
            is_pinned BOOLEAN DEFAULT false,
            created_by UUID REFERENCES %I.users(id),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE %I.tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR NOT NULL,
            description TEXT,
            project_id UUID REFERENCES %I.projects(id),
            responsible_id UUID REFERENCES %I.users(id),
            status VARCHAR DEFAULT ''pending'',
            priority VARCHAR DEFAULT ''media'',
            due_date TIMESTAMP,
            completed_at TIMESTAMP,
            progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
            is_pinned BOOLEAN DEFAULT false,
            created_by UUID REFERENCES %I.users(id),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE %I.cash_flow (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            type VARCHAR CHECK (type IN (''receita'', ''despesa'')),
            category_id UUID,
            amount DECIMAL(15,2) NOT NULL,
            description TEXT,
            date DATE NOT NULL,
            project_id UUID REFERENCES %I.projects(id),
            client_id UUID REFERENCES %I.clients(id),
            payment_method VARCHAR,
            is_recurring BOOLEAN DEFAULT false,
            recurring_config JSONB,
            created_by UUID REFERENCES %I.users(id),
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE %I.audit_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES %I.users(id),
            table_name VARCHAR NOT NULL,
            record_id UUID,
            operation VARCHAR CHECK (operation IN (''CREATE'', ''UPDATE'', ''DELETE'')),
            old_data JSONB,
            new_data JSONB,
            ip_address INET,
            user_agent TEXT,
            timestamp TIMESTAMP DEFAULT NOW()
        );

        -- Índices para performance
        CREATE INDEX idx_%1$s_clients_created_by ON %I.clients(created_by);
        CREATE INDEX idx_%1$s_projects_client_id ON %I.projects(client_id);
        CREATE INDEX idx_%1$s_tasks_project_id ON %I.tasks(project_id);
        CREATE INDEX idx_%1$s_tasks_responsible_id ON %I.tasks(responsible_id);
        CREATE INDEX idx_%1$s_cash_flow_date ON %I.cash_flow(date);
        CREATE INDEX idx_%1$s_audit_log_timestamp ON %I.audit_log(timestamp);

    ', schema_name, schema_name, schema_name, schema_name, schema_name,
       schema_name, schema_name, schema_name, schema_name, schema_name,
       schema_name, schema_name, schema_name, schema_name, schema_name,
       schema_name, schema_name, schema_name, schema_name);

    -- Funções de trigger para audit_log
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.audit_trigger_function()
        RETURNS TRIGGER AS $trigger$
        BEGIN
            IF TG_OP = ''DELETE'' THEN
                INSERT INTO %I.audit_log (table_name, record_id, operation, old_data)
                VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD));
                RETURN OLD;
            ELSIF TG_OP = ''UPDATE'' THEN
                INSERT INTO %I.audit_log (table_name, record_id, operation, old_data, new_data)
                VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW));
                RETURN NEW;
            ELSIF TG_OP = ''INSERT'' THEN
                INSERT INTO %I.audit_log (table_name, record_id, operation, new_data)
                VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW));
                RETURN NEW;
            END IF;
            RETURN NULL;
        END;
        $trigger$ LANGUAGE plpgsql;
    ', schema_name, schema_name, schema_name, schema_name);

    -- Criar triggers de auditoria para todas as tabelas principais
    EXECUTE format('
        CREATE TRIGGER audit_clients_trigger
            AFTER INSERT OR UPDATE OR DELETE ON %I.clients
            FOR EACH ROW EXECUTE FUNCTION %I.audit_trigger_function();

        CREATE TRIGGER audit_projects_trigger
            AFTER INSERT OR UPDATE OR DELETE ON %I.projects
            FOR EACH ROW EXECUTE FUNCTION %I.audit_trigger_function();

        CREATE TRIGGER audit_tasks_trigger
            AFTER INSERT OR UPDATE OR DELETE ON %I.tasks
            FOR EACH ROW EXECUTE FUNCTION %I.audit_trigger_function();
    ', schema_name, schema_name, schema_name, schema_name, schema_name, schema_name);

END;
$$ LANGUAGE plpgsql;
```

### Migrations System

```javascript
// migrations/migrationRunner.js
class MigrationRunner {
  async runTenantMigration(tenantId, migrationName) {
    const schemaName = `tenant_${tenantId}`;

    try {
      await db.transaction(async (trx) => {
        // Verificar se migração já foi executada
        const exists = await trx.query(
          `
          SELECT 1 FROM admin.tenant_migrations 
          WHERE tenant_id = $1 AND migration_name = $2
        `,
          [tenantId, migrationName],
        );

        if (exists.length > 0) {
          console.log(
            `Migration ${migrationName} já executada para tenant ${tenantId}`,
          );
          return;
        }

        // Executar migration
        const migrationSql = await fs.readFile(
          `migrations/${migrationName}.sql`,
          "utf8",
        );
        const tenantSql = migrationSql.replace(/\${schema}/g, schemaName);

        await trx.query(tenantSql);

        // Registrar execução
        await trx.query(
          `
          INSERT INTO admin.tenant_migrations (tenant_id, migration_name, executed_at)
          VALUES ($1, $2, NOW())
        `,
          [tenantId, migrationName],
        );

        console.log(
          `Migration ${migrationName} executada com sucesso para tenant ${tenantId}`,
        );
      });
    } catch (error) {
      console.error(
        `Erro ao executar migration ${migrationName} para tenant ${tenantId}:`,
        error,
      );
      throw error;
    }
  }

  async runForAllTenants(migrationName) {
    const tenants = await db.query(
      "SELECT id FROM admin.tenants WHERE is_active = true",
    );

    for (const tenant of tenants) {
      await this.runTenantMigration(tenant.id, migrationName);
    }
  }
}
```

---

## 📁 SISTEMA DE ARQUIVOS AWS S3

### Configuração e Upload

```javascript
// services/fileService.js
const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

class FileService {
  constructor() {
    this.bucket = process.env.S3_BUCKET_NAME;
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.maxFilesPerEntity = 3; // Configurável por tenant
    this.allowedTypes = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];
  }

  async uploadFile(file, tenantId, module, entityId, userId) {
    // Validações
    await this.validateUpload(file, tenantId, entityId);

    const fileKey = this.generateFileKey(
      tenantId,
      module,
      entityId,
      file.originalname,
    );

    const uploadParams = {
      Bucket: this.bucket,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        "tenant-id": tenantId,
        module: module,
        "entity-id": entityId,
        "uploaded-by": userId,
      },
    };

    try {
      const result = await s3.upload(uploadParams).promise();

      // Salvar referência no banco
      const fileRecord = await db.file_attachments.create({
        tenant_id: tenantId,
        module: module,
        entity_id: entityId,
        filename: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        s3_key: fileKey,
        s3_url: result.Location,
        uploaded_by: userId,
        created_at: new Date(),
      });

      return fileRecord;
    } catch (error) {
      console.error("Erro no upload S3:", error);
      throw new Error("Falha no upload do arquivo");
    }
  }

  async validateUpload(file, tenantId, entityId) {
    // Verificar tamanho
    if (file.size > this.maxFileSize) {
      throw new Error(
        `Arquivo muito grande. Máximo: ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Verificar tipo
    const ext = path.extname(file.originalname).toLowerCase();
    if (!this.allowedTypes.includes(ext)) {
      throw new Error(
        `Tipo de arquivo não permitido. Permitidos: ${this.allowedTypes.join(", ")}`,
      );
    }

    // Verificar limite de arquivos por entidade
    const currentCount = await db.file_attachments.count({
      where: { tenant_id: tenantId, entity_id: entityId },
    });

    const tenantConfig = await db.tenant_config.findByTenantId(tenantId);
    const maxFiles =
      tenantConfig?.max_files_per_entity || this.maxFilesPerEntity;

    if (currentCount >= maxFiles) {
      throw new Error(`Limite de ${maxFiles} arquivos por item atingido`);
    }
  }

  generateFileKey(tenantId, module, entityId, filename) {
    const timestamp = Date.now();
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9]/g, "_");

    return `${tenantId}/${module}/${entityId}/${timestamp}_${sanitizedName}${ext}`;
  }

  async deleteFile(fileId, tenantId) {
    const file = await db.file_attachments.findById(fileId);

    if (!file || file.tenant_id !== tenantId) {
      throw new Error("Arquivo não encontrado");
    }

    try {
      // Deletar do S3
      await s3
        .deleteObject({
          Bucket: this.bucket,
          Key: file.s3_key,
        })
        .promise();

      // Deletar do banco
      await db.file_attachments.delete(fileId);

      return { success: true };
    } catch (error) {
      console.error("Erro ao deletar arquivo:", error);
      throw new Error("Falha ao deletar arquivo");
    }
  }

  async getPresignedUrl(fileId, tenantId, expiresIn = 3600) {
    const file = await db.file_attachments.findById(fileId);

    if (!file || file.tenant_id !== tenantId) {
      throw new Error("Arquivo não encontrado");
    }

    const url = s3.getSignedUrl("getObject", {
      Bucket: this.bucket,
      Key: file.s3_key,
      Expires: expiresIn,
    });

    return url;
  }
}
```

---

## 🔔 SISTEMA DE NOTIFICAÇÕES

### Queue System com Bull

```javascript
// services/notificationQueue.js
const Bull = require("bull");
const redis = require("redis");

const redisClient = redis.createClient(process.env.REDIS_URL);
const notificationQueue = new Bull("notification queue", {
  redis: {
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
  },
});

// Processador de notificações
notificationQueue.process("send-notification", async (job) => {
  const { type, data } = job.data;

  switch (type) {
    case "email":
      return await emailService.sendEmail(data.emailData, data.tenantId);
    case "whatsapp":
      return await whatsappService.sendMessage(data.messageData, data.tenantId);
    case "invoice-reminder":
      return await processInvoiceReminder(data);
    default:
      throw new Error(`Tipo de notificação desconhecido: ${type}`);
  }
});

// Scheduler para notificações automáticas
class NotificationScheduler {
  async scheduleInvoiceReminders() {
    // Buscar faturas próximas do vencimento
    const upcomingInvoices = await db.query(`
      SELECT i.*, c.name as client_name, c.email, c.phone
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      WHERE i.due_date BETWEEN NOW() AND NOW() + INTERVAL '3 days'
        AND i.status = 'pending'
        AND NOT EXISTS (
          SELECT 1 FROM scheduled_notifications sn 
          WHERE sn.invoice_id = i.id 
            AND sn.type = 'reminder_3_days'
            AND sn.status IN ('pending', 'sent')
        )
    `);

    for (const invoice of upcomingInvoices) {
      await this.scheduleInvoiceReminder(invoice, "reminder_3_days");
    }

    // Buscar faturas vencendo hoje
    const dueTodayInvoices = await db.query(`
      SELECT i.*, c.name as client_name, c.email, c.phone
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      WHERE DATE(i.due_date) = CURRENT_DATE
        AND i.status = 'pending'
        AND NOT EXISTS (
          SELECT 1 FROM scheduled_notifications sn 
          WHERE sn.invoice_id = i.id 
            AND sn.type = 'due_today'
            AND sn.status IN ('pending', 'sent')
        )
    `);

    for (const invoice of dueTodayInvoices) {
      await this.scheduleInvoiceReminder(invoice, "due_today");
    }

    // Buscar faturas vencidas
    const overdueInvoices = await db.query(`
      SELECT i.*, c.name as client_name, c.email, c.phone
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      WHERE i.due_date < CURRENT_DATE
        AND i.status = 'pending'
        AND NOT EXISTS (
          SELECT 1 FROM scheduled_notifications sn 
          WHERE sn.invoice_id = i.id 
            AND sn.type = 'overdue'
            AND sn.created_at >= CURRENT_DATE
        )
    `);

    for (const invoice of overdueInvoices) {
      await this.scheduleInvoiceReminder(invoice, "overdue");
    }
  }

  async scheduleInvoiceReminder(invoice, type) {
    const messages = {
      reminder_3_days: {
        subject: `Lembrete: Fatura ${invoice.number} vence em 3 dias`,
        whatsapp: `🔔 Olá ${invoice.client_name}!\n\nLembramos que sua fatura ${invoice.number} no valor de R$ ${invoice.amount.toFixed(2)} vence em 3 dias.\n\n📅 Vencimento: ${formatDate(invoice.due_date)}\n💳 Link de pagamento: ${invoice.payment_link}`,
      },
      due_today: {
        subject: `URGENTE: Fatura ${invoice.number} vence hoje!`,
        whatsapp: `🚨 URGENTE - ${invoice.client_name}!\n\nSua fatura ${invoice.number} no valor de R$ ${invoice.amount.toFixed(2)} VENCE HOJE!\n\n⏰ Evite juros e multas pagando agora.\n💳 Link: ${invoice.payment_link}`,
      },
      overdue: {
        subject: `Fatura ${invoice.number} em atraso`,
        whatsapp: `⚠️ ${invoice.client_name}, sua fatura ${invoice.number} está em atraso.\n\nValor: R$ ${invoice.amount.toFixed(2)}\n📅 Venceu em: ${formatDate(invoice.due_date)}\n\nPor favor, regularize sua situação.\n💳 Link: ${invoice.payment_link}`,
      },
    };

    const message = messages[type];

    // Agendar email
    if (invoice.email) {
      await notificationQueue.add("send-notification", {
        type: "email",
        data: {
          tenantId: invoice.tenant_id,
          emailData: {
            from: `Sistema <noreply@${process.env.DOMAIN}>`,
            to: invoice.email,
            subject: message.subject,
            html: generateInvoiceEmailTemplate(invoice, type),
          },
        },
      });
    }

    // Agendar WhatsApp
    if (invoice.phone) {
      await notificationQueue.add("send-notification", {
        type: "whatsapp",
        data: {
          tenantId: invoice.tenant_id,
          messageData: {
            phone: invoice.phone,
            message: message.whatsapp,
          },
        },
      });
    }

    // Registrar notificação agendada
    await db.scheduled_notifications.create({
      tenant_id: invoice.tenant_id,
      invoice_id: invoice.id,
      type: type,
      status: "sent",
      sent_at: new Date(),
    });
  }
}

// Cron job para executar scheduler
const cron = require("node-cron");

// Executar a cada hora
cron.schedule("0 * * * *", async () => {
  console.log("Executando scheduler de notificações...");
  const scheduler = new NotificationScheduler();
  await scheduler.scheduleInvoiceReminders();
});
```

---

## 🚀 CONFIGURAÇÃO DE DEPLOY

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm ci --only=production

# Copiar código
COPY . .

# Build da aplicação
RUN npm run build

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: law_saas
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Environment Variables

```env
# .env.production
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/law_saas
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your-super-secret-access-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=law-saas-documents

# External APIs
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
N8N_WHATSAPP_WEBHOOK=https://your-n8n-instance.com/webhook/whatsapp
N8N_API_KEY=your-n8n-api-key

# Legal APIs
CNJ_API_KEY=your-cnj-key
CODILO_API_KEY=your-codilo-key
JUSBRASIL_API_KEY=your-jusbrasil-key
```

---

## 📊 MONITORAMENTO E OBSERVABILIDADE

### Health Checks

```javascript
// routes/health.js
app.get("/health", async (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {},
  };

  try {
    // Check database
    await db.query("SELECT 1");
    health.services.database = "healthy";
  } catch (error) {
    health.services.database = "unhealthy";
    health.status = "degraded";
  }

  try {
    // Check Redis
    await redisClient.ping();
    health.services.redis = "healthy";
  } catch (error) {
    health.services.redis = "unhealthy";
    health.status = "degraded";
  }

  try {
    // Check S3
    await s3.headBucket({ Bucket: process.env.S3_BUCKET_NAME }).promise();
    health.services.s3 = "healthy";
  } catch (error) {
    health.services.s3 = "unhealthy";
    health.status = "degraded";
  }

  const statusCode = health.status === "ok" ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### Logging Strategy

```javascript
// utils/logger.js
const winston = require("winston");

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "law-saas-api" },
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("HTTP Request", {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: duration,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      userId: req.user?.id,
      tenantId: req.tenantId,
    });
  });

  next();
};
```

---

_📅 Documento criado em: $(date)_  
_🔄 Última atualização: $(date)_  
_👤 Autor: Documentação Técnica - DevOps/Backend_
