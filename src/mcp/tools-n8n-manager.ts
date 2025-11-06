import { ToolDefinition } from '../types';

/**
 * n8n Management Tools
 * 
 * These tools enable AI agents to manage n8n workflows through the n8n API.
 * They require N8N_API_URL and N8N_API_KEY to be configured.
 */
export const n8nManagementTools: ToolDefinition[] = [
  // Workflow Management Tools
  {
    name: 'n8n_create_workflow',
    description: `Create workflow. Requires: name, nodes[], connections{}. Created inactive. Returns workflow with ID.`,
    inputSchema: {
      type: 'object',
      properties: {
        name: { 
          type: 'string', 
          description: 'Workflow name (required)' 
        },
        nodes: { 
          type: 'array', 
          description: 'Array of workflow nodes. Each node must have: id, name, type, typeVersion, position, and parameters',
          items: {
            type: 'object',
            required: ['id', 'name', 'type', 'typeVersion', 'position', 'parameters'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              typeVersion: { type: 'number' },
              position: { 
                type: 'array',
                items: { type: 'number' },
                minItems: 2,
                maxItems: 2
              },
              parameters: { type: 'object' },
              credentials: { type: 'object' },
              disabled: { type: 'boolean' },
              notes: { type: 'string' },
              continueOnFail: { type: 'boolean' },
              retryOnFail: { type: 'boolean' },
              maxTries: { type: 'number' },
              waitBetweenTries: { type: 'number' }
            }
          }
        },
        connections: { 
          type: 'object', 
          description: 'Workflow connections object. Keys are source node IDs, values define output connections' 
        },
        settings: {
          type: 'object',
          description: 'Optional workflow settings (execution order, timezone, error handling)',
          properties: {
            executionOrder: { type: 'string', enum: ['v0', 'v1'] },
            timezone: { type: 'string' },
            saveDataErrorExecution: { type: 'string', enum: ['all', 'none'] },
            saveDataSuccessExecution: { type: 'string', enum: ['all', 'none'] },
            saveManualExecutions: { type: 'boolean' },
            saveExecutionProgress: { type: 'boolean' },
            executionTimeout: { type: 'number' },
            errorWorkflow: { type: 'string' }
          }
        }
      },
      required: ['name', 'nodes', 'connections']
    }
  },
  {
    name: 'n8n_get_workflow',
    description: `Get a workflow by ID. Returns the complete workflow including nodes, connections, and settings.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'Workflow ID' 
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_get_workflow_details',
    description: `Get workflow details with metadata, version, execution stats. More info than get_workflow.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'Workflow ID' 
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_get_workflow_structure',
    description: `Get workflow structure: nodes and connections only. No parameter details.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'Workflow ID' 
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_get_workflow_minimal',
    description: `Get minimal info: ID, name, active status, tags. Fast for listings.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'Workflow ID' 
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_update_full_workflow',
    description: `Full workflow update. Requires complete nodes[] and connections{}. For incremental use n8n_update_partial_workflow.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'Workflow ID to update' 
        },
        name: { 
          type: 'string', 
          description: 'New workflow name' 
        },
        nodes: { 
          type: 'array', 
          description: 'Complete array of workflow nodes (required if modifying workflow structure)',
          items: {
            type: 'object',
            additionalProperties: true
          }
        },
        connections: { 
          type: 'object', 
          description: 'Complete connections object (required if modifying workflow structure)' 
        },
        settings: { 
          type: 'object', 
          description: 'Workflow settings to update' 
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_update_partial_workflow',
    description: `Update workflow incrementally with diff operations. Types: addNode, removeNode, updateNode, moveNode, enable/disableNode, addConnection, removeConnection, updateSettings, updateName, add/removeTag. See tools_documentation("n8n_update_partial_workflow", "full") for details.`,
    inputSchema: {
      type: 'object',
      additionalProperties: true,  // Allow any extra properties Claude Desktop might add
      properties: {
        id: { 
          type: 'string', 
          description: 'Workflow ID to update' 
        },
        operations: {
          type: 'array',
          description: 'Array of diff operations to apply. Each operation must have a "type" field and relevant properties for that operation type.',
          items: {
            type: 'object',
            additionalProperties: true
          }
        },
        validateOnly: {
          type: 'boolean',
          description: 'If true, only validate operations without applying them'
        },
        continueOnError: {
          type: 'boolean',
          description: 'If true, apply valid operations even if some fail (best-effort mode). Returns applied and failed operation indices. Default: false (atomic)'
        }
      },
      required: ['id', 'operations']
    }
  },
  {
    name: 'n8n_delete_workflow',
    description: `Permanently delete a workflow. This action cannot be undone.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'Workflow ID to delete' 
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_activate_workflow',
    description: `Activate a workflow to enable automatic execution. Workflow must have at least one enabled trigger node.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Workflow ID to activate'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_deactivate_workflow',
    description: `Deactivate a workflow to prevent automatic execution. The workflow can still be executed manually.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Workflow ID to deactivate'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_list_workflows',
    description: `List workflows (minimal metadata only). Returns id/name/active/dates/tags. Check hasMore/nextCursor for pagination.`,
    inputSchema: {
      type: 'object',
      properties: {
        limit: { 
          type: 'number', 
          description: 'Number of workflows to return (1-100, default: 100)' 
        },
        cursor: { 
          type: 'string', 
          description: 'Pagination cursor from previous response' 
        },
        active: { 
          type: 'boolean', 
          description: 'Filter by active status' 
        },
        tags: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Filter by tags (exact match)' 
        },
        projectId: { 
          type: 'string', 
          description: 'Filter by project ID (enterprise feature)' 
        },
        excludePinnedData: { 
          type: 'boolean', 
          description: 'Exclude pinned data from response (default: true)' 
        }
      }
    }
  },
  {
    name: 'n8n_validate_workflow',
    description: `Validate workflow by ID. Checks nodes, connections, expressions. Returns errors/warnings/suggestions.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'Workflow ID to validate' 
        },
        options: {
          type: 'object',
          description: 'Validation options',
          properties: {
            validateNodes: { 
              type: 'boolean', 
              description: 'Validate node configurations (default: true)' 
            },
            validateConnections: { 
              type: 'boolean', 
              description: 'Validate workflow connections (default: true)' 
            },
            validateExpressions: { 
              type: 'boolean', 
              description: 'Validate n8n expressions (default: true)' 
            },
            profile: { 
              type: 'string', 
              enum: ['minimal', 'runtime', 'ai-friendly', 'strict'],
              description: 'Validation profile to use (default: runtime)' 
            }
          }
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_autofix_workflow',
    description: `Automatically fix common workflow validation errors. Preview fixes or apply them. Fixes expression format, typeVersion, error output config, webhook paths.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Workflow ID to fix'
        },
        applyFixes: {
          type: 'boolean',
          description: 'Apply fixes to workflow (default: false - preview mode)'
        },
        fixTypes: {
          type: 'array',
          description: 'Types of fixes to apply (default: all)',
          items: {
            type: 'string',
            enum: ['expression-format', 'typeversion-correction', 'error-output-config', 'node-type-correction', 'webhook-missing-path', 'typeversion-upgrade', 'version-migration']
          }
        },
        confidenceThreshold: {
          type: 'string',
          enum: ['high', 'medium', 'low'],
          description: 'Minimum confidence level for fixes (default: medium)'
        },
        maxFixes: {
          type: 'number',
          description: 'Maximum number of fixes to apply (default: 50)'
        }
      },
      required: ['id']
    }
  },

  // Execution Management Tools
  {
    name: 'n8n_trigger_webhook_workflow',
    description: `Trigger workflow via webhook. Must be ACTIVE with Webhook node. Method must match config.`,
    inputSchema: {
      type: 'object',
      properties: {
        webhookUrl: { 
          type: 'string', 
          description: 'Full webhook URL from n8n workflow (e.g., https://n8n.example.com/webhook/abc-def-ghi)' 
        },
        httpMethod: { 
          type: 'string', 
          enum: ['GET', 'POST', 'PUT', 'DELETE'],
          description: 'HTTP method (must match webhook configuration, often GET)' 
        },
        data: { 
          type: 'object', 
          description: 'Data to send with the webhook request' 
        },
        headers: { 
          type: 'object', 
          description: 'Additional HTTP headers' 
        },
        waitForResponse: { 
          type: 'boolean', 
          description: 'Wait for workflow completion (default: true)' 
        }
      },
      required: ['webhookUrl']
    }
  },
  {
    name: 'n8n_get_execution',
    description: `Get execution details with smart filtering. RECOMMENDED: Use mode='preview' first to assess data size.
Examples:
- {id, mode:'preview'} - Structure & counts (fast, no data)
- {id, mode:'summary'} - 2 samples per node (default)
- {id, mode:'filtered', itemsLimit:5} - 5 items per node
- {id, nodeNames:['HTTP Request']} - Specific node only
- {id, mode:'full'} - Complete data (use with caution)`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Execution ID'
        },
        mode: {
          type: 'string',
          enum: ['preview', 'summary', 'filtered', 'full'],
          description: 'Data retrieval mode: preview=structure only, summary=2 items, filtered=custom, full=all data'
        },
        nodeNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter to specific nodes by name (for filtered mode)'
        },
        itemsLimit: {
          type: 'number',
          description: 'Items per node: 0=structure only, 2=default, -1=unlimited (for filtered mode)'
        },
        includeInputData: {
          type: 'boolean',
          description: 'Include input data in addition to output (default: false)'
        },
        includeData: {
          type: 'boolean',
          description: 'Legacy: Include execution data. Maps to mode=summary if true (deprecated, use mode instead)'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_list_executions',
    description: `List workflow executions (returns up to limit). Check hasMore/nextCursor for pagination.`,
    inputSchema: {
      type: 'object',
      properties: {
        limit: { 
          type: 'number', 
          description: 'Number of executions to return (1-100, default: 100)' 
        },
        cursor: { 
          type: 'string', 
          description: 'Pagination cursor from previous response' 
        },
        workflowId: { 
          type: 'string', 
          description: 'Filter by workflow ID' 
        },
        projectId: { 
          type: 'string', 
          description: 'Filter by project ID (enterprise feature)' 
        },
        status: { 
          type: 'string', 
          enum: ['success', 'error', 'waiting'],
          description: 'Filter by execution status' 
        },
        includeData: { 
          type: 'boolean', 
          description: 'Include execution data (default: false)' 
        }
      }
    }
  },
  {
    name: 'n8n_delete_execution',
    description: `Delete an execution record. This only removes the execution history, not any data processed.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'Execution ID to delete' 
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_retry_execution',
    description: `Retry a failed execution with the same input data. Uses n8n API's retry endpoint to re-run the workflow.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'Execution ID to retry' 
        },
        loadWorkflow: { 
          type: 'boolean', 
          description: 'Whether to load the workflow definition (default: true)' 
        }
      },
      required: ['id']
    }
  },

  // System Tools
  {
    name: 'n8n_health_check',
    description: `Check n8n instance health and API connectivity. Returns status and available features.`,
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'n8n_list_available_tools',
    description: `List available n8n tools and capabilities.`,
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'n8n_diagnostic',
    description: `Diagnose n8n API config. Shows tool status, API connectivity, env vars. Helps troubleshoot missing tools.`,
    inputSchema: {
      type: 'object',
      properties: {
        verbose: {
          type: 'boolean',
          description: 'Include detailed debug information (default: false)'
        }
      }
    }
  },
  {
    name: 'n8n_workflow_versions',
    description: `Manage workflow version history, rollback, and cleanup. Six modes:
- list: Show version history for a workflow
- get: Get details of specific version
- rollback: Restore workflow to previous version (creates backup first)
- delete: Delete specific version or all versions for a workflow
- prune: Manually trigger pruning to keep N most recent versions
- truncate: Delete ALL versions for ALL workflows (requires confirmation)`,
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['list', 'get', 'rollback', 'delete', 'prune', 'truncate'],
          description: 'Operation mode'
        },
        workflowId: {
          type: 'string',
          description: 'Workflow ID (required for list, rollback, delete, prune)'
        },
        versionId: {
          type: 'number',
          description: 'Version ID (required for get mode and single version delete, optional for rollback)'
        },
        limit: {
          type: 'number',
          default: 10,
          description: 'Max versions to return in list mode'
        },
        validateBefore: {
          type: 'boolean',
          default: true,
          description: 'Validate workflow structure before rollback'
        },
        deleteAll: {
          type: 'boolean',
          default: false,
          description: 'Delete all versions for workflow (delete mode only)'
        },
        maxVersions: {
          type: 'number',
          default: 10,
          description: 'Keep N most recent versions (prune mode only)'
        },
        confirmTruncate: {
          type: 'boolean',
          default: false,
          description: 'REQUIRED: Must be true to truncate all versions (truncate mode only)'
        }
      },
      required: ['mode']
    }
  },
  
  // Credential Management Tools
  {
    name: 'n8n_create_credential',
    description: `Create a new credential. WARNING: Handle credential data securely. The API returns metadata only, not the credential secrets.`,
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Credential name (must be unique)'
        },
        type: {
          type: 'string',
          description: 'Credential type (e.g., "httpBasicAuth", "gmailOAuth2Api"). Use n8n_get_credential_schema to see available fields.'
        },
        data: {
          type: 'object',
          description: 'Credential data object with type-specific fields. Structure varies by credential type.'
        }
      },
      required: ['name', 'type', 'data']
    }
  },
  {
    name: 'n8n_get_credential',
    description: `Get credential metadata. NOTE: Does NOT return sensitive credential data (passwords, tokens). Only returns id, name, type, timestamps.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Credential ID'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_delete_credential',
    description: `Delete a credential. WARNING: This will break workflows using this credential. Use with caution.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Credential ID to delete'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_get_credential_schema',
    description: `Get the schema for a credential type. Shows which fields are required and their types. Useful for building credential creation forms.`,
    inputSchema: {
      type: 'object',
      properties: {
        credentialTypeName: {
          type: 'string',
          description: 'Credential type name (e.g., "httpBasicAuth", "gmailOAuth2Api", "slackOAuth2Api")'
        }
      },
      required: ['credentialTypeName']
    }
  },

  // Tag Management Tools
  {
    name: 'n8n_create_tag',
    description: 'Create a new tag for organizing workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Tag name (must be unique)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'n8n_list_tags',
    description: 'List all available tags with workflow counts.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'n8n_get_tag',
    description: 'Get details about a specific tag including workflows using it.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Tag ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_update_tag',
    description: 'Update tag name. Changes apply to all workflows using this tag.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Tag ID',
        },
        name: {
          type: 'string',
          description: 'New tag name',
        },
      },
      required: ['id', 'name'],
    },
  },
  {
    name: 'n8n_delete_tag',
    description: 'Delete a tag. Removes tag from all workflows but does not delete the workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Tag ID to delete',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_update_workflow_tags',
    description: 'Set tags for a workflow. Replaces all existing tags with the provided list.',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'Workflow ID',
        },
        tagIds: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Array of tag IDs to assign to the workflow. Pass empty array to remove all tags.',
        },
      },
      required: ['workflowId', 'tagIds'],
    },
  },

  // Variable Management Tools
  {
    name: 'n8n_create_variable',
    description: 'Create a new variable in your n8n instance. Variables store reusable data across workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Variable key/name (must be unique)',
        },
        value: {
          type: 'string',
          description: 'Variable value',
        },
        projectId: {
          type: 'string',
          description: 'Optional project ID (enterprise feature)',
        },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'n8n_list_variables',
    description: 'List all variables with optional filtering. Supports pagination for large sets.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of variables to return (1-100, default: 100)',
        },
        cursor: {
          type: 'string',
          description: 'Pagination cursor from previous response',
        },
        projectId: {
          type: 'string',
          description: 'Filter by project ID (enterprise feature)',
        },
        state: {
          type: 'string',
          enum: ['active', 'inactive'],
          description: 'Filter by state',
        },
      },
    },
  },
  {
    name: 'n8n_get_variable',
    description: 'Get a specific variable by ID. Returns key, value, and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Variable ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_update_variable',
    description: 'Update a variable\'s key and/or value. Workflows using this variable will use the updated value.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Variable ID to update',
        },
        key: {
          type: 'string',
          description: 'New variable key (optional)',
        },
        value: {
          type: 'string',
          description: 'New variable value (optional)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_delete_variable',
    description: 'Delete a variable. WARNING: Workflows using this variable may fail if not updated.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Variable ID to delete',
        },
      },
      required: ['id'],
    },
  }
];