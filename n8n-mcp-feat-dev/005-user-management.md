# Feature: User Management

**Justification**: User management is an important feature for multi-user n8n instances. The MCP server currently lacks any tools for managing users, which is a major gap in functionality.

**Implementation Details**: A new set of tools will be created for managing users. These tools will interact with the `/users` endpoints to provide the following functionality:

*   `n8n_create_user`: Creates a new user.
*   `n8n_delete_user`: Deletes a user.
*   `n8n_get_user`: Retrieves a user.
*   `n8n_list_users`: Lists all users.
*   `n8n_change_user_role`: Changes a user's role.

**API Endpoint**: `/users`, `/users/{id}`, `/users/{id}/role`

**MCP Tool**: `n8n_create_user`, `n8n_delete_user`, `n8n_get_user`, `n8n_list_users`, `n8n_change_user_role`