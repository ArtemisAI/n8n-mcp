# ARCHIVED: No API Endpoint Available

**Status**: Archived on November 5, 2025
**Reason**: After verification against n8n API specification, no endpoint exists for stopping running executions. The n8n API only provides endpoints for listing, retrieving, deleting (completed executions), and retrying executions. Direct execution stopping is not supported via API.

---

# Feature: Stop Running Execution

**Justification**: The inability to stop running executions is a significant limitation for managing active workflows, especially in cases of errors, infinite loops, or resource consumption. Adding this functionality would provide crucial control over workflow execution.

**Implementation Details**: A new tool, `n8n_stop_execution`, will be created. This tool will take an `executionId` as a parameter and will call the relevant n8n API endpoint to stop the execution. (Note: A specific API endpoint for stopping an execution was not explicitly found in `n8n_api.json`, so further investigation into the n8n API would be required to identify or request such an endpoint.)

**API Endpoint**: (To be determined - requires further investigation of n8n API or feature request to n8n)

**MCP Tool**: `n8n_stop_execution`