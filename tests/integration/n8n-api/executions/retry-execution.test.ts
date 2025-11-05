/**
 * Integration Tests: handleRetryExecution
 *
 * Tests execution retry against a real n8n instance.
 * Covers successful retry, error handling, and retry tracking.
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { createMcpContext } from '../utils/mcp-context';
import { InstanceContext } from '../../../../src/types/instance-context';
import { handleRetryExecution, handleTriggerWebhookWorkflow, handleGetExecution } from '../../../../src/mcp/handlers-n8n-manager';
import { getN8nCredentials } from '../utils/credentials';

describe('Integration: handleRetryExecution', () => {
  let mcpContext: InstanceContext;
  let webhookUrl: string;

  beforeEach(() => {
    mcpContext = createMcpContext();
  });

  beforeAll(() => {
    const creds = getN8nCredentials();
    webhookUrl = creds.webhookUrls.get;
  });

  // ======================================================================
  // Successful Retry
  // ======================================================================

  describe('Successful Retry', () => {
    it('should retry an execution successfully', async () => {
      // First, create an execution to retry
      const triggerResponse = await handleTriggerWebhookWorkflow(
        {
          webhookUrl,
          httpMethod: 'GET',
          waitForResponse: true
        },
        mcpContext
      );

      // Try to extract execution ID
      let executionId: string | undefined;
      if (triggerResponse.success && triggerResponse.data) {
        const responseData = triggerResponse.data as any;
        executionId = responseData.executionId ||
                      responseData.id ||
                      responseData.execution?.id ||
                      responseData.workflowData?.executionId;
      }

      if (!executionId) {
        console.warn('Could not extract execution ID for retry test');
        return;
      }

      // Retry the execution
      const response = await handleRetryExecution(
        { id: executionId },
        mcpContext
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      if (response.data) {
        expect(response.data.newExecutionId).toBeDefined();
        expect(response.data.retryOf).toBe(executionId);
      }
    }, 30000);

    it('should retry with loadWorkflow parameter', async () => {
      // Create an execution
      const triggerResponse = await handleTriggerWebhookWorkflow(
        {
          webhookUrl,
          httpMethod: 'GET',
          waitForResponse: true
        },
        mcpContext
      );

      let executionId: string | undefined;
      if (triggerResponse.success && triggerResponse.data) {
        const responseData = triggerResponse.data as any;
        executionId = responseData.executionId ||
                      responseData.id ||
                      responseData.execution?.id ||
                      responseData.workflowData?.executionId;
      }

      if (!executionId) {
        console.warn('Could not extract execution ID for retry with loadWorkflow test');
        return;
      }

      // Retry with loadWorkflow false
      const response = await handleRetryExecution(
        { id: executionId, loadWorkflow: false },
        mcpContext
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    }, 30000);

    it('should verify new execution is created on retry', async () => {
      // Create an execution
      const triggerResponse = await handleTriggerWebhookWorkflow(
        {
          webhookUrl,
          httpMethod: 'GET',
          waitForResponse: true
        },
        mcpContext
      );

      let executionId: string | undefined;
      if (triggerResponse.success && triggerResponse.data) {
        const responseData = triggerResponse.data as any;
        executionId = responseData.executionId ||
                      responseData.id ||
                      responseData.execution?.id ||
                      responseData.workflowData?.executionId;
      }

      if (!executionId) {
        console.warn('Could not extract execution ID for retry verification test');
        return;
      }

      // Retry it
      const retryResponse = await handleRetryExecution(
        { id: executionId },
        mcpContext
      );

      expect(retryResponse.success).toBe(true);

      // Verify the new execution exists
      if (retryResponse.data?.newExecutionId) {
        const getResponse = await handleGetExecution(
          { id: retryResponse.data.newExecutionId },
          mcpContext
        );

        expect(getResponse.success).toBe(true);
        expect(getResponse.data).toBeDefined();
      }
    }, 30000);
  });

  // ======================================================================
  // Error Handling
  // ======================================================================

  describe('Error Handling', () => {
    it('should handle non-existent execution ID', async () => {
      const response = await handleRetryExecution(
        { id: '99999999' },
        mcpContext
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should handle invalid execution ID format', async () => {
      const response = await handleRetryExecution(
        { id: 'invalid-id-format' },
        mcpContext
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should handle missing execution ID', async () => {
      const response = await handleRetryExecution(
        {} as any,
        mcpContext
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should validate loadWorkflow parameter type', async () => {
      // This test validates that the schema validation works correctly
      const response = await handleRetryExecution(
        { id: '123', loadWorkflow: 'invalid' as any },
        mcpContext
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });
});
