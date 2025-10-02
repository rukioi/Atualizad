/**
 * TENANT HELPERS - Utilitários para Isolamento de Dados
 * =====================================================
 * 
 * ✅ ISOLAMENTO GARANTIDO: Todas as operações usam schema correto do tenant
 * ✅ PREVENÇÃO SQL INJECTION: Parâmetros preparados em todas as queries
 * ✅ REUTILIZAÇÃO: Helpers padronizados para todos os services
 */

import { TenantDatabase } from '../config/database';

/**
 * Executa query SELECT no schema do tenant
 * 
 * @param tenantDB - TenantDatabase instance
 * @param query - SQL query com placeholder ${schema}
 * @param params - Parâmetros da query
 */
export async function queryTenantSchema<T = any>(
  tenantDB: TenantDatabase, 
  query: string, 
  params: any[] = []
): Promise<T[]> {
  if (!tenantDB || typeof tenantDB.executeInTenantSchema !== 'function') {
    throw new Error('Invalid TenantDatabase instance provided to queryTenantSchema');
  }
  return await tenantDB.executeInTenantSchema<T>(query, params);
}

/**
 * Insere dados no schema do tenant
 * 
 * @param tenantDB - TenantDatabase instance
 * @param tableName - Nome da tabela
 * @param data - Dados para inserir
 */
export async function insertInTenantSchema<T = any>(
  tenantDB: TenantDatabase,
  tableName: string,
  data: Record<string, any>
): Promise<T> {
  // Remover campos undefined ou null
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined && v !== null)
  );

  const columns = Object.keys(cleanData);
  const values = Object.values(cleanData);
  
  // JSONB fields que precisam de cast explícito
  const jsonbFields = ['tags', 'address', 'metadata', 'settings', 'data'];
  
  // DATE fields que precisam de cast explícito
  const dateFields = ['birth_date', 'due_date', 'start_date', 'end_date', 'paid_at', 'completed_at'];
  
  const placeholders = columns.map((col, i) => {
    // Se o campo é JSONB, fazer cast explícito
    if (jsonbFields.includes(col)) {
      return `$${i + 1}::jsonb`;
    }
    // Se o campo é DATE, fazer cast explícito
    if (dateFields.includes(col)) {
      return `$${i + 1}::date`;
    }
    return `$${i + 1}`;
  }).join(', ');

  const query = `
    INSERT INTO \${schema}.${tableName} (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;

  const result = await queryTenantSchema<T>(tenantDB, query, values);
  return result[0];
}

/**
 * Atualiza dados no schema do tenant
 * 
 * @param tenantDB - TenantDatabase instance
 * @param tableName - Nome da tabela
 * @param id - ID do registro
 * @param data - Dados para atualizar
 */
export async function updateInTenantSchema<T = any>(
  tenantDB: TenantDatabase,
  tableName: string,
  id: string,
  data: Record<string, any>
): Promise<T | null> {
  if (!tenantDB || typeof tenantDB.executeInTenantSchema !== 'function') {
    throw new Error('Invalid TenantDatabase instance provided to updateInTenantSchema');
  }

  // JSONB fields que precisam de cast explícito
  const jsonbFields = ['tags', 'address', 'metadata', 'settings', 'data'];
  
  // DATE fields que precisam de cast explícito
  const dateFields = ['birth_date', 'due_date', 'start_date', 'end_date', 'paid_at', 'completed_at'];
  
  const setClause = Object.keys(data)
    .map((key, index) => {
      // Se o campo é JSONB, fazer cast explícito
      if (jsonbFields.includes(key)) {
        return `${key} = $${index + 2}::jsonb`;
      }
      // Se o campo é DATE, fazer cast explícito
      if (dateFields.includes(key)) {
        return `${key} = $${index + 2}::date`;
      }
      return `${key} = $${index + 2}`;
    })
    .join(', ');
  const values = [id, ...Object.values(data)];

  const query = `
    UPDATE \${schema}.${tableName}
    SET ${setClause}, updated_at = NOW()
    WHERE id = $1 AND is_active = TRUE
    RETURNING *
  `;

  const result = await tenantDB.executeInTenantSchema<T>(query, values);
  return result[0] || null;
}

/**
 * Soft delete no schema do tenant
 * 
 * @param tenantDB - TenantDatabase instance
 * @param tableName - Nome da tabela
 * @param id - ID do registro
 */
export async function softDeleteInTenantSchema<T = any>(
  tenantDB: TenantDatabase,
  tableName: string,
  id: string
): Promise<T | null> {
  if (!tenantDB || typeof tenantDB.executeInTenantSchema !== 'function') {
    throw new Error('Invalid TenantDatabase instance provided to softDeleteInTenantSchema');
  }

  const query = `
    UPDATE \${schema}.${tableName}
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = $1 AND is_active = TRUE
    RETURNING *
  `;

  const result = await tenantDB.executeInTenantSchema<T>(query, [id]);
  return result[0] || null;
}