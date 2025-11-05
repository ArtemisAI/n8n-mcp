# GitHub Copilot Agent Implementation Brief

## Feature: Retry Execution (#003)

### Context
You are implementing a new feature for the n8n-mcp (Model Context Protocol) server. This server exposes n8n workflow automation capabilities through MCP tools that can be used by AI assistants.

### Repository Information
- **Repository**: ArtemisAI/n8n-mcp (fork of czlonkowski/n8n-mcp)
- **Branch**: `feat/retry-execution` (clean, based on upstream v2.22.10)
- **Your Task**: Implement the retry execution feature as specified below

### Implementation Specification
**Complete specification**: See `C:\Users\Laptop\Desktop\Projects\n8n\n8n-mcp-feat-dev\003-retry-execution.md`

**Summary**:
- **Goal**: Add MCP tool to retry failed workflow executions
- **API Endpoint**: `POST /executions/{id}/retry`
- **New Tool**: `n8n_retry_execution`
- **Files to Modify**: 4 files (see specification for exact changes)

### Files to Modify

1. **src/services/n8n-api-client.ts**
   - Add `retryExecution()` method
   - Location: After `deleteExecution` method (around line 180)
   - Pattern: Follow existing error handling with `handleN8nApiError()`

2. **src/mcp/tools-n8n-manager.ts**
   - Add `n8nRetryExecutionTool` definition
   - Location: After `n8nDeleteExecutionTool` (around line 450)
   - Export: Add to `n8nTools` array at bottom

3. **src/mcp/handlers-n8n-manager.ts**
   - Add `handleRetryExecution()` function
   - Location: After `handleDeleteExecution` (around line 520)
   - Key feature: Pre-validates execution status before retry

4. **src/mcp/server.ts**
   - Add validation routing (around line 180)
   - Add handler routing (around line 390)
   - Pattern: Follow existing switch case patterns

### Code Patterns to Follow

#### Error Handling
```typescript
try {
  const response = await this.axiosInstance.post<Execution>(...);
  return response.data;
} catch (error) {
  throw this.handleN8nApiError(error, 'retry execution');
}
```

#### Zod Validation
```typescript
const schema = z.object({
  id: z.string(),
  loadWorkflow: z.boolean().optional().default(true),
});
const validatedParams = schema.parse(params);
```

#### Response Format
```typescript
return {
  success: true,
  data: { ... },
  message: "User-friendly message"
};
```

### Implementation Requirements

✅ **Must Have**:
- TypeScript strict mode compliant
- Zod validation for parameters
- User-friendly error messages
- Pre-validation of execution status (reject running/successful executions)
- Consistent with existing code patterns
- Proper error handling

❌ **Must NOT**:
- Break existing functionality
- Introduce TypeScript errors
- Deviate from established patterns
- Skip error handling
- Use any placeholder comments like `// ... existing code ...`

### Testing Checklist

After implementation, the following will be tested:
- [ ] `npm run build` succeeds with 0 errors
- [ ] Tool appears in `n8n_list_available_tools`
- [ ] Can retry a failed execution successfully
- [ ] Returns new execution ID correctly
- [ ] Rejects retry of running executions with helpful error
- [ ] Rejects retry of successful executions with helpful error
- [ ] Existing tools still work (regression test)

### Example Usage (Expected Behavior)

```javascript
// Success case
const result = await n8n_retry_execution({
  id: "failed-execution-id",
  loadWorkflow: true
});
// Returns:
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

// Error case (running execution)
const result = await n8n_retry_execution({
  id: "running-execution-id"
});
// Returns:
{
  success: false,
  error: {
    message: "Execution running-execution-id is still running and cannot be retried",
    code: "EXECUTION_RUNNING"
  }
}
```

### Reference Implementation
See completed features for code patterns:
- Activation: Commit fc82c0b in branch `feat/workflow-activation-api`
- Files: Same 4 files modified following identical patterns

### Security Notes
✅ **Verified Clean**:
- No secrets in specification
- No internal URLs
- No API keys
- No private documentation

### Success Criteria
Implementation is complete when:
1. Code compiles without TypeScript errors
2. All 4 files modified correctly
3. Tool follows existing patterns exactly
4. Error handling is comprehensive
5. User messages are clear and helpful

### Commit Message
Use conventional commit format:
```
feat: add retry execution tool (#1)

Implements POST /executions/{id}/retry endpoint for retrying failed workflow executions.

- Add retryExecution() method to API client
- Add n8n_retry_execution tool definition
- Add handleRetryExecution() handler with status pre-validation
- Add routing in MCP server

Addresses: ArtemisAI/n8n-mcp#1
Related: czlonkowski/n8n-mcp#401
```

---

## Quick Reference

**Specification Document**: `C:\Users\Laptop\Desktop\Projects\n8n\n8n-mcp-feat-dev\003-retry-execution.md`

**Build Command**: `npm run build`

**Branch**: `feat/retry-execution` (already created and checked out)

**Upstream Status**: Synced with czlonkowski/n8n-mcp @ a4ef1ef

**Issue Tracking**:
- Fork: https://github.com/ArtemisAI/n8n-mcp/issues/1
- Upstream: https://github.com/czlonkowski/n8n-mcp/issues/401

---

**Start implementation following the specification document exactly. Good luck! 🚀**
