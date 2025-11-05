# Feature: Credential Management

## Priority: CRUCIAL ⚠️
**Status**: Pending Implementation  
**Complexity**: High (Security-sensitive, requires careful handling)  
**Estimated Effort**: 8-12 hours

## Problem Statement
Credentials are essential for n8n workflows to connect to external services (APIs, databases, cloud services). Currently, MCP has **zero** credential management capabilities, forcing users to:
1. Manually create credentials in n8n UI before building workflows
2. Cannot automate credential setup in CI/CD pipelines
3. Cannot programmatically manage credential lifecycle
4. Cannot retrieve credential schemas for dynamic form building

This is a **critical gap** because:
- Workflow automation requires credential automation
- DevOps teams need programmatic credential management
- Multi-tenant deployments need credential isolation control
- Secret rotation requires API access

## Security Considerations ⚠️

### CRITICAL: Credential Data Protection
**n8n NEVER returns credential data (passwords, tokens, secrets) via API**. The API only returns:
- Credential metadata (id, name, type)
- Credential structure (which fields exist)
- Credential schemas (field definitions)

**DO NOT ATTEMPT to retrieve or expose sensitive credential data.**

### Implementation Requirements
1. ✅ Use HTTPS for all API calls (enforced by n8n)
2. ✅ Validate API key permissions before credential operations
3. ✅ Never log credential data
4. ✅ Sanitize error messages (don't expose credential values)
5. ✅ Document security implications clearly

## Solution Overview
Create MCP tools for credential lifecycle management with proper security controls and clear documentation about data exposure limitations.

## API Endpoints

### 1. POST `/credentials`
**Purpose**: Create a new credential

**Request**:
```http
POST /api/v1/credentials
Content-Type: application/json
X-N8N-API-KEY: <api-key>

{
  "name": "My Gmail Account",
  "type": "gmailOAuth2Api",
  "data": {
    "clientId": "xxx",
    "clientSecret": "xxx",
    "oauthTokenData": {
      "access_token": "xxx",
      "refresh_token": "xxx"
    }
  }
}
```

**Response**: `200 OK`
```json
{
  "id": "credential-id",
  "name": "My Gmail Account",
  "type": "gmailOAuth2Api",
  "createdAt": "2025-11-05T18:00:00.000Z",
  "updatedAt": "2025-11-05T18:00:00.000Z"
  // NOTE: data field is NOT returned
}
```

### 2. GET `/credentials/{id}`
**Purpose**: Get credential metadata (NOT the actual secret data)

**Request**:
```http
GET /api/v1/credentials/{id}
X-N8N-API-KEY: <api-key>
```

**Response**: `200 OK`
```json
{
  "id": "credential-id",
  "name": "My Gmail Account",
  "type": "gmailOAuth2Api",
  "createdAt": "2025-11-05T18:00:00.000Z",
  "updatedAt": "2025-11-05T18:00:00.000Z"
  // NOTE: data field is NOT returned for security
}
```

### 3. GET `/credentials`
**Purpose**: List all credentials (metadata only)

**Request**:
```http
GET /api/v1/credentials?filter={"type":"gmailOAuth2Api"}
X-N8N-API-KEY: <api-key>
```

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "cred-1",
      "name": "Gmail Primary",
      "type": "gmailOAuth2Api",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### 4. DELETE `/credentials/{id}`
**Purpose**: Delete a credential

**Request**:
```http
DELETE /api/v1/credentials/{id}
X-N8N-API-KEY: <api-key>
```

**Response**: `200 OK`
```json
{
  "id": "credential-id",
  "deleted": true
}
```

### 5. GET `/credentials/schema/{credentialTypeName}`
**Purpose**: Get credential type schema (for form building)

**Request**:
```http
GET /api/v1/credentials/schema/gmailOAuth2Api
X-N8N-API-KEY: <api-key>
```

**Response**: `200 OK`
```json
{
  "type": "gmailOAuth2Api",
  "displayName": "Gmail OAuth2 API",
  "properties": [
    {
      "name": "clientId",
      "type": "string",
      "required": true,
      "displayName": "Client ID"
    },
    {
      "name": "clientSecret",
      "type": "string",
      "required": true,
      "typeOptions": {
        "password": true
      }
    }
  ]
}
```

### 6. PATCH `/credentials/{id}`
**Purpose**: Update credential metadata (name, etc.)

**Request**:
```http
PATCH /api/v1/credentials/{id}
Content-Type: application/json
X-N8N-API-KEY: <api-key>

{
  "name": "Gmail Updated Name"
}
```

## Implementation Details

### Files to Modify

#### 1. `src/services/n8n-api-client.ts`
**Location**: Create new credential methods section

**Add Interface** (at top with other interfaces):
```typescript
export interface Credential {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  // Note: data field never returned by API for security
}

export interface CredentialSchema {
  type: string;
  displayName: string;
  properties: Array<{
    name: string;
    type: string;
    required?: boolean;
    displayName?: string;
    typeOptions?: Record<string, any>;
  }>;
}

export interface CreateCredentialInput {
  name: string;
  type: string;
  data: Record<string, any>;
}
```

**Add Methods** (after execution methods):
```typescript
/**
 * Create a new credential
 * WARNING: Credential data is sensitive. Ensure proper security controls.
 */
async createCredential(input: CreateCredentialInput): Promise<Credential> {
  try {
    const response = await this.axiosInstance.post<Credential>(
      '/credentials',
      input
    );
    return response.data;
  } catch (error) {
    // Sanitize error to avoid exposing credential data
    throw this.handleN8nApiError(error, 'create credential');
  }
}

/**
 * Get credential metadata (does NOT return sensitive data)
 */
async getCredential(id: string): Promise<Credential> {
  try {
    const response = await this.axiosInstance.get<Credential>(
      `/credentials/${id}`
    );
    return response.data;
  } catch (error) {
    throw this.handleN8nApiError(error, 'get credential');
  }
}

/**
 * List credentials (metadata only, no sensitive data)
 */
async listCredentials(filter?: {
  type?: string;
}): Promise<{ data: Credential[] }> {
  try {
    const params: any = {};
    if (filter) {
      params.filter = JSON.stringify(filter);
    }
    const response = await this.axiosInstance.get<{ data: Credential[] }>(
      '/credentials',
      { params }
    );
    return response.data;
  } catch (error) {
    throw this.handleN8nApiError(error, 'list credentials');
  }
}

/**
 * Delete a credential
 */
async deleteCredential(id: string): Promise<{ id: string; deleted: boolean }> {
  try {
    const response = await this.axiosInstance.delete<{ id: string; deleted: boolean }>(
      `/credentials/${id}`
    );
    return response.data;
  } catch (error) {
    throw this.handleN8nApiError(error, 'delete credential');
  }
}

/**
 * Get credential type schema for dynamic form building
 */
async getCredentialSchema(credentialTypeName: string): Promise<CredentialSchema> {
  try {
    const response = await this.axiosInstance.get<CredentialSchema>(
      `/credentials/schema/${credentialTypeName}`
    );
    return response.data;
  } catch (error) {
    throw this.handleN8nApiError(error, 'get credential schema');
  }
}

/**
 * Update credential metadata
 */
async updateCredential(
  id: string,
  updates: { name?: string }
): Promise<Credential> {
  try {
    const response = await this.axiosInstance.patch<Credential>(
      `/credentials/${id}`,
      updates
    );
    return response.data;
  } catch (error) {
    throw this.handleN8nApiError(error, 'update credential');
  }
}
```

#### 2. `src/mcp/tools-n8n-manager.ts`
**Location**: Create new credential tools section

**Add Tool Definitions**:
```typescript
export const n8nCreateCredentialTool: Tool = {
  name: 'n8n_create_credential',
  description: 'Create a new credential. WARNING: Handle credential data securely. The API returns metadata only, not the credential secrets.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Credential name (must be unique)',
      },
      type: {
        type: 'string',
        description: 'Credential type (e.g., "httpBasicAuth", "gmailOAuth2Api"). Use n8n_get_credential_schema to see available fields.',
      },
      data: {
        type: 'object',
        description: 'Credential data object with type-specific fields. Structure varies by credential type.',
      },
    },
    required: ['name', 'type', 'data'],
  },
};

export const n8nGetCredentialTool: Tool = {
  name: 'n8n_get_credential',
  description: 'Get credential metadata. NOTE: Does NOT return sensitive credential data (passwords, tokens). Only returns id, name, type, timestamps.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Credential ID',
      },
    },
    required: ['id'],
  },
};

export const n8nListCredentialsTool: Tool = {
  name: 'n8n_list_credentials',
  description: 'List all credentials (metadata only). Returns id, name, type for each credential. No sensitive data included.',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'Optional: Filter by credential type (e.g., "httpBasicAuth")',
      },
    },
    required: [],
  },
};

export const n8nDeleteCredentialTool: Tool = {
  name: 'n8n_delete_credential',
  description: 'Delete a credential. WARNING: This will break workflows using this credential. Use with caution.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Credential ID to delete',
      },
    },
    required: ['id'],
  },
};

export const n8nGetCredentialSchemaTool: Tool = {
  name: 'n8n_get_credential_schema',
  description: 'Get the schema for a credential type. Shows which fields are required and their types. Useful for building credential creation forms.',
  inputSchema: {
    type: 'object',
    properties: {
      credentialTypeName: {
        type: 'string',
        description: 'Credential type name (e.g., "httpBasicAuth", "gmailOAuth2Api", "slackOAuth2Api")',
      },
    },
    required: ['credentialTypeName'],
  },
};

export const n8nUpdateCredentialTool: Tool = {
  name: 'n8n_update_credential',
  description: 'Update credential metadata (currently only name can be updated). Cannot update credential data for security reasons.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Credential ID',
      },
      name: {
        type: 'string',
        description: 'New credential name',
      },
    },
    required: ['id', 'name'],
  },
};
```

**Export Addition**:
```typescript
export const n8nTools: Tool[] = [
  // ... existing tools ...
  n8nCreateCredentialTool,
  n8nGetCredentialTool,
  n8nListCredentialsTool,
  n8nDeleteCredentialTool,
  n8nGetCredentialSchemaTool,
  n8nUpdateCredentialTool,
];
```

#### 3. `src/mcp/handlers-n8n-manager.ts`
**Location**: Create new credential handlers section

**Add Handler Functions**:
```typescript
/**
 * Handle create credential request
 */
export async function handleCreateCredential(
  params: unknown
): Promise<ToolResponse> {
  const schema = z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    data: z.record(z.any()),
  });

  const validatedParams = schema.parse(params);
  const client = getApiClient();
  
  try {
    const credential = await client.createCredential(validatedParams);
    
    return {
      success: true,
      data: {
        id: credential.id,
        name: credential.name,
        type: credential.type,
        createdAt: credential.createdAt,
      },
      message: `Credential "${credential.name}" created successfully. ID: ${credential.id}. NOTE: Credential data is stored securely and cannot be retrieved via API.`,
    };
  } catch (error: any) {
    // Sanitize error messages to avoid exposing credential data
    if (error.response?.status === 400) {
      return {
        success: false,
        error: {
          message: 'Invalid credential data. Check the credential schema for required fields.',
          code: 'INVALID_CREDENTIAL_DATA',
        },
      };
    }
    throw error;
  }
}

/**
 * Handle get credential request
 */
export async function handleGetCredential(
  params: unknown
): Promise<ToolResponse> {
  const schema = z.object({
    id: z.string(),
  });

  const validatedParams = schema.parse(params);
  const client = getApiClient();
  
  const credential = await client.getCredential(validatedParams.id);
  
  return {
    success: true,
    data: credential,
    message: `Retrieved credential metadata. NOTE: Sensitive data (passwords, tokens) is not included for security.`,
  };
}

/**
 * Handle list credentials request
 */
export async function handleListCredentials(
  params: unknown
): Promise<ToolResponse> {
  const schema = z.object({
    type: z.string().optional(),
  });

  const validatedParams = schema.parse(params);
  const client = getApiClient();
  
  const filter = validatedParams.type ? { type: validatedParams.type } : undefined;
  const result = await client.listCredentials(filter);
  
  return {
    success: true,
    data: {
      credentials: result.data,
      count: result.data.length,
    },
    message: `Found ${result.data.length} credential${result.data.length !== 1 ? 's' : ''}${validatedParams.type ? ` of type "${validatedParams.type}"` : ''}`,
  };
}

/**
 * Handle delete credential request
 */
export async function handleDeleteCredential(
  params: unknown
): Promise<ToolResponse> {
  const schema = z.object({
    id: z.string(),
  });

  const validatedParams = schema.parse(params);
  const client = getApiClient();
  
  // Get credential name before deletion
  const credential = await client.getCredential(validatedParams.id);
  
  await client.deleteCredential(validatedParams.id);
  
  return {
    success: true,
    data: {
      id: validatedParams.id,
      name: credential.name,
      deleted: true,
    },
    message: `Credential "${credential.name}" (${validatedParams.id}) deleted successfully. WARNING: Workflows using this credential will fail until updated.`,
  };
}

/**
 * Handle get credential schema request
 */
export async function handleGetCredentialSchema(
  params: unknown
): Promise<ToolResponse> {
  const schema = z.object({
    credentialTypeName: z.string(),
  });

  const validatedParams = schema.parse(params);
  const client = getApiClient();
  
  const credentialSchema = await client.getCredentialSchema(
    validatedParams.credentialTypeName
  );
  
  return {
    success: true,
    data: credentialSchema,
    message: `Retrieved schema for credential type "${credentialSchema.displayName}"`,
  };
}

/**
 * Handle update credential request
 */
export async function handleUpdateCredential(
  params: unknown
): Promise<ToolResponse> {
  const schema = z.object({
    id: z.string(),
    name: z.string().min(1),
  });

  const validatedParams = schema.parse(params);
  const client = getApiClient();
  
  const credential = await client.updateCredential(
    validatedParams.id,
    { name: validatedParams.name }
  );
  
  return {
    success: true,
    data: credential,
    message: `Credential renamed to "${credential.name}"`,
  };
}
```

#### 4. `src/mcp/server.ts`
**Location**: Two sections to modify

**A. Validation Routing**:
```typescript
// Add credential validation cases
case 'n8n_get_credential':
case 'n8n_delete_credential':
case 'n8n_update_credential':
  const credentialId = (params as { id: string }).id;
  // Basic ID validation
  if (!credentialId || credentialId.trim() === '') {
    throw new Error('Credential ID is required');
  }
  break;

case 'n8n_get_credential_schema':
  const credType = (params as { credentialTypeName: string }).credentialTypeName;
  if (!credType || credType.trim() === '') {
    throw new Error('Credential type name is required');
  }
  break;
```

**B. Handler Routing**:
```typescript
case 'n8n_create_credential':
  return await handleCreateCredential(params);
case 'n8n_get_credential':
  return await handleGetCredential(params);
case 'n8n_list_credentials':
  return await handleListCredentials(params);
case 'n8n_delete_credential':
  return await handleDeleteCredential(params);
case 'n8n_get_credential_schema':
  return await handleGetCredentialSchema(params);
case 'n8n_update_credential':
  return await handleUpdateCredential(params);
```

#### 5. Update Limitations List
**Location**: `src/mcp/handlers-n8n-manager.ts` - LIMITATIONS array

**Remove**:
```typescript
'Tags and credentials have limited API support'
```

**Add**:
```typescript
'Credential data (passwords, tokens) cannot be retrieved after creation (security feature)',
'Cannot test credentials via API (must use n8n UI)'
```

## Testing Plan

### 1. Schema Discovery Test
```javascript
// Get schema for HTTP Basic Auth
const schema = await n8n_get_credential_schema({
  credentialTypeName: 'httpBasicAuth'
});
// Verify schema returned with required fields
```

### 2. Credential Lifecycle Test
```javascript
// 1. Create credential
const created = await n8n_create_credential({
  name: 'Test API Key',
  type: 'httpHeaderAuth',
  data: {
    name: 'X-API-Key',
    value: 'test-key-123'
  }
});

// 2. List credentials
const list = await n8n_list_credentials({ type: 'httpHeaderAuth' });

// 3. Get credential
const retrieved = await n8n_get_credential({ id: created.id });

// 4. Update credential
const updated = await n8n_update_credential({
  id: created.id,
  name: 'Test API Key - Updated'
});

// 5. Delete credential
const deleted = await n8n_delete_credential({ id: created.id });
```

### 3. Security Test
```javascript
// Verify that credential data is NOT returned
const credential = await n8n_get_credential({ id: 'cred-id' });
// Assert: credential.data is undefined
// Assert: No passwords/tokens in response
```

## Use Cases

### 1. CI/CD Credential Provisioning
```javascript
// Automatically set up credentials for new environment
const credentials = [
  { name: 'Slack Prod', type: 'slackApi', data: { token: process.env.SLACK_TOKEN } },
  { name: 'DB Prod', type: 'postgres', data: { host: '...', password: process.env.DB_PASSWORD } }
];

for (const cred of credentials) {
  await n8n_create_credential(cred);
}
```

### 2. Credential Audit
```javascript
// List all credentials and check for unused ones
const allCreds = await n8n_list_credentials({});
const allWorkflows = await n8n_list_workflows({});

// Find credentials not used in any workflow
const usedCredIds = new Set();
allWorkflows.forEach(wf => {
  // Parse workflow nodes for credential references
  wf.nodes.forEach(node => {
    if (node.credentials) {
      Object.values(node.credentials).forEach(cred => {
        usedCredIds.add(cred.id);
      });
    }
  });
});

const unusedCreds = allCreds.credentials.filter(c => !usedCredIds.has(c.id));
console.log(`Found ${unusedCreds.length} unused credentials`);
```

### 3. Dynamic Form Building
```javascript
// Build UI form for credential creation
const schema = await n8n_get_credential_schema({
  credentialTypeName: 'gmailOAuth2Api'
});

// Use schema.properties to render form fields
schema.properties.forEach(prop => {
  renderFormField({
    name: prop.name,
    label: prop.displayName,
    type: prop.type,
    required: prop.required,
    isPassword: prop.typeOptions?.password
  });
});
```

## Benefits
1. ✅ Enables automated credential provisioning
2. ✅ Supports CI/CD workflow deployment
3. ✅ Provides credential lifecycle management
4. ✅ Enables programmatic credential auditing
5. ✅ Maintains security by never exposing sensitive data

## Security Warnings ⚠️
1. **Credential data is WRITE-ONLY**: Once created, secrets cannot be retrieved
2. **Handle input securely**: Credential data should come from secure sources (env vars, secret managers)
3. **Log carefully**: Never log credential creation requests
4. **Error messages**: Sanitized to avoid exposing secrets
5. **API key permissions**: Ensure API key has credential management permissions

## Success Criteria
- [ ] All 6 credential tools appear in tool list
- [ ] Can create credential successfully
- [ ] Credential data is NOT returned in responses
- [ ] Can list credentials with filtering
- [ ] Can get credential schema
- [ ] Can update credential name
- [ ] Can delete credential
- [ ] Error handling prevents data exposure
- [ ] TypeScript compiles without errors
- [ ] Security documentation is clear

## Related Documentation
- n8n API Security: https://docs.n8n.io/api/authentication/
- Credential Types: Available via `n8n_get_credential_schema`

## Future Enhancements
- Credential testing endpoint (if n8n adds it)
- Credential data update (requires re-encrypting)
- Credential sharing/permissions management
- Credential templates for common services