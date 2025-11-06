# Feature: Projects Management

## Priority: Low

**Status**: 💡 Proposed

**Complexity**: Medium

## Problem Statement
The n8n API provides endpoints for managing projects, which is a feature for organizing resources within n8n. The MCP server currently does not expose this functionality, which could be useful for more complex, multi-tenant automation scenarios.

## Solution Overview
Create a new set of tools for managing n8n projects, allowing for their creation, retrieval, updating, and deletion, as well as user management within projects.

## API Endpoints

### POST `/projects`
**Purpose**: Create a new project.
**Reference**: [`docs/n8n_API/n8n_api.json:1610`](docs/n8n_API/n8n_api.json:1610)

### GET `/projects`
**Purpose**: Retrieve all projects.
**Reference**: [`docs/n8n_API/n8n_api.json:1642`](docs/n8n_API/n8n_api.json:1642)

### PUT `/projects/{projectId}`
**Purpose**: Update a project.
**Reference**: [`docs/n8n_API/n8n_api.json:1710`](docs/n8n_API/n8n_api.json:1710)

### DELETE `/projects/{projectId}`
**Purpose**: Delete a project.
**Reference**: [`docs/n8n_API/n8n_api.json:1676`](docs/n8n_API/n8n_api.json:1676)

### POST `/projects/{projectId}/users`
**Purpose**: Add one or more users to a project.
**Reference**: [`docs/n8n_API/n8n_api.json:1759`](docs/n8n_API/n8n_api.json:1759)

### PATCH `/projects/{projectId}/users/{userId}`
**Purpose**: Change a user's role in a project.
**Reference**: [`docs/n8n_API/n8n_api.json:1877`](docs/n8n_API/n8n_api.json:1877)

### DELETE `/projects/{projectId}/users/{userId}`
**Purpose**: Delete a user from a project.
**Reference**: [`docs/n8n_API/n8n_api.json:1834`](docs/n8n_API/n8n_api.json:1834)

## MCP Tools Proposed

*   `n8n_create_project`: Maps to `POST /projects`
*   `n8n_list_projects`: Maps to `GET /projects`
*   `n8n_update_project`: Maps to `PUT /projects/{projectId}`
*   `n8n_delete_project`: Maps to `DELETE /projects/{projectId}`
*   `n8n_add_user_to_project`: Maps to `POST /projects/{projectId}/users`
*   `n8n_change_user_role_in_project`: Maps to `PATCH /projects/{projectId}/users/{userId}`
*   `n8n_remove_user_from_project`: Maps to `DELETE /projects/{projectId}/users/{userId}`

## Implementation Notes
*   Each tool should handle the respective API endpoint and its parameters.
*   Error handling should be implemented for cases where a project or user is not found.
*   These tools would likely be used in more advanced, administrative automation workflows.