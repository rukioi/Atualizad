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
  if (!tenantDB || typeof tenantDB.getSchemaName !== 'function') {
    throw new Error('Invalid TenantDatabase instance provided to insertInTenantSchema');
  }

  const schemaName = tenantDB.getSchemaName();
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

  const query = `
    INSERT INTO ${schemaName}.${tableName} (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;

  console.log(`[insertInTenantSchema] Inserting into ${schemaName}.${tableName}`);
  console.log(`[insertInTenantSchema] Columns:`, columns);
  console.log(`[insertInTenantSchema] Values:`, values);

  const result = await queryTenantSchema<T>(tenantDB, query, values);
  console.log(`[insertInTenantSchema] Insert successful, result:`, result[0]);
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

  const schema = await tenantDB.getSchemaName();

  const setClause = Object.keys(data)
    .map((key, index) => {
      const value = data[key];
      // Handle JSONB fields
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return `${key} = $${index + 1}::jsonb`;
      }
      // Handle UUID fields by checking if value looks like a UUID
      if (typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return `${key} = $${index + 1}::uuid`;
      }
      return `${key} = $${index + 1}`;
    })
    .join(', ');

  const values = Object.values(data).map(val => 
    typeof val === 'object' && val !== null ? JSON.stringify(val) : val
  );

  const query = `
    UPDATE ${schema}.${tableName}
    SET ${setClause}, updated_at = NOW()
    WHERE id = $${values.length + 1}::uuid AND is_active = TRUE
    RETURNING *
  `;

  const result = await tenantDB.executeInTenantSchema(query, [...values, id]);
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

  const schema = await tenantDB.getSchemaName();

  const query = `
    UPDATE ${schema}.${tableName}
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = $1::uuid AND is_active = TRUE
    RETURNING *
  `;

  const result = await tenantDB.executeInTenantSchema<T>(query, [id]);
  return result[0] || null;
}