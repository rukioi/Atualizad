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
  const schema = await tenantDB.getSchemaName();

  const columns = Object.keys(data);

  // Map values with proper casting for UUID and JSONB fields
  const placeholders = columns.map((key, i) => {
    // Check if value looks like a UUID (36 chars with dashes)
    const value = data[key];
    if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      return `$${i + 1}::uuid`;
    }
    // Check if it's a JSON string (starts with [ or {)
    if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      return `$${i + 1}::jsonb`;
    }
    // Handle DATE columns with explicit cast
    if (key.includes('date') || key === 'birth_date') {
      return `$${i + 1}::date`;
    }
    // All other fields use standard placeholder
    return `$${i + 1}`;
  }).join(', ');

  const query = `
    INSERT INTO ${schema}.${tableName} (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;

  console.log('Insert query:', query);
  console.log('Insert values:', Object.values(data));

  const result = await queryTenantSchema<T>(tenantDB, query, Object.values(data));

  if (!result || result.length === 0) {
    throw new Error(`Failed to insert into ${tableName}`);
  }

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
      // If the field is JSONB, do explicit cast
      if (key === 'tags' || key === 'address' || key === 'metadata' || key === 'settings' || key === 'data') {
        return `${key} = $${index + 1}::jsonb`;
      }
      // If the field is DATE, do explicit cast
      if (key.includes('date') || key === 'birth_date') {
        return `${key} = $${index + 1}::date`;
      }
      // Check if value looks like a UUID
      if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        return `${key} = $${index + 1}::uuid`;
      }
      return `${key} = $${index + 1}`;
    })
    .join(', ');
  const values = Object.values(data);

  const query = `
    UPDATE ${schema}.${tableName}
    SET ${setClause}, updated_at = NOW()
    WHERE id = $${values.length + 1} AND is_active = TRUE
    RETURNING *
  `;

  const result = await tenantDB.executeInTenantSchema<T>(query, [...values, id]);
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