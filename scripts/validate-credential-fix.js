#!/usr/bin/env node

/**
 * Credential Management Fix Validator
 * 
 * Validates that non-existent API endpoint references have been removed.
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const checks = [];

function readFile(filePath) {
  return fs.readFileSync(path.join(srcDir, filePath), 'utf8');
}

function check(name, condition, details) {
  const result = { name, passed: condition, details };
  checks.push(result);
  
  const icon = condition ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }
  return condition;
}

console.log('\n🔍 Validating Credential Management Fix\n');
console.log('=' .repeat(60));

// Check that non-existent endpoints are removed
console.log('\n📋 API Client (src/services/n8n-api-client.ts)');
const apiClientContent = readFile('services/n8n-api-client.ts');

check(
  'listCredentials method removed',
  !apiClientContent.includes('async listCredentials'),
  'GET /credentials endpoint does not exist'
);

check(
  'updateCredential method removed',
  !apiClientContent.includes('async updateCredential'),
  'PATCH /credentials/{id} endpoint does not exist'
);

check(
  'CredentialListParams import removed',
  !apiClientContent.includes('CredentialListParams'),
  'Type no longer needed'
);

check(
  'CredentialListResponse import removed',
  !apiClientContent.includes('CredentialListResponse'),
  'Type no longer needed'
);

// Verify working methods are still present
check(
  'createCredential method exists',
  apiClientContent.includes('async createCredential'),
  'POST /credentials endpoint exists'
);

check(
  'getCredential method exists',
  apiClientContent.includes('async getCredential'),
  'GET /credentials/{id} endpoint exists'
);

check(
  'deleteCredential method exists',
  apiClientContent.includes('async deleteCredential'),
  'DELETE /credentials/{id} endpoint (to be verified)'
);

check(
  'getCredentialSchema method exists',
  apiClientContent.includes('async getCredentialSchema'),
  'GET /credentials/schema/{type} endpoint exists'
);

// Check MCP Tools
console.log('\n🛠️  MCP Tools (src/mcp/tools-n8n-manager.ts)');
const toolsContent = readFile('mcp/tools-n8n-manager.ts');

check(
  'n8n_list_credentials tool removed',
  !toolsContent.includes("name: 'n8n_list_credentials'"),
  'Tool for non-existent endpoint removed'
);

check(
  'n8n_update_credential tool removed',
  !toolsContent.includes("name: 'n8n_update_credential'"),
  'Tool for non-existent endpoint removed'
);

check(
  'n8n_create_credential tool exists',
  toolsContent.includes("name: 'n8n_create_credential'"),
  'Tool for working endpoint'
);

check(
  'n8n_get_credential tool exists',
  toolsContent.includes("name: 'n8n_get_credential'"),
  'Tool for working endpoint'
);

check(
  'n8n_delete_credential tool exists',
  toolsContent.includes("name: 'n8n_delete_credential'"),
  'Tool for endpoint (to be verified)'
);

check(
  'n8n_get_credential_schema tool exists',
  toolsContent.includes("name: 'n8n_get_credential_schema'"),
  'Tool for working endpoint'
);

// Check Handlers
console.log('\n⚙️  Handlers (src/mcp/handlers-n8n-manager.ts)');
const handlersContent = readFile('mcp/handlers-n8n-manager.ts');

check(
  'handleListCredentials removed',
  !handlersContent.includes('export async function handleListCredentials'),
  'Handler for non-existent endpoint removed'
);

check(
  'handleUpdateCredential removed',
  !handlersContent.includes('export async function handleUpdateCredential'),
  'Handler for non-existent endpoint removed'
);

check(
  'handleCreateCredential exists',
  handlersContent.includes('export async function handleCreateCredential'),
  'Handler for working endpoint'
);

check(
  'handleGetCredential exists',
  handlersContent.includes('export async function handleGetCredential'),
  'Handler for working endpoint'
);

check(
  'handleDeleteCredential exists',
  handlersContent.includes('export async function handleDeleteCredential'),
  'Handler for endpoint (to be verified)'
);

check(
  'handleGetCredentialSchema exists',
  handlersContent.includes('export async function handleGetCredentialSchema'),
  'Handler for working endpoint'
);

// Check Server Routing
console.log('\n🚦 Server Routing (src/mcp/server.ts)');
const serverContent = readFile('mcp/server.ts');

check(
  'n8n_list_credentials routing removed',
  !serverContent.includes("case 'n8n_list_credentials':"),
  'Route for non-existent endpoint removed'
);

check(
  'n8n_update_credential routing removed',
  !serverContent.includes("case 'n8n_update_credential':"),
  'Route for non-existent endpoint removed'
);

check(
  'handleListCredentials call removed',
  !serverContent.includes('handleListCredentials'),
  'Handler call removed'
);

check(
  'handleUpdateCredential call removed',
  !serverContent.includes('handleUpdateCredential'),
  'Handler call removed'
);

// Check Types
console.log('\n📐 Types (src/types/n8n-api.ts)');
const typesContent = readFile('types/n8n-api.ts');

check(
  'CredentialListParams removed',
  !typesContent.includes('export interface CredentialListParams'),
  'Unused type definition removed'
);

check(
  'CredentialListResponse removed',
  !typesContent.includes('export interface CredentialListResponse'),
  'Unused type definition removed'
);

check(
  'CredentialSchema still exists',
  typesContent.includes('export interface CredentialSchema'),
  'Used type definition kept'
);

// Summary
console.log('\n' + '='.repeat(60));
const passedChecks = checks.filter(c => c.passed).length;
const totalChecks = checks.length;
const percentage = ((passedChecks / totalChecks) * 100).toFixed(1);

console.log(`\n📊 Summary: ${passedChecks}/${totalChecks} checks passed (${percentage}%)\n`);

if (passedChecks === totalChecks) {
  console.log('✅ All validation checks passed!');
  console.log('   Non-existent API endpoints have been removed.');
  console.log('   Working endpoints remain: create, get, delete, get_schema\n');
  process.exit(0);
} else {
  console.log('❌ Some validation checks failed!');
  console.log('   Review the failed checks above.\n');
  process.exit(1);
}
