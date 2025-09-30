
#!/usr/bin/env node

/**
 * Script para testar conexão com o banco de dados
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🧪 Testing database connection...');
console.log('📋 Configuration:', {
  url: supabaseUrl ? '✅ Configured' : '❌ Missing',
  anonKey: supabaseAnonKey ? '✅ Configured' : '❌ Missing',
  serviceKey: supabaseServiceKey ? '✅ Configured' : '❌ Missing'
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

async function testConnection() {
  try {
    // Test with anon key
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    
    console.log('🔑 Testing anonymous connection...');
    const { data: healthCheck, error: healthError } = await supabaseAnon
      .from('tenants')
      .select('count')
      .limit(1);

    if (healthError && healthError.code !== 'PGRST116') {
      console.error('❌ Anonymous connection failed:', healthError.message);
    } else {
      console.log('✅ Anonymous connection successful');
    }

    // Test with service key if available
    if (supabaseServiceKey) {
      console.log('🔑 Testing service role connection...');
      const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: serviceTest, error: serviceError } = await supabaseService
        .from('tenants')
        .select('count')
        .limit(1);

      if (serviceError && serviceError.code !== 'PGRST116') {
        console.error('❌ Service role connection failed:', serviceError.message);
      } else {
        console.log('✅ Service role connection successful');
      }

      // Test execute_sql function
      console.log('🔧 Testing execute_sql function...');
      const { data: sqlTest, error: sqlError } = await supabaseService.rpc('execute_sql', {
        query_text: 'SELECT 1 as test_value'
      });

      if (sqlError) {
        console.error('❌ execute_sql function failed:', sqlError.message);
      } else {
        console.log('✅ execute_sql function working:', sqlTest);
      }
    }

    console.log('🎉 Database connection test complete!');

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();
