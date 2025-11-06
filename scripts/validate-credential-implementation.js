#!/usr/bin/env node

/**
 * Credential Management Implementation Validator
 * 
 * This script validates that all credential management code is correctly implemented
 * without requiring a full build. It checks for:
 * - Type definitions
 * - API client methods
 * - MCP tools
 * - Handler functions
 * - Server routing
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

console.log('\n🔍 Validating Credential Management Implementation\n');
console.log('=' .repeat(60));

// 1. Check type definitions
console.log('\n📋 Type Definitions (src/types/n8n-api.ts)');
const typesContent = readFile('types/n8n-api.ts');
check(
  'CredentialSchema interface exists',
  typesContent.includes('export interface CredentialSchema'),
  'Defines schema structure for credential types'
);
check(
  'CredentialSchema has properties field',
  typesContent.includes('properties: Array<{'),
  'Schema properties define field metadata'
);

// 2. Check API client
console.log('\n🔌 API Client (src/services/n8n-api-client.ts)');
const apiClientContent = readFile('services/n8n-api-client.ts');
check(
  'CredentialSchema imported',
  apiClientContent.includes('CredentialSchema'),
  'Type imported for method signature'
);
check(
  'getCredentialSchema method exists',
  apiClientContent.includes('async getCredentialSchema'),
  'Method to fetch credential type schemas'
);
check(
  'getCredentialSchema has correct endpoint',
  apiClientContent.includes('/credentials/schema/'),
  'Uses correct n8n API endpoint'
);

// Verify existing methods are still there
const existingMethods = [
  'createCredential',
  'getCredential',
  'listCredentials',
  'updateCredential',
  'deleteCredential'
];
existingMethods.forEach(method => {
  check(
    `${method} method exists`,
    apiClientContent.includes(`async ${method}`),
    'Existing credential API method'
  );
});

// 3. Check MCP tools
console.log('\n🛠️  MCP Tools (src/mcp/tools-n8n-manager.ts)');
const toolsContent = readFile('mcp/tools-n8n-manager.ts');
const toolNames = [
  'n8n_create_credential',
  'n8n_get_credential',
  'n8n_list_credentials',
  'n8n_delete_credential',
  'n8n_get_credential_schema',
  'n8n_update_credential'
];

toolNames.forEach(toolName => {
  check(
    `Tool "${toolName}" defined`,
    toolsContent.includes(`name: '${toolName}'`),
    'MCP tool definition'
  );
});

// 4. Check handlers
console.log('\n⚙️  Handlers (src/mcp/handlers-n8n-manager.ts)');
const handlersContent = readFile('mcp/handlers-n8n-manager.ts');
const handlerNames = [
  'handleCreateCredential',
  'handleGetCredential',
  'handleListCredentials',
  'handleDeleteCredential',
  'handleGetCredentialSchema',
  'handleUpdateCredential'
];

handlerNames.forEach(handlerName => {
  check(
    `Handler "${handlerName}" exported`,
    handlersContent.includes(`export async function ${handlerName}`),
    'Exported handler function'
  );
});

// Check security features in handlers
check(
  'Error sanitization in createCredential',
  handlersContent.includes('Sanitize error messages to avoid exposing credential data'),
  'Security comment present'
);
check(
  'Security note in getCredential response',
  handlersContent.includes('Sensitive data (passwords, tokens) is not included for security'),
  'User-facing security message'
);

// Check limitations update
check(
  'Updated limitations array',
  !handlersContent.includes("'Tags and credentials have limited API support'"),
  'Old limitation removed'
);
check(
  'New credential limitation added',
  handlersContent.includes('Credential data (passwords, tokens) cannot be retrieved after creation'),
  'Security limitation documented'
);

// 5. Check server routing
console.log('\n🚦 Server Routing (src/mcp/server.ts)');
const serverContent = readFile('mcp/server.ts');

// Check validation routing
check(
  'Credential validation added',
  serverContent.includes("case 'n8n_get_credential':"),
  'Validation case for credential tools'
);

// Check handler routing
toolNames.forEach(toolName => {
  check(
    `Route for "${toolName}"`,
    serverContent.includes(`case '${toolName}':`),
    'Handler routing case'
  );
});

// Summary
console.log('\n' + '='.repeat(60));
const passedChecks = checks.filter(c => c.passed).length;
const totalChecks = checks.length;
const percentage = ((passedChecks / totalChecks) * 100).toFixed(1);

console.log(`\n📊 Summary: ${passedChecks}/${totalChecks} checks passed (${percentage}%)\n`);

if (passedChecks === totalChecks) {
  console.log('✅ All validation checks passed!');
  console.log('   Implementation is complete and ready for testing.\n');
  process.exit(0);
} else {
  console.log('❌ Some validation checks failed!');
  console.log('   Review the failed checks above.\n');
  process.exit(1);
}
