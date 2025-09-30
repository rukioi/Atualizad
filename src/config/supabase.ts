import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sdgsphetqccgyqwunvvo.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkZ3NwaGV0cWNjZ3lxd3VudnZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDM0NDcsImV4cCI6MjA3MTg3OTQ0N30.9hvtHvOiEHH5R7zAlpjgLdIOERIowQgncUEMbOCwsAE';

// Main Supabase client for global operations
export const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client with service role key (for admin operations)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;

// Helper function to execute SQL with error handling
export async function executeSql(sql: string, params: any[] = []) {
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      query: sql,
      params: params
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('SQL execution error:', error);
    throw error;
  }
}