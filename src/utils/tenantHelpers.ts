/**
 * TENANT ISOLATION HELPERS
 * 
 * Estas funções garantem que todas as queries sejam executadas
 * no schema correto do tenant, prevenindo vazamento de dados.
 */

import { TenantDatabase } from '../config/database';

/**
 * Executa uma query no schema do tenant
 * 
 * SEMPRE use esta função para queries de dados do tenant
 * NUNCA use o Prisma global diretamente para dados de tenant
 * 
 * @example
 * // Em um controller:
 * const clients = await queryTenantSchema<Client[]>(
 *   req.tenantDB,
 *   `SELECT * FROM \${schema}.clients WHERE is_active = true`
 * );
 */
export async function queryTenantSchema<T = any>(
  tenantDB: TenantDatabase,
  query: string,
  params: any[] = []
): Promise<T[]> {
  if (!tenantDB) {
    throw new Error('tenantDB not found in request. Did you forget to add validateTenantAccess middleware?');
  }
  
  return await tenantDB.executeInTenantSchema<T>(query, params);
}

/**
 * Helper para inserir dados no schema do tenant
 */
export async function insertInTenantSchema<T = any>(
  tenantDB: TenantDatabase,
  table: string,
  data: Record<string, any>
): Promise<T> {
  const columns = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map((_, i) => `$${i + 1}`).join(', ');
  const values = Object.values(data);
  
  const query = `
    INSERT INTO \${schema}.${table} (${columns})
    VALUES (${placeholders})
    RETURNING *
  `;
  
  const result = await tenantDB.executeInTenantSchema<T>(query, values);
  return result[0];
}

/**
 * Helper para atualizar dados no schema do tenant
 */
export async function updateInTenantSchema<T = any>(
  tenantDB: TenantDatabase,
  table: string,
  id: string,
  data: Record<string, any>
): Promise<T> {
  const setClause = Object.keys(data)
    .map((key, i) => `${key} = $${i + 2}`)
    .join(', ');
  const values = [id, ...Object.values(data)];
  
  const query = `
    UPDATE \${schema}.${table}
    SET ${setClause}, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  
  const result = await tenantDB.executeInTenantSchema<T>(query, values);
  return result[0];
}

/**
 * Helper para deletar (soft delete) dados no schema do tenant
 */
export async function softDeleteInTenantSchema<T = any>(
  tenantDB: TenantDatabase,
  table: string,
  id: string
): Promise<T> {
  const query = `
    UPDATE \${schema}.${table}
    SET is_active = false, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  
  const result = await tenantDB.executeInTenantSchema<T>(query, [id]);
  return result[0];
}
