# Feature: Execute Workflow Directly

**Justification**: The current limitation of only being able to execute workflows via webhooks restricts direct programmatic control over workflow execution. A feature to execute workflows directly would enable more flexible automation and testing scenarios.

**Implementation Details**: A new tool, `n8n_execute_workflow`, will be created. This tool will take a `workflowId` and optionally input `data` as parameters. (Note: A specific API endpoint for directly executing a workflow was not explicitly found in `n8n_api.json`, so further investigation into the n8n API would be required to identify or request such an endpoint.)

**API Endpoint**: (To be determined - requires further investigation of n8n API or feature request to n8n)

**MCP Tool**: `n8n_execute_workflow`