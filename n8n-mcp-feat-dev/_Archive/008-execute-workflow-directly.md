# ARCHIVED: No API Endpoint Available

**Status**: Archived on November 5, 2025
**Reason**: After verification against n8n API specification, no endpoint exists for directly executing workflows. The n8n API only provides endpoints for workflow CRUD operations (create, read, update, delete) and activation/deactivation. Direct execution is only possible via webhooks or manual execution in the UI.

---

# Feature: Execute Workflow Directly

**Justification**: The current limitation of only being able to execute workflows via webhooks restricts direct programmatic control over workflow execution. A feature to execute workflows directly would enable more flexible automation and testing scenarios.

**Implementation Details**: A new tool, `n8n_execute_workflow`, will be created. This tool will take a `workflowId` and optionally input `data` as parameters. (Note: A specific API endpoint for directly executing a workflow was not explicitly found in `n8n_api.json`, so further investigation into the n8n API would be required to identify or request such an endpoint.)

**API Endpoint**: (To be determined - requires further investigation of n8n API or feature request to n8n)

**MCP Tool**: `n8n_execute_workflow`