# Feature: Tag Management

## Priority: MEDIUM 📊
**Status**: ✅ IMPLEMENTED  
**Complexity**: Low-Medium  
**Estimated Effort**: 4-6 hours  
**Implementation Date**: November 6, 2025

## Problem Statement
Tags are essential for organizing workflows in n8n, especially for large deployments with dozens or hundreds of workflows. Currently, MCP has **no tag management capabilities**, preventing:
- Automated workflow organization
- Programmatic tagging during CI/CD deployment
- Bulk workflow categorization
- Tag-based workflow filtering and discovery
- Automated cleanup of unused tags

This limits:
- DevOps automation workflows
- Multi-team deployments requiring workflow categorization
- Workflow lifecycle management (dev, staging, prod tags)
- Automated documentation and inventory systems

## Solution Overview
Create MCP tools for complete tag lifecycle management, enabling programmatic organization of workflows through tags.

## API Endpoints

### 1. POST `/tags`
**Purpose**: Create a new tag

**Request**:
```http
POST /api/v1/tags
Content-Type: application/json
X-N8N-API-KEY: <api-key>

{
  "name": "production"
}
```

**Response**: `200 OK`
```json
{
  "id": "tag-id",
  "name": "production",
  "createdAt": "2025-11-05T18:00:00.000Z",
  "updatedAt": "2025-11-05T18:00:00.000Z"
}
```

### 2. GET `/tags`
**Purpose**: List all tags

**Request**:
```http
GET /api/v1/tags
X-N8N-API-KEY: <api-key>
```

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "tag-1",
      "name": "production",
      "createdAt": "...",
      "updatedAt": "..."
    },
    {
      "id": "tag-2",
      "name": "staging",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### 3. GET `/tags/{id}`
**Purpose**: Get a specific tag

**Request**:
```http
GET /api/v1/tags/{id}
X-N8N-API-KEY: <api-key>
```

**Response**: `200 OK`
```json
{
  "id": "tag-id",
  "name": "production",
  "createdAt": "2025-11-05T18:00:00.000Z",
  "updatedAt": "2025-11-05T18:00:00.000Z",
  "workflowCount": 5
}
```

### 4. PATCH `/tags/{id}`
**Purpose**: Update tag name

**Request**:
```http
PATCH /api/v1/tags/{id}
Content-Type: application/json
X-N8N-API-KEY: <api-key>

{
  "name": "prod"
}
```

**Response**: `200 OK`
```json
{
  "id": "tag-id",
  "name": "prod",
  "updatedAt": "2025-11-05T18:30:00.000Z"
}
```

### 5. DELETE `/tags/{id}`
**Purpose**: Delete a tag (removes from all workflows)

**Request**:
```http
DELETE /api/v1/tags/{id}
X-N8N-API-KEY: <api-key>
```

**Response**: `200 OK`
```json
{
  "id": "tag-id",
  "deleted": true
}
```

### 6. PUT `/workflows/{id}/tags`
**Purpose**: Update workflow tags (add/remove)

**Request**:
```http
PUT /api/v1/workflows/{workflowId}/tags
Content-Type: application/json
X-N8N-API-KEY: <api-key>

{
  "tags": ["tag-id-1", "tag-id-2"]
}
```

**Response**: `200 OK`
```json
{
  "id": "workflow-id",
  "tags": [
    {
      "id": "tag-id-1",
      "name": "production"
    },
    {
      "id": "tag-id-2",
      "name": "api"
    }
  ]
}
```

## Implementation Details

### Files to Modify

#### 1. `src/services/n8n-api-client.ts`

**Add Interface**:
```typescript
export interface Tag {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  workflowCount?: number;
}
```

**Add Methods**:
```typescript
/**
 * Create a new tag
 */
async createTag(name: string): Promise<Tag> {
  try {
    const response = await this.axiosInstance.post<Tag>('/tags', { name });
    return response.data;
  } catch (error) {
    throw this.handleN8nApiError(error, 'create tag');
  }
}

/**
 * List all tags
 */
async listTags(): Promise<{ data: Tag[] }> {
  try {
    const response = await this.axiosInstance.get<{ data: Tag[] }>('/tags');
    return response.data;
  } catch (error) {
    throw this.handleN8nApiError(error, 'list tags');
  }
}

/**
 * Get a specific tag
 */
async getTag(id: string): Promise<Tag> {
  try {
    const response = await this.axiosInstance.get<Tag>(`/tags/${id}`);
    return response.data;
  } catch (error) {
    throw this.handleN8nApiError(error, 'get tag');
  }
}

/**
 * Update tag name
 */
async updateTag(id: string, name: string): Promise<Tag> {
  try {
    const response = await this.axiosInstance.patch<Tag>(`/tags/${id}`, { name });
    return response.data;
  } catch (error) {
    throw this.handleN8nApiError(error, 'update tag');
  }
}

/**
 * Delete a tag (removes from all workflows)
 */
async deleteTag(id: string): Promise<{ id: string; deleted: boolean }> {
  try {
    const response = await this.axiosInstance.delete<{ id: string; deleted: boolean }>(
      `/tags/${id}`
    );
    return response.data;
  } catch (error) {
    throw this.handleN8nApiError(error, 'delete tag');
  }
}

/**
 * Update workflow tags
 */
async updateWorkflowTags(
  workflowId: string,
  tagIds: string[]
): Promise<{ id: string; tags: Tag[] }> {
  try {
    const response = await this.axiosInstance.put<{ id: string; tags: Tag[] }>(
      `/workflows/${workflowId}/tags`,
      { tags: tagIds }
    );
    return response.data;
  } catch (error) {
    throw this.handleN8nApiError(error, 'update workflow tags');
  }
}
```

#### 2. `src/mcp/tools-n8n-manager.ts`

**Add Tool Definitions**:
```typescript
export const n8nCreateTagTool: Tool = {
  name: 'n8n_create_tag',
  description: 'Create a new tag for organizing workflows.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Tag name (must be unique)',
      },
    },
    required: ['name'],
  },
};

export const n8nListTagsTool: Tool = {
  name: 'n8n_list_tags',
  description: 'List all available tags with workflow counts.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export const n8nGetTagTool: Tool = {
  name: 'n8n_get_tag',
  description: 'Get details about a specific tag including workflows using it.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Tag ID',
      },
    },
    required: ['id'],
  },
};

export const n8nUpdateTagTool: Tool = {
  name: 'n8n_update_tag',
  description: 'Update tag name. Changes apply to all workflows using this tag.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Tag ID',
      },
      name: {
        type: 'string',
        description: 'New tag name',
      },
    },
    required: ['id', 'name'],
  },
};

export const n8nDeleteTagTool: Tool = {
  name: 'n8n_delete_tag',
  description: 'Delete a tag. Removes tag from all workflows but does not delete the workflows.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Tag ID to delete',
      },
    },
    required: ['id'],
  },
};

export const n8nUpdateWorkflowTagsTool: Tool = {
  name: 'n8n_update_workflow_tags',
  description: 'Set tags for a workflow. Replaces all existing tags with the provided list.',
  inputSchema: {
    type: 'object',
    properties: {
      workflowId: {
        type: 'string',
        description: 'Workflow ID',
      },
      tagIds: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Array of tag IDs to assign to the workflow. Pass empty array to remove all tags.',
      },
    },
    required: ['workflowId', 'tagIds'],
  },
};
```

#### 3. `src/mcp/handlers-n8n-manager.ts`

**Add Handler Functions**:
```typescript
export async function handleCreateTag(params: unknown): Promise<ToolResponse> {
  const schema = z.object({
    name: z.string().min(1),
  });

  const validatedParams = schema.parse(params);
  const client = getApiClient();
  
  const tag = await client.createTag(validatedParams.name);
  
  return {
    success: true,
    data: tag,
    message: `Tag "${tag.name}" created successfully. ID: ${tag.id}`,
  };
}

export async function handleListTags(params: unknown): Promise<ToolResponse> {
  const client = getApiClient();
  const result = await client.listTags();
  
  return {
    success: true,
    data: {
      tags: result.data,
      count: result.data.length,
    },
    message: `Found ${result.data.length} tag${result.data.length !== 1 ? 's' : ''}`,
  };
}

export async function handleGetTag(params: unknown): Promise<ToolResponse> {
  const schema = z.object({
    id: z.string(),
  });

  const validatedParams = schema.parse(params);
  const client = getApiClient();
  
  const tag = await client.getTag(validatedParams.id);
  
  return {
    success: true,
    data: tag,
    message: `Tag "${tag.name}" is used by ${tag.workflowCount || 0} workflow${tag.workflowCount !== 1 ? 's' : ''}`,
  };
}

export async function handleUpdateTag(params: unknown): Promise<ToolResponse> {
  const schema = z.object({
    id: z.string(),
    name: z.string().min(1),
  });

  const validatedParams = schema.parse(params);
  const client = getApiClient();
  
  const tag = await client.updateTag(validatedParams.id, validatedParams.name);
  
  return {
    success: true,
    data: tag,
    message: `Tag renamed to "${tag.name}"`,
  };
}

export async function handleDeleteTag(params: unknown): Promise<ToolResponse> {
  const schema = z.object({
    id: z.string(),
  });

  const validatedParams = schema.parse(params);
  const client = getApiClient();
  
  // Get tag details before deletion
  const tag = await client.getTag(validatedParams.id);
  
  await client.deleteTag(validatedParams.id);
  
  return {
    success: true,
    data: {
      id: validatedParams.id,
      name: tag.name,
      deleted: true,
    },
    message: `Tag "${tag.name}" deleted successfully. Removed from ${tag.workflowCount || 0} workflow${tag.workflowCount !== 1 ? 's' : ''}.`,
  };
}

export async function handleUpdateWorkflowTags(
  params: unknown
): Promise<ToolResponse> {
  const schema = z.object({
    workflowId: z.string(),
    tagIds: z.array(z.string()),
  });

  const validatedParams = schema.parse(params);
  const client = getApiClient();
  
  // Get workflow name for better messaging
  const workflow = await client.getWorkflowById(validatedParams.workflowId);
  
  const result = await client.updateWorkflowTags(
    validatedParams.workflowId,
    validatedParams.tagIds
  );
  
  const tagNames = result.tags.map(t => t.name).join(', ');
  
  return {
    success: true,
    data: result,
    message: validatedParams.tagIds.length > 0
      ? `Workflow "${workflow.name}" tagged with: ${tagNames}`
      : `All tags removed from workflow "${workflow.name}"`,
  };
}
```

#### 4. `src/mcp/server.ts`

**Validation Routing**:
```typescript
case 'n8n_get_tag':
case 'n8n_update_tag':
case 'n8n_delete_tag':
  const tagId = (params as { id: string }).id;
  if (!tagId || tagId.trim() === '') {
    throw new Error('Tag ID is required');
  }
  break;

case 'n8n_update_workflow_tags':
  const wfId = (params as { workflowId: string }).workflowId;
  if (!wfId || wfId.trim() === '') {
    throw new Error('Workflow ID is required');
  }
  break;
```

**Handler Routing**:
```typescript
case 'n8n_create_tag':
  return await handleCreateTag(params);
case 'n8n_list_tags':
  return await handleListTags(params);
case 'n8n_get_tag':
  return await handleGetTag(params);
case 'n8n_update_tag':
  return await handleUpdateTag(params);
case 'n8n_delete_tag':
  return await handleDeleteTag(params);
case 'n8n_update_workflow_tags':
  return await handleUpdateWorkflowTags(params);
```

## Use Cases

### 1. Environment-Based Tagging
```javascript
// Tag workflows by environment during CI/CD deployment
const prodTag = await n8n_create_tag({ name: 'production' });
const stagingTag = await n8n_create_tag({ name: 'staging' });

// Apply environment tags to workflows
for (const workflow of deployedWorkflows) {
  await n8n_update_workflow_tags({
    workflowId: workflow.id,
    tagIds: [isProd ? prodTag.id : stagingTag.id]
  });
}
```

### 2. Multi-Team Organization
```javascript
// Organize workflows by team
const teams = ['sales', 'marketing', 'engineering', 'support'];
const tagMap = {};

for (const team of teams) {
  const tag = await n8n_create_tag({ name: team });
  tagMap[team] = tag.id;
}

// Tag team-specific workflows
await n8n_update_workflow_tags({
  workflowId: salesWorkflowId,
  tagIds: [tagMap.sales, customerFacingTagId]
});
```

### 3. Workflow Discovery and Filtering
```javascript
// Find all production API workflows
const allTags = await n8n_list_tags();
const prodTag = allTags.tags.find(t => t.name === 'production');
const apiTag = allTags.tags.find(t => t.name === 'api');

const workflows = await n8n_list_workflows({
  tags: [prodTag.id, apiTag.id]
});
```

### 4. Tag Cleanup
```javascript
// Remove unused tags
const tags = await n8n_list_tags();
for (const tag of tags.tags) {
  const details = await n8n_get_tag({ id: tag.id });
  if (details.workflowCount === 0) {
    await n8n_delete_tag({ id: tag.id });
    console.log(`Deleted unused tag: ${tag.name}`);
  }
}
```

## Benefits
1. ✅ Enables automated workflow organization
2. ✅ Supports environment-based workflow management
3. ✅ Facilitates team-based workflow grouping
4. ✅ Improves workflow discovery and filtering
5. ✅ Enables programmatic workflow categorization

## Success Criteria
- [x] All 6 tag tools appear in tool list
- [x] Can create, list, get, update, delete tags
- [x] Can assign tags to workflows
- [x] Tag deletion removes tag from workflows
- [x] Workflow count accurate in tag details
- [x] TypeScript compiles without errors
- [x] Integration tests pass
- [x] Unit tests added for new API methods
- [x] Documentation updated in README

## Related Documentation
- Tag best practices: Document tagging conventions
- Related: `n8n_list_workflows` supports tag filtering

## Future Enhancements
- Tag categories/hierarchy (parent-child relationships)
- Tag color coding
- Bulk tag operations (tag multiple workflows at once)
- Tag-based access control integration

---

## Implementation Summary

### Files Modified
1. **src/types/n8n-api.ts**
   - Added `workflowCount?: number` to Tag interface

2. **src/services/n8n-api-client.ts**
   - Added `getTag(id: string): Promise<Tag>` method
   - Added `updateWorkflowTags(workflowId: string, tagIds: string[]): Promise<{...}>` method

3. **src/mcp/tools-n8n-manager.ts**
   - Added 6 MCP tool definitions:
     - n8n_create_tag
     - n8n_list_tags
     - n8n_get_tag
     - n8n_update_tag
     - n8n_delete_tag
     - n8n_update_workflow_tags

4. **src/mcp/handlers-n8n-manager.ts**
   - Added 6 handler functions with proper error handling and Zod validation
   - Handlers provide user-friendly messages with workflow counts and tag names

5. **src/mcp/server.ts**
   - Added validation routing for tag tools
   - Added handler routing for all 6 tag tools
   - Proper parameter validation for IDs and required fields

6. **tests/unit/services/n8n-api-client.test.ts**
   - Added unit tests for getTag method
   - Added unit tests for updateWorkflowTags method

7. **tests/integration/n8n-api/workflows/tag-management.test.ts**
   - Created comprehensive integration test suite
   - Tests for all 6 handlers with success and error cases
   - Proper cleanup of created tags

8. **README.md**
   - Added Tag Management section to MCP tools documentation
   - Documented all 6 tag management tools

### Implementation Notes
- All handlers follow existing patterns with proper error handling
- Zod validation ensures type safety at runtime
- Integration tests require a running n8n instance
- Tag IDs are tracked and cleaned up in tests
- Handlers provide descriptive success messages with counts

### Testing
- Unit tests: 2 new tests for API client methods
- Integration tests: Comprehensive suite covering all operations
- Error handling tests for invalid IDs and missing parameters

### API Compatibility
- Compatible with n8n API v1 tag endpoints
- Follows existing n8n API response formats
- Supports workflow count in tag details