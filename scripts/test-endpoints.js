#!/usr/bin/env node

/**
 * Script para testar todos os endpoints da API
 * Uso: node scripts/test-endpoints.js
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

class APITester {
  constructor() {
    this.baseURL = BASE_URL;
    this.tokens = null;
    this.testData = {
      tenant: null,
      user: null,
      client: null,
      project: null,
      task: null,
      transaction: null,
      invoice: null,
    };
  }

  async request(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status || 500,
      };
    }
  }

  async testHealthCheck() {
    console.log('🏥 Testing health check...');
    const result = await this.request('GET', '/health');
    
    if (result.success) {
      console.log('✅ Health check passed');
      return true;
    } else {
      console.log('❌ Health check failed:', result.error);
      return false;
    }
  }

  async testAdminEndpoints() {
    console.log('\n🔧 Testing admin endpoints...');

    // Create registration key
    console.log('Creating registration key...');
    const keyResult = await this.request('POST', '/api/admin/keys', {
      accountType: 'GERENCIAL',
      usesAllowed: 1,
      singleUse: true,
    });

    if (!keyResult.success) {
      console.log('❌ Failed to create registration key:', keyResult.error);
      return false;
    }

    console.log('✅ Registration key created');
    this.testData.registrationKey = keyResult.data.key;

    // List keys
    const listKeysResult = await this.request('GET', '/api/admin/keys');
    if (listKeysResult.success) {
      console.log('✅ List keys endpoint working');
    } else {
      console.log('❌ List keys failed:', listKeysResult.error);
    }

    return true;
  }

  async testAuthFlow() {
    console.log('\n🔐 Testing authentication flow...');

    if (!this.testData.registrationKey) {
      console.log('❌ No registration key available');
      return false;
    }

    // Register user
    console.log('Registering user...');
    const registerResult = await this.request('POST', '/api/auth/register', {
      email: 'test@example.com',
      password: 'TestPassword123!',
      name: 'Test User',
      key: this.testData.registrationKey,
    });

    if (!registerResult.success) {
      console.log('❌ Registration failed:', registerResult.error);
      return false;
    }

    console.log('✅ User registered successfully');
    this.testData.user = registerResult.data.user;
    this.tokens = registerResult.data.tokens;

    // Test login
    console.log('Testing login...');
    const loginResult = await this.request('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'TestPassword123!',
    });

    if (!loginResult.success) {
      console.log('❌ Login failed:', loginResult.error);
      return false;
    }

    console.log('✅ Login successful');
    this.tokens = loginResult.data.tokens;

    // Test profile
    console.log('Testing profile endpoint...');
    const profileResult = await this.request('GET', '/api/auth/me', null, {
      Authorization: `Bearer ${this.tokens.accessToken}`,
    });

    if (profileResult.success) {
      console.log('✅ Profile endpoint working');
    } else {
      console.log('❌ Profile endpoint failed:', profileResult.error);
    }

    return true;
  }

  async testCRUDEndpoints() {
    console.log('\n📊 Testing CRUD endpoints...');

    if (!this.tokens) {
      console.log('❌ No authentication tokens available');
      return false;
    }

    const authHeaders = {
      Authorization: `Bearer ${this.tokens.accessToken}`,
    };

    // Test Clients CRUD
    console.log('Testing clients endpoints...');
    
    // Create client
    const createClientResult = await this.request('POST', '/api/clients', {
      name: 'Test Client',
      email: 'client@test.com',
      phone: '(11) 99999-9999',
      status: 'active',
      tags: ['test', 'api'],
    }, authHeaders);

    if (createClientResult.success) {
      console.log('✅ Client created');
      this.testData.client = createClientResult.data.client;
    } else {
      console.log('❌ Client creation failed:', createClientResult.error);
      return false;
    }

    // List clients
    const listClientsResult = await this.request('GET', '/api/clients', null, authHeaders);
    if (listClientsResult.success) {
      console.log('✅ Clients list endpoint working');
    }

    // Test Projects CRUD
    console.log('Testing projects endpoints...');
    
    const createProjectResult = await this.request('POST', '/api/projects', {
      title: 'Test Project',
      description: 'API Test Project',
      clientName: 'Test Client',
      clientId: this.testData.client.id,
      status: 'contacted',
      priority: 'medium',
      budget: 5000,
      tags: ['test', 'api'],
    }, authHeaders);

    if (createProjectResult.success) {
      console.log('✅ Project created');
      this.testData.project = createProjectResult.data.project;
    } else {
      console.log('❌ Project creation failed:', createProjectResult.error);
    }

    // Test Tasks CRUD
    console.log('Testing tasks endpoints...');
    
    const createTaskResult = await this.request('POST', '/api/tasks', {
      title: 'Test Task',
      description: 'API Test Task',
      assignedTo: 'Test User',
      status: 'not_started',
      priority: 'medium',
      projectId: this.testData.project?.id,
      tags: ['test', 'api'],
    }, authHeaders);

    if (createTaskResult.success) {
      console.log('✅ Task created');
      this.testData.task = createTaskResult.data.task;
    } else {
      console.log('❌ Task creation failed:', createTaskResult.error);
    }

    return true;
  }

  async testDashboard() {
    console.log('\n📈 Testing dashboard endpoints...');

    if (!this.tokens) {
      console.log('❌ No authentication tokens available');
      return false;
    }

    const authHeaders = {
      Authorization: `Bearer ${this.tokens.accessToken}`,
    };

    // Test dashboard metrics
    const metricsResult = await this.request('GET', '/api/dashboard/metrics', null, authHeaders);
    if (metricsResult.success) {
      console.log('✅ Dashboard metrics working');
      console.log('📊 Metrics:', JSON.stringify(metricsResult.data.metrics, null, 2));
    } else {
      console.log('❌ Dashboard metrics failed:', metricsResult.error);
    }

    // Test client metrics
    const clientMetricsResult = await this.request('GET', '/api/dashboard/clientes', null, authHeaders);
    if (clientMetricsResult.success) {
      console.log('✅ Client metrics working');
    } else {
      console.log('❌ Client metrics failed:', clientMetricsResult.error);
    }

    return true;
  }

  async runAllTests() {
    console.log('🧪 Starting API endpoint tests...\n');
    console.log(`🎯 Target URL: ${this.baseURL}\n`);

    const tests = [
      { name: 'Health Check', fn: () => this.testHealthCheck() },
      { name: 'Admin Endpoints', fn: () => this.testAdminEndpoints() },
      { name: 'Authentication Flow', fn: () => this.testAuthFlow() },
      { name: 'CRUD Endpoints', fn: () => this.testCRUDEndpoints() },
      { name: 'Dashboard', fn: () => this.testDashboard() },
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        const result = await test.fn();
        if (result) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        console.log(`❌ ${test.name} threw error:`, error.message);
        failed++;
      }
    }

    console.log('\n📊 TEST RESULTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (failed === 0) {
      console.log('🎉 All tests passed! API is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Check the logs above for details.');
    }

    process.exit(failed === 0 ? 0 : 1);
  } catch (error) {
    console.error('🚨 Test runner error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests();
}

module.exports = { APITester };