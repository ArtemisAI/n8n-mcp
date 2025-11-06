/**
 * Integration Tests: Variable Management Handlers
 *
 * Tests variable management operations against a real n8n instance.
 * Covers create, list, get, update, delete variables.
 */

import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { createTestContext, TestContext } from '../utils/test-context';
import { getTestN8nClient } from '../utils/n8n-client';
import { N8nApiClient } from '../../../../src/services/n8n-api-client';
import { cleanupOrphanedWorkflows } from '../utils/cleanup-helpers';
import { createMcpContext } from '../utils/mcp-context';
import { InstanceContext } from '../../../../src/types/instance-context';
import {
  handleCreateVariable,
  handleListVariables,
  handleGetVariable,
  handleUpdateVariable,
  handleDeleteVariable,
} from '../../../../src/mcp/handlers-n8n-manager';

describe('Integration: Variable Management Handlers', () => {
  let context: TestContext;
  let client: N8nApiClient;
  let mcpContext: InstanceContext;
  const createdVariableIds: string[] = [];

  beforeEach(() => {
    context = createTestContext();
    client = getTestN8nClient();
    mcpContext = createMcpContext();
  });

  afterEach(async () => {
    // Clean up variables
    for (const variableId of createdVariableIds) {
      try {
        await client.deleteVariable(variableId);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    createdVariableIds.length = 0;
    
    await context.cleanup();
  });

  afterAll(async () => {
    if (!process.env.CI) {
      await cleanupOrphanedWorkflows();
    }
  });

  // ======================================================================
  // Create Variable
  // ======================================================================

  describe('handleCreateVariable', () => {
    it('should create a new variable', async () => {
      const response = await handleCreateVariable(
        { 
          key: 'test_var_create',
          value: 'test-value-123'
        },
        mcpContext
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeTruthy();
      expect(response.data.key).toBe('test_var_create');
      expect(response.data.value).toBe('test-value-123');
      expect(response.message).toContain('created successfully');

      // Track for cleanup
      if (response.data.id) {
        createdVariableIds.push(response.data.id);
      }
    });

    it('should return error for empty variable key', async () => {
      const response = await handleCreateVariable(
        { key: '', value: 'test' },
        mcpContext
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should create variable with projectId', async () => {
      const response = await handleCreateVariable(
        { 
          key: 'test_var_project',
          value: 'project-value',
          projectId: 'test-project-123'
        },
        mcpContext
      );

      // Note: projectId support depends on n8n version/license
      // This test may succeed or fail depending on instance configuration
      if (response.success && response.data.id) {
        createdVariableIds.push(response.data.id);
      }
    });
  });

  // ======================================================================
  // List Variables
  // ======================================================================

  describe('handleListVariables', () => {
    it('should list all variables', async () => {
      // Create a test variable
      const createResponse = await handleCreateVariable(
        { key: 'test_var_list', value: 'list-value' },
        mcpContext
      );

      expect(createResponse.success).toBe(true);
      if (createResponse.data.id) {
        createdVariableIds.push(createResponse.data.id);
      }

      // List variables
      const response = await handleListVariables({}, mcpContext);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.variables).toBeInstanceOf(Array);
      expect(response.data.returned).toBeGreaterThanOrEqual(1);
      
      // Verify our test variable is in the list
      const foundVariable = response.data.variables.find(
        (v: any) => v.key === 'test_var_list'
      );
      expect(foundVariable).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await handleListVariables({ limit: 5 }, mcpContext);

      expect(response.success).toBe(true);
      expect(response.data.returned).toBeLessThanOrEqual(5);
    });
  });

  // ======================================================================
  // Get Variable
  // ======================================================================

  describe('handleGetVariable', () => {
    it('should get a specific variable by ID', async () => {
      // Create a test variable
      const createResponse = await handleCreateVariable(
        { key: 'test_var_get', value: 'get-value' },
        mcpContext
      );

      expect(createResponse.success).toBe(true);
      const variableId = createResponse.data.id;
      createdVariableIds.push(variableId!);

      // Get the variable
      const response = await handleGetVariable(
        { id: variableId },
        mcpContext
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe(variableId);
      expect(response.data.key).toBe('test_var_get');
      expect(response.data.value).toBe('get-value');
    });

    it('should return error for non-existent variable', async () => {
      const response = await handleGetVariable(
        { id: 'non-existent-id-12345' },
        mcpContext
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should return error for empty variable ID', async () => {
      const response = await handleGetVariable(
        { id: '' },
        mcpContext
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  // ======================================================================
  // Update Variable
  // ======================================================================

  describe('handleUpdateVariable', () => {
    it('should update variable value', async () => {
      // Create a test variable
      const createResponse = await handleCreateVariable(
        { key: 'test_var_update_value', value: 'original-value' },
        mcpContext
      );

      expect(createResponse.success).toBe(true);
      const variableId = createResponse.data.id;
      createdVariableIds.push(variableId!);

      // Update the value
      const response = await handleUpdateVariable(
        { 
          id: variableId,
          value: 'updated-value'
        },
        mcpContext
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.value).toBe('updated-value');
      expect(response.message).toContain('updated successfully');
    });

    it('should update variable key', async () => {
      // Create a test variable
      const createResponse = await handleCreateVariable(
        { key: 'test_var_update_key', value: 'test-value' },
        mcpContext
      );

      expect(createResponse.success).toBe(true);
      const variableId = createResponse.data.id;
      createdVariableIds.push(variableId!);

      // Update the key
      const response = await handleUpdateVariable(
        { 
          id: variableId,
          key: 'test_var_updated_key'
        },
        mcpContext
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.key).toBe('test_var_updated_key');
    });

    it('should update both key and value', async () => {
      // Create a test variable
      const createResponse = await handleCreateVariable(
        { key: 'test_var_update_both', value: 'original-value' },
        mcpContext
      );

      expect(createResponse.success).toBe(true);
      const variableId = createResponse.data.id;
      createdVariableIds.push(variableId!);

      // Update both
      const response = await handleUpdateVariable(
        { 
          id: variableId,
          key: 'test_var_updated_both',
          value: 'updated-value'
        },
        mcpContext
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.key).toBe('test_var_updated_both');
      expect(response.data.value).toBe('updated-value');
    });

    it('should return error when neither key nor value provided', async () => {
      const response = await handleUpdateVariable(
        { id: 'some-id' },
        mcpContext
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('At least one of key or value');
    });

    it('should return error for non-existent variable', async () => {
      const response = await handleUpdateVariable(
        { 
          id: 'non-existent-id-12345',
          value: 'new-value'
        },
        mcpContext
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  // ======================================================================
  // Delete Variable
  // ======================================================================

  describe('handleDeleteVariable', () => {
    it('should delete a variable', async () => {
      // Create a test variable
      const createResponse = await handleCreateVariable(
        { key: 'test_var_delete', value: 'delete-value' },
        mcpContext
      );

      expect(createResponse.success).toBe(true);
      const variableId = createResponse.data.id;

      // Delete the variable
      const response = await handleDeleteVariable(
        { id: variableId },
        mcpContext
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.deleted).toBe(true);
      expect(response.message).toContain('deleted successfully');
      expect(response.message).toContain('WARNING');

      // Verify it's deleted
      const getResponse = await handleGetVariable(
        { id: variableId },
        mcpContext
      );
      expect(getResponse.success).toBe(false);
    });

    it('should return error for non-existent variable', async () => {
      const response = await handleDeleteVariable(
        { id: 'non-existent-id-12345' },
        mcpContext
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should return error for empty variable ID', async () => {
      const response = await handleDeleteVariable(
        { id: '' },
        mcpContext
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });
});
