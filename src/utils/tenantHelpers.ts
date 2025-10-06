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
export async function insertInTenantSchema<T>(
  tenantDB: TenantDatabase,
  tableName: string,
  data: Record<string, any>
): Promise<T> {
  const schema = await tenantDB.getSchemaName();

  const columns = Object.keys(data).filter(key => data[key] !== undefined);
  const values = columns.map(key => data[key]);

  // Adicionar ID como primeira coluna se não estiver presente
  const needsId = !columns.includes('id');
  if (needsId) {
    columns.unshift('id');
    values.unshift(null); // PostgreSQL vai gerar via gen_random_uuid()
  }

  // Criar placeholders com cast de tipo onde necessário
  const placeholders = columns.map((col, idx) => {
    if (col === 'id') {
      return 'gen_random_uuid()';
    }

    const value = data[col];
    const paramIndex = needsId ? idx : idx + 1;

    // Cast para tipos específicos
    if (col.includes('date') && value !== null) {
      return `$${paramIndex}::date`;
    }
    if (col.includes('time') && value !== null) {
      return `$${paramIndex}::timestamp`;
    }
    // Cast JSONB para campos específicos ou objetos
    if (col === 'tags' || col === 'assigned_to' || col === 'contacts' || col === 'address' || (typeof value === 'object' && value !== null)) {
      return `$${paramIndex}::jsonb`;
    }
    if (col.includes('_id') || col === 'created_by') {
      return `$${paramIndex}::uuid`;
    }

    return `$${paramIndex}`;
  });

  // Converter arrays/objetos para JSON string para campos JSONB
  const finalValues = (needsId ? values.slice(1) : values).map((val, idx) => {
    const colName = needsId ? columns[idx + 1] : columns[idx];
    if ((colName === 'tags' || colName === 'assigned_to' || colName === 'contacts' || colName === 'address') && (Array.isArray(val) || (typeof val === 'object' && val !== null))) {
      return JSON.stringify(val);
    }
    return val;
  });

  const query = `
    INSERT INTO ${schema}.${tableName} (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING *
  `;

  console.log('Insert query:', query);
  console.log('Insert values:', finalValues);

  const result = await queryTenantSchema<T>(tenantDB, query, finalValues);
  
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