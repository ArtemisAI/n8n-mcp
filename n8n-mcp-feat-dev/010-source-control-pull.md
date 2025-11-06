# Feature: Source Control Pull

## Priority: Medium

**Status**: 💡 Proposed

**Complexity**: Medium

## Problem Statement
The n8n API provides an endpoint for pulling changes from a remote repository, which is a key feature for teams using Git-based workflows. The MCP server currently does not expose this functionality, preventing automated or programmatic updates from source control.

## Solution Overview
Create a new tool, `n8n_source_control_pull`, that allows users to trigger a pull from their configured remote repository.

## API Endpoints

### POST `/source-control/pull`
**Purpose**: Pull changes from the remote repository. Requires the Source Control feature to be licensed and connected to a repository.

**Request Body Example**:
```json
{
  "force": true,
  "variables": {
    "foo": "bar"
  }
}
```
**Reference**: [`docs/n8n_API/n8n_api.json:1414`](docs/n8n_API/n8n_api.json:1414)

## MCP Tools Proposed

*   `n8n_source_control_pull`: Maps to `POST /source-control/pull`

## Implementation Notes
*   The tool should allow for the `force` and `variables` parameters to be passed in the request body.
*   The tool should handle the case where the Source Control feature is not licensed or configured in the n8n instance.
*   The tool should return the `importResult` from the API response to the user.

## Future Enhancements
*   Add a tool for pushing changes to a remote repository.
*   Add a tool for getting the status of the local repository.