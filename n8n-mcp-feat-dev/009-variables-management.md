# Feature: Variables Management

## Priority: Medium

**Status**: 💡 Proposed

**Complexity**: Low

## Problem Statement
Variables are a fundamental feature in n8n for storing and reusing data across workflows. The current MCP server lacks tools to manage these variables, which limits the ability to dynamically configure or inspect workflow behavior through the MCP. This prevents advanced automation scenarios where variables need to be created, updated, or retrieved programmatically.

## Solution Overview
Create a set of dedicated tools to manage n8n variables, allowing for their creation, retrieval, updating, and deletion directly via the MCP server.

## API Endpoints

### POST `/variables`
**Purpose**: Create a new variable in your instance.

**Request Body Example**:
```json
{
  "key": "myNewVariable",
  "value": "initialValue",
  "projectId": "optionalProjectId"
}
```
**Reference**: [`docs/n8n_API/n8n_api.json:1454`](docs/n8n_API/n8n_api.json:1454)

### GET `/variables`
**Purpose**: Retrieve variables from your instance.

**Parameters**: `limit`, `cursor`, `projectId`, `state`

**Reference**: [`docs/n8n_API/n8n_api.json:1486`](docs/n8n_API/n8n_api.json:1486)

### DELETE `/variables/{id}`
**Purpose**: Delete a variable from your instance.

**Path Parameters**: `id` (The ID of the variable)

**Reference**: [`docs/n8n_API/n8n_api.json:1541`](docs/n8n_API/n8n_api.json:1541)

### PUT `/variables/{id}`
**Purpose**: Update a variable from your instance.

**Path Parameters**: `id` (The ID of the variable)
**Request Body Example**:
```json
{
  "key": "myUpdatedVariable",
  "value": "newValue"
}
```
**Reference**: [`docs/n8n_API/n8n_api.json:1567`](docs/n8n_API/n8n_api.json:1567)

## MCP Tools Proposed

*   `n8n_create_variable`: Maps to `POST /variables`
*   `n8n_list_variables`: Maps to `GET /variables`
*   `n8n_get_variable`: Maps to `GET /variables` filtered by ID (if API supports it, otherwise list and filter locally)
*   `n8n_update_variable`: Maps to `PUT /variables/{id}`
*   `n8n_delete_variable`: Maps to `DELETE /variables/{id}`

## Implementation Notes
*   Ensure proper input validation for all tool parameters.
*   Handle API error responses gracefully and provide user-friendly messages.
*   Consider pagination for `n8n_list_variables`.
*   The `n8n_get_variable` tool might need to use `n8n_list_variables` and then filter the results if there's no direct API endpoint to get a single variable by ID.

## Future Enhancements
*   Bulk operations for creating, updating, or deleting multiple variables.
*   Support for different variable types (e.g., JSON objects).