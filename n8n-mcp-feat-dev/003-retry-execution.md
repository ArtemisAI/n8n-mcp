# Feature: Retry Execution

## Priority: HIGH ⚡
**Status**: ✅ COMPLETED (2025-11-05)  
**Branch**: `feat/retry-execution` (merged commit: ebf4486)  
**Issue**: [ArtemisAI/n8n-mcp#1](https://github.com/ArtemisAI/n8n-mcp/issues/1)  
**PR**: [ArtemisAI/n8n-mcp#9](https://github.com/ArtemisAI/n8n-mcp/pull/9) (Merged)  
**Complexity**: Low (Similar to activate/deactivate)  
**Implementation Time**: 2.5 hours (agent + testing)

## Completion Summary
✅ **Implemented**: 2025-11-05 via GitHub Copilot Agent  
✅ **Tested**: API endpoint with live n8n instance  
✅ **Verified**: Execution 7 → New execution 8 (successful retry)  
✅ **Regression**: Activation/deactivation features still working  
✅ **Build**: 0 TypeScript errors  

## Problem Statement
When a workflow execution fails due to temporary issues (network timeout, API rate limit, transient error), users currently have no way to retry the execution via MCP tools. They must:
1. Navigate to the n8n UI
2. Find the failed execution
3. Manually click "Retry Execution"

This limitation is particularly problematic for:
- Automated error recovery workflows
- CI/CD pipelines that monitor n8n executions
- Health monitoring systems (like LiteLLM Health Check Bot)
- Long-running workflows that fail near completion

## Solution Overview
Create a dedicated `n8n_retry_execution` tool that uses the n8n API's retry endpoint to re-run a failed execution with the same input data.

## API Endpoints

### POST `/executions/{id}/retry`
**Purpose**: Retry a failed execution

**Request**:
```http
POST /api/v1/executions/{id}/retry
Content-Type: application/json
X-N8N-API-KEY: <api-key>

{
  "loadWorkflow": true  // Optional: Whether to load fresh workflow definition
}
```

**Response**: `200 OK`
```json
{
  "id": "new-execution-id",
  "workflowId": "workflow-id",
  "status": "running",
  "startedAt": "2025-11-05T18:00:00.000Z",
  "mode": "retry",
  "retryOf": "original-execution-id"
}
```

**Error Responses**:
- `404`: Execution not found
- `400`: Execution cannot be retried (still running or successful)
- `403`: Insufficient permissions

## Implementation Details

### Files to Modify

#### 1. `src/services/n8n-api-client.ts`
**Location**: After `deleteExecution` method (around line 180)

**Add Method**:
```typescript
/**
 * Retry a failed execution
 * @param id - Execution ID to retry
 * @param loadWorkflow - Whether to load fresh workflow definition (default: true)
 * @returns New execution object
 */
async retryExecution(
  id: string, 
  loadWorkflow: boolean = true
): Promise<Execution> {
  try {
    const response = await this.axiosInstance.post<Execution>(
      `/executions/${id}/retry`,
      { loadWorkflow }
    );
    return response.data;
  } catch (error) {
    throw this.handleN8nApiError(error, 'retry execution');
  }
}
```

**Key Points**:
- Takes execution ID and optional loadWorkflow parameter
- Uses POST method (not GET)
- Returns new execution object (not the original)
- Follows existing error handling pattern

#### 2. `src/mcp/tools-n8n-manager.ts`
**Location**: After `n8nDeleteExecutionTool` definition (around line 450)

**Add Tool Definition**:
```typescript
export const n8nRetryExecutionTool: Tool = {
  name: 'n8n_retry_execution',
  description: 'Retry a failed execution. Creates a new execution with the same input data. Only works for failed executions.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Execution ID to retry',
      },
      loadWorkflow: {
        type: 'boolean',
        description: 'Whether to load fresh workflow definition. Default: true. Set to false to use the workflow version from original execution.',
        default: true,
      },
    },
    required: ['id'],
  },
};
```

**Export Addition** (at bottom of file):
```typescript
// Add to existing exports
export const n8nTools: Tool[] = [
  // ... existing tools ...
  n8nRetryExecutionTool, // ADD THIS LINE
];
```

**Key Points**:
- Clear description mentions "failed executions only"
- loadWorkflow is optional with default value
- Explains the difference between true/false for loadWorkflow

#### 3. `src/mcp/handlers-n8n-manager.ts`
**Location**: After `handleDeleteExecution` function (around line 520)

**Add Handler Function**:
```typescript
/**
 * Handle retry execution request
 */
export async function handleRetryExecution(
  params: unknown
): Promise<ToolResponse> {
  const schema = z.object({
    id: z.string(),
    loadWorkflow: z.boolean().optional().default(true),
  });

  const validatedParams = schema.parse(params);
  const client = getApiClient();
  
  try {
    // First, check if execution exists and can be retried
    const originalExecution = await client.getExecutionById(
      validatedParams.id,
      false // Don't include data, just need status
    );
    
    if (originalExecution.status === 'running') {
      return {
        success: false,
        error: {
          message: `Execution ${validatedParams.id} is still running and cannot be retried`,
          code: 'EXECUTION_RUNNING',
        },
      };
    }
    
    if (originalExecution.status === 'success') {
      return {
        success: false,
        error: {
          message: `Execution ${validatedParams.id} was successful and does not need to be retried`,
          code: 'EXECUTION_SUCCESSFUL',
        },
      };
    }
    
    // Retry the execution
    const newExecution = await client.retryExecution(
      validatedParams.id,
      validatedParams.loadWorkflow
    );
    
    return {
      success: true,
      data: {
        newExecutionId: newExecution.id,
        originalExecutionId: validatedParams.id,
        workflowId: newExecution.workflowId,
        status: newExecution.status,
        startedAt: newExecution.startedAt,
        mode: newExecution.mode,
      },
      message: `Execution ${validatedParams.id} retried successfully. New execution ID: ${newExecution.id}`,
    };
  } catch (error: any) {
    // Handle specific retry errors
    if (error.response?.status === 400) {
      return {
        success: false,
        error: {
          message: 'Execution cannot be retried. It may be completed or still running.',
          code: 'RETRY_NOT_ALLOWED',
          details: error.message,
        },
      };
    }
    throw error;
  }
}
```

**Key Points**:
- Pre-validates execution status before retry
- Provides helpful error messages for running/successful executions
- Returns both new and original execution IDs
- Handles API-specific errors gracefully

#### 4. `src/mcp/server.ts`
**Location**: Two places to modify

**A. Validation Routing** (around line 180):
```typescript
// Add to existing execution validation case
case 'n8n_get_execution':
case 'n8n_delete_execution':
case 'n8n_retry_execution': // ADD THIS LINE
  const executionId = (params as { id: string }).id;
  // Validation will happen in handler for retry
  break;
```

**B. Handler Routing** (around line 390):
```typescript
// Add new case in switch statement
case 'n8n_retry_execution':
  return await handleRetryExecution(params);
```

**Key Points**:
- Reuses existing execution ID validation
- Routes to new handler function

### Type Definitions

No new types needed. Uses existing `Execution` interface from `src/types/n8n-api.types.ts`.

## Testing Plan

### 1. Unit Tests
```typescript
// Test file: tests/retry-execution.test.ts
describe('retryExecution', () => {
  it('should retry a failed execution', async () => {
    // Mock failed execution
    // Call retryExecution
    // Verify new execution created
  });
  
  it('should reject retry of running execution', async () => {
    // Verify error returned
  });
  
  it('should reject retry of successful execution', async () => {
    // Verify error returned
  });
});
```

### 2. Integration Tests
```bash
# Test with real n8n instance
# 1. Create a workflow that fails
# 2. Execute it (should fail)
# 3. Call n8n_retry_execution with the failed execution ID
# 4. Verify new execution is created and runs
```

### 3. MCP Tool Test
```javascript
// Using MCP client
mcp_mcp-n8n-local_n8n_retry_execution({
  id: "failed-execution-id",
  loadWorkflow: true
})

// Expected result:
{
  success: true,
  data: {
    newExecutionId: "new-exec-id",
    originalExecutionId: "failed-execution-id",
    workflowId: "workflow-id",
    status: "running",
    startedAt: "2025-11-05T18:00:00.000Z",
    mode: "retry"
  },
  message: "Execution failed-execution-id retried successfully. New execution ID: new-exec-id"
}
```

## Use Cases

### 1. Automated Error Recovery
```javascript
// Monitor executions and auto-retry failures
const executions = await n8n_list_executions({ status: 'error' });
for (const exec of executions) {
  if (exec.retryCount < 3) {
    await n8n_retry_execution({ id: exec.id });
  }
}
```

### 2. LiteLLM Health Check Bot
```javascript
// If health check fails, retry before alerting
const execution = await n8n_get_execution({ id: executionId });
if (execution.status === 'error') {
  const retry = await n8n_retry_execution({ id: executionId });
  // Wait and check if retry succeeds
  await sleep(5000);
  const retryResult = await n8n_get_execution({ id: retry.newExecutionId });
  if (retryResult.status === 'error') {
    // Send alert - confirmed failure
  }
}
```

### 3. CI/CD Pipeline
```javascript
// Retry failed deployments automatically
if (deploymentExecution.status === 'error') {
  console.log('Deployment failed, retrying...');
  await n8n_retry_execution({ 
    id: deploymentExecution.id,
    loadWorkflow: true // Use latest workflow version
  });
}
```

## Benefits
1. ✅ Reduces manual intervention for transient failures
2. ✅ Enables automated error recovery workflows
3. ✅ Improves reliability of long-running workflows
4. ✅ Provides programmatic retry capability for CI/CD
5. ✅ Consistent with activation/deactivation implementation pattern

## Success Criteria
- [x] Tool appears in `n8n_list_available_tools` output
- [x] Can retry a failed execution successfully
- [x] Returns new execution ID correctly
- [x] Rejects retry of running executions with helpful error
- [x] Rejects retry of successful executions with helpful error
- [x] Error handling matches existing patterns
- [x] TypeScript compiles without errors
- [x] Integration test passes with real n8n instance

## Test Results (2025-11-05)

### API Testing
- **Test Execution**: ID 7 (failed execution)
- **Retry Result**: Created execution ID 8
- **Status**: Running → Error (expected behavior for test workflow)
- **Mode**: Correctly set to "retry"
- **RetryOf**: Correctly linked to execution 7
- **Started At**: 2025-11-05T20:51:54.671Z

### Regression Testing
- ✅ Activation API: Working
- ✅ Deactivation API: Working
- ✅ Workflow tested: RAGbot Chatbot API (ID: AcUNiTT0h5Yxhmmk)
- ✅ No breaking changes

### Build Status
- ✅ TypeScript: 0 errors
- ✅ Files modified: 4 core + 2 test files
- ✅ Tests: Integration and unit tests added

## Related Documentation
- Activation feature: `001-activate-workflow.md`
- Deactivation feature: `002-deactivate-workflow.md`
- n8n API: `/api/v1/docs` (executions section)

## Future Enhancements
- Batch retry: Retry multiple executions at once
- Retry with modifications: Change input data before retry
- Automatic retry policies: Configure max retries, backoff strategy
- Retry scheduling: Schedule retry for specific time

---

## Implementation Notes

### What Worked Well
- GitHub Copilot agent implementation was accurate and followed patterns
- Pre-validation of execution status prevented unnecessary API calls
- Clear error messages for edge cases (running/successful executions)
- Comprehensive test coverage from the start

### Lessons Learned
- Feature branch strategy works well for incremental development
- Merging activation features to main before retry simplified testing
- Direct API testing with PowerShell was faster than waiting for MCP reload
- Having detailed specification (this doc) made agent implementation smooth

### Code Quality
- Consistent with activation/deactivation patterns
- Proper error handling with Zod validation
- User-friendly error messages
- TypeScript strict mode compliant

### Integration
- No conflicts with existing features
- Activation and deactivation still work correctly
- Build process clean with 0 errors
- Ready for upstream PR (pending more features)

---

## Contribution to Project

**Part of Feature Bundle PR Strategy**:
- This is feature 3 of 6 planned for comprehensive upstream PR
- Demonstrates execution control capabilities
- Shows consistent code quality and patterns
- Builds on activation/deactivation foundation

**Next Features**: Credential Management (#004), User Management (#005), Tag Management (#006)