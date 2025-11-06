/**
 * Integration Tests: Tag Management Handlers
 *
 * Tests tag management operations against a real n8n instance.
 * Covers create, list, get, update, delete tags and updating workflow tags.
 */

import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { createTestContext, TestContext, createTestWorkflowName } from '../utils/test-context';
import { getTestN8nClient } from '../utils/n8n-client';
import { N8nApiClient } from '../../../../src/services/n8n-api-client';
import { SIMPLE_WEBHOOK_WORKFLOW } from '../utils/fixtures';
import { cleanupOrphanedWorkflows } from '../utils/cleanup-helpers';
import { createMcpContext } from '../utils/mcp-context';
import { InstanceContext } from '../../../../src/types/instance-context';
import {
  handleCreateTag,
  handleListTags,
  handleGetTag,
  handleUpdateTag,
  handleDeleteTag,
  handleUpdateWorkflowTags,
} from '../../../../src/mcp/handlers-n8n-manager';

describe('Integration: Tag Management Handlers', () => {
  let context: TestContext;
  let client: N8nApiClient;
  let mcpContext: InstanceContext;
  const createdTagIds: string[] = [];

  beforeEach(() => {
    context = createTestContext();
    client = getTestN8nClient();
    mcpContext = createMcpContext();
  });

  afterEach(async () => {
    // Clean up tags
    for (const tagId of createdTagIds) {
      try {
        await client.deleteTag(tagId);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    createdTagIds.length = 0;
    
    await context.cleanup();
  });

  afterAll(async () => {
    if (!process.env.CI) {
      await cleanupOrphanedWorkflows();
    }
  });

  // ======================================================================
  // Create Tag
  // ======================================================================

  describe('handleCreateTag', () => {
    it('should create a new tag', async () => {
      const response = await handleCreateTag(
        { name: 'test-tag-create' },
        mcpContext
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeTruthy();
      expect(response.data.name).toBe('test-tag-create');
      expect(response.message).toContain('created successfully');

      // Track for cleanup
      if (response.data.id) {
        createdTagIds.push(response.data.id);
      }
    });

    it('should return error for empty tag name', async () => {
      const response = await handleCreateTag(
        { name: '' },
        mcpContext
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  // ======================================================================
  // List Tags
  // ======================================================================

  describe('handleListTags', () => {
    it('should list all tags', async () => {
      // Create a test tag
      const createResponse = await handleCreateTag(
        { name: 'test-tag-list' },
        mcpContext
      );
      if (createResponse.data?.id) {
        createdTagIds.push(createResponse.data.id);
      }

      // List tags
      const response = await handleListTags({}, mcpContext);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.tags).toBeInstanceOf(Array);
      expect(response.data.count).toBeGreaterThan(0);
      expect(response.message).toMatch(/Found \d+ tags?/);
    });
  });

  // ======================================================================
  // Get Tag
  // ======================================================================

  describe('handleGetTag', () => {
    it('should get tag details', async () => {
      // Create a test tag
      const createResponse = await handleCreateTag(
        { name: 'test-tag-get' },
        mcpContext
      );
      expect(createResponse.success).toBe(true);
      const tagId = createResponse.data.id;
      if (tagId) {
        createdTagIds.push(tagId);
      }

      // Get tag
      const response = await handleGetTag(
        { id: tagId },
        mcpContext
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe(tagId);
      expect(response.data.name).toBe('test-tag-get');
      expect(response.message).toMatch(/is used by \d+ workflows?/);
    });

    it('should return error for non-existent tag', async () => {
      const response = await handleGetTag(
        { id: 'non-existent-tag-id' },
        mcpContext
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  // ======================================================================
  // Update Tag
  // ======================================================================

  describe('handleUpdateTag', () => {
    it('should update tag name', async () => {
      // Create a test tag
      const createResponse = await handleCreateTag(
        { name: 'test-tag-update-old' },
        mcpContext
      );
      expect(createResponse.success).toBe(true);
      const tagId = createResponse.data.id;
      if (tagId) {
        createdTagIds.push(tagId);
      }

      // Update tag
      const response = await handleUpdateTag(
        { id: tagId, name: 'test-tag-update-new' },
        mcpContext
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.name).toBe('test-tag-update-new');
      expect(response.message).toContain('renamed to');
    });

    it('should return error for invalid tag ID', async () => {
      const response = await handleUpdateTag(
        { id: 'invalid-tag-id', name: 'new-name' },
        mcpContext
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  // ======================================================================
  // Delete Tag
  // ======================================================================

  describe('handleDeleteTag', () => {
    it('should delete a tag', async () => {
      // Create a test tag
      const createResponse = await handleCreateTag(
        { name: 'test-tag-delete' },
        mcpContext
      );
      expect(createResponse.success).toBe(true);
      const tagId = createResponse.data.id;

      // Delete tag
      const response = await handleDeleteTag(
        { id: tagId },
        mcpContext
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.deleted).toBe(true);
      expect(response.message).toContain('deleted successfully');

      // Verify tag is deleted
      const getResponse = await handleGetTag({ id: tagId }, mcpContext);
      expect(getResponse.success).toBe(false);
    });

    it('should return error for non-existent tag', async () => {
      const response = await handleDeleteTag(
        { id: 'non-existent-tag-id' },
        mcpContext
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  // ======================================================================
  // Update Workflow Tags
  // ======================================================================

  describe('handleUpdateWorkflowTags', () => {
    it('should add tags to a workflow', async () => {
      // Create a test workflow
      const workflow = {
        ...SIMPLE_WEBHOOK_WORKFLOW,
        name: createTestWorkflowName('Tag - Add Tags'),
      };
      const createdWorkflow = await client.createWorkflow(workflow);
      expect(createdWorkflow.id).toBeTruthy();
      if (createdWorkflow.id) {
        context.trackWorkflow(createdWorkflow.id);
      }

      // Create test tags
      const tag1Response = await handleCreateTag(
        { name: 'test-workflow-tag-1' },
        mcpContext
      );
      const tag2Response = await handleCreateTag(
        { name: 'test-workflow-tag-2' },
        mcpContext
      );

      expect(tag1Response.success).toBe(true);
      expect(tag2Response.success).toBe(true);

      const tag1Id = tag1Response.data.id;
      const tag2Id = tag2Response.data.id;

      if (tag1Id) createdTagIds.push(tag1Id);
      if (tag2Id) createdTagIds.push(tag2Id);

      // Update workflow tags
      const response = await handleUpdateWorkflowTags(
        {
          workflowId: createdWorkflow.id!,
          tagIds: [tag1Id, tag2Id],
        },
        mcpContext
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.tags).toHaveLength(2);
      expect(response.message).toContain('tagged with');
    });

    it('should remove all tags from a workflow', async () => {
      // Create a test workflow
      const workflow = {
        ...SIMPLE_WEBHOOK_WORKFLOW,
        name: createTestWorkflowName('Tag - Remove Tags'),
      };
      const createdWorkflow = await client.createWorkflow(workflow);
      expect(createdWorkflow.id).toBeTruthy();
      if (createdWorkflow.id) {
        context.trackWorkflow(createdWorkflow.id);
      }

      // Create and add a tag
      const tagResponse = await handleCreateTag(
        { name: 'test-workflow-tag-remove' },
        mcpContext
      );
      const tagId = tagResponse.data.id;
      if (tagId) createdTagIds.push(tagId);

      await handleUpdateWorkflowTags(
        {
          workflowId: createdWorkflow.id!,
          tagIds: [tagId],
        },
        mcpContext
      );

      // Remove all tags
      const response = await handleUpdateWorkflowTags(
        {
          workflowId: createdWorkflow.id!,
          tagIds: [],
        },
        mcpContext
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.tags).toHaveLength(0);
      expect(response.message).toContain('All tags removed');
    });

    it('should return error for non-existent workflow', async () => {
      const response = await handleUpdateWorkflowTags(
        {
          workflowId: 'non-existent-workflow-id',
          tagIds: [],
        },
        mcpContext
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });
});
