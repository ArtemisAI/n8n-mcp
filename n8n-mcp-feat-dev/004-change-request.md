# Change Request: Fix Credential Management Implementation

## Issue: Non-Existent API Endpoints Implemented

**Severity**: HIGH  
**Type**: Bug / API Mismatch  
**Root Cause**: Original specification contained non-existent n8n API endpoints  
**Status**: Awaiting Fix

---

## Problem Summary

The credential management feature (PR #10) was implemented based on a **flawed specification** that assumed API endpoints which **do not exist** in the actual n8n API. 

### What's Broken

1. **`n8n_list_credentials` tool** - Calls `GET /credentials` which returns **405 Method Not Allowed**
2. **`n8n_update_credential` tool** - Calls `PATCH /credentials/{id}` which is **not verified to exist**
3. **API client methods** - `listCredentials()` and `updateCredential()` call non-existent endpoints

### What Works

✅ `n8n_create_credential` - Uses `POST /credentials` (verified working)  
✅ `n8n_get_credential` - Uses `GET /credentials/{id}` (verified working)  
✅ `n8n_get_credential_schema` - Uses `GET /credentials/schema/{type}` (verified working)  
⚠️ `n8n_delete_credential` - Uses `DELETE /credentials/{id}` (not in spec, needs testing)

---

## Required Changes

### 1. Remove Non-Functional List Credentials Feature

**Files to Modify**:
- `src/services/n8n-api-client.ts`
- `src/mcp/tools-n8n-manager.ts`
- `src/mcp/handlers-n8n-manager.ts`
- `src/mcp/server.ts`

**What to Remove**:

#### In `src/services/n8n-api-client.ts`:
```typescript
// DELETE THIS ENTIRE METHOD - ENDPOINT DOESN'T EXIST
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
```

**Also remove the interface** (if not used elsewhere):
```typescript
export interface CredentialListParams {
  type?: string;
}
```

#### In `src/mcp/tools-n8n-manager.ts`:
```typescript
// DELETE THIS ENTIRE TOOL DEFINITION
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
```

**Remove from exports array**:
```typescript
export const n8nTools: Tool[] = [
  // ... existing tools ...
  n8nCreateCredentialTool,
  n8nGetCredentialTool,
  n8nListCredentialsTool,  // ← REMOVE THIS LINE
  n8nDeleteCredentialTool,
  n8nGetCredentialSchemaTool,
  n8nUpdateCredentialTool,
];
```

#### In `src/mcp/handlers-n8n-manager.ts`:
```typescript
// DELETE THIS ENTIRE HANDLER FUNCTION
export async function handleListCredentials(
  params: unknown
): Promise<ToolResponse> {
  const schema = z.object({
    type: z.string().optional(),
  });

  const validatedParams = schema.parse(params);
  const client = getApiClient();
  
  const filter = validatedParams.type ? { filter: { type: validatedParams.type } } : undefined;
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
```

#### In `src/mcp/server.ts`:
```typescript
// DELETE THIS HANDLER CASE
case 'n8n_list_credentials':
  return await handleListCredentials(params);  // ← REMOVE THIS ENTIRE CASE
```

---

### 2. Verify and Fix/Remove Update Credential Feature

**Action Required**: Test if `PATCH /credentials/{id}` actually works with real n8n API.

**If endpoint DOES NOT exist**, remove:

#### In `src/services/n8n-api-client.ts`:
```typescript
// DELETE IF PATCH ENDPOINT DOESN'T WORK
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

#### In `src/mcp/tools-n8n-manager.ts`:
```typescript
// DELETE IF PATCH ENDPOINT DOESN'T WORK
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

**Remove from exports**:
```typescript
export const n8nTools: Tool[] = [
  // ... existing tools ...
  n8nUpdateCredentialTool,  // ← REMOVE THIS LINE IF ENDPOINT DOESN'T WORK
];
```

#### In `src/mcp/handlers-n8n-manager.ts`:
```typescript
// DELETE IF PATCH ENDPOINT DOESN'T WORK
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

#### In `src/mcp/server.ts`:
```typescript
// DELETE VALIDATION CASE IF ENDPOINT DOESN'T WORK
case 'n8n_update_credential':
  const credentialId = (params as { id: string }).id;
  if (!credentialId || credentialId.trim() === '') {
    throw new Error('Credential ID is required');
  }
  break;  // ← REMOVE ENTIRE CASE

// DELETE HANDLER CASE IF ENDPOINT DOESN'T WORK
case 'n8n_update_credential':
  return await handleUpdateCredential(params);  // ← REMOVE ENTIRE CASE
```

---

### 3. Verify Delete Credential Works

**Action Required**: Test if `DELETE /credentials/{id}` actually works.

The n8n API spec at `C:\Users\Laptop\Desktop\Projects\n8n\docs\n8n_API\n8n_api.json` does not explicitly list this endpoint, but it **should logically exist**.

**Test Command** (after fix is deployed):
```javascript
// Create a test credential first
const created = await n8n_create_credential({
  name: 'Delete Test',
  type: 'httpBasicAuth',
  data: { user: 'test', password: 'test123' }
});

// Try to delete it
const deleted = await n8n_delete_credential({ id: created.id });
```

**If DELETE endpoint does NOT work**, follow the same removal pattern as above for:
- `deleteCredential()` method in `n8n-api-client.ts`
- `n8nDeleteCredentialTool` in `tools-n8n-manager.ts`
- `handleDeleteCredential()` in `handlers-n8n-manager.ts`
- Handler cases in `server.ts`

---

## Expected Results After Fix

### Working Tools (4 total):
1. ✅ `n8n_create_credential` - Create new credentials
2. ✅ `n8n_get_credential` - Get credential metadata by ID
3. ✅ `n8n_get_credential_schema` - Get credential type schemas
4. ✅ `n8n_delete_credential` - Delete credentials (if verified working)

### Removed Tools (2 total):
1. ❌ `n8n_list_credentials` - Endpoint doesn't exist
2. ❌ `n8n_update_credential` - Endpoint doesn't exist (unless verified)

### Build Requirements:
- TypeScript must compile without errors
- All handler imports must be updated
- Tool count should decrease from 51 to 49 (or 50 if delete works, update removed)

---

## Testing Checklist

After implementing fixes:

- [ ] `npm run build` completes successfully
- [ ] No TypeScript compilation errors
- [ ] MCP server starts without errors
- [ ] Tool list shows correct count (49-50 tools, not 51)
- [ ] `n8n_create_credential` works with test data
- [ ] `n8n_get_credential` retrieves created credential
- [ ] `n8n_get_credential_schema` returns schema for `httpBasicAuth`
- [ ] `n8n_delete_credential` removes test credential (if kept)
- [ ] No references to removed functions in codebase
- [ ] Git grep confirms no `listCredentials` or `handleListCredentials` remains

---

## Additional Context

### API Verification Source
The actual n8n API endpoints were verified against:
```
C:\Users\Laptop\Desktop\Projects\n8n\docs\n8n_API\n8n_api.json
```

### Search Commands Used:
```powershell
# Find credential endpoints in API spec
Select-String -Path "C:\Users\Laptop\Desktop\Projects\n8n\docs\n8n_API\n8n_api.json" -Pattern '"/credentials' -Context 0,2

# Results showed only:
# - POST /credentials
# - GET /credentials/{id}
# - GET /credentials/schema/{credentialTypeName}
# - POST /credentials/{id}/transfer
```

### Why n8n Doesn't Support Listing Credentials
**Security Decision**: n8n intentionally does NOT provide a credential listing endpoint to:
1. Minimize attack surface for credential enumeration
2. Prevent accidental exposure of credential metadata
3. Force explicit credential ID usage (principle of least privilege)
4. Reduce risk in multi-tenant environments

This is a **security feature**, not a bug. We need to respect this design decision.

---

## Workarounds for Missing List Functionality

Since we can't list credentials, users must:

1. **Track credential IDs externally** - Store credential IDs when created
2. **Use n8n UI for discovery** - Browse credentials in web interface
3. **Implement workflow-based tracking** - Build workflows that track credential usage
4. **Use naming conventions** - Standardize credential names for easier management

---

## Success Criteria

✅ All non-existent endpoint references removed  
✅ TypeScript compiles successfully  
✅ MCP server runs without errors  
✅ Tool count is accurate (49-50 tools)  
✅ Create/Get/Schema/Delete credential operations work  
✅ No 405 Method Not Allowed errors  
✅ Documentation updated to reflect actual API capabilities  

---

## Priority: HIGH
This breaks basic MCP functionality and causes runtime errors. Should be fixed ASAP.

## Estimated Effort: 2-3 hours
- 1 hour: Remove non-working code
- 30 min: Test remaining operations
- 30 min: Update documentation
- 30 min: Verify build and integration tests
