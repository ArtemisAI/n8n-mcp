import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { logger } from '../utils/logger';
import {
  Workflow,
  WorkflowListParams,
  WorkflowListResponse,
  Execution,
  ExecutionListParams,
  ExecutionListResponse,
  Credential,
  CredentialListParams,
  CredentialListResponse,
  Tag,
  TagListParams,
  TagListResponse,
  HealthCheckResponse,
  Variable,
  WebhookRequest,
  WorkflowExport,
  WorkflowImport,
  SourceControlStatus,
  SourceControlPullResult,
  SourceControlPushResult,
} from '../types/n8n-api';
import { handleN8nApiError, logN8nError } from '../utils/n8n-errors';
import { cleanWorkflowForCreate, cleanWorkflowForUpdate } from './n8n-validation';

export interface N8nApiClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  maxRetries?: number;
}

export class N8nApiClient {
  private client: AxiosInstance;
  private maxRetries: number;

  constructor(config: N8nApiClientConfig) {
    const { baseUrl, apiKey, timeout = 30000, maxRetries = 3 } = config;

    this.maxRetries = maxRetries;

    // Ensure baseUrl ends with /api/v1
    const apiUrl = baseUrl.endsWith('/api/v1') 
      ? baseUrl 
      : `${baseUrl.replace(/\/$/, '')}/api/v1`;

    this.client = axios.create({
      baseURL: apiUrl,
      timeout,
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        logger.debug(`n8n API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data,
        });
        return config;
      },
      (error: unknown) => {
        logger.error('n8n API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response: any) => {
        logger.debug(`n8n API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error: unknown) => {
        const n8nError = handleN8nApiError(error);
        logN8nError(n8nError, 'n8n API Response');
        return Promise.reject(n8nError);
      }
    );
  }

  // Health check to verify API connectivity
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      // Try the standard healthz endpoint (available on all n8n instances)
      const baseUrl = this.client.defaults.baseURL || '';
      const healthzUrl = baseUrl.replace(/\/api\/v\d+\/?$/, '') + '/healthz';
      
      const response = await axios.get(healthzUrl, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      if (response.status === 200 && response.data?.status === 'ok') {
        return { 
          status: 'ok',
          features: {} // Features detection would require additional endpoints
        };
      }
      
      // If healthz doesn't work, fall back to API check
      throw new Error('healthz endpoint not available');
    } catch (error) {
      // If healthz endpoint doesn't exist, try listing workflows with limit 1
      // This is a fallback for older n8n versions
      try {
        await this.client.get('/workflows', { params: { limit: 1 } });
        return { 
          status: 'ok',
          features: {}
        };
      } catch (fallbackError) {
        throw handleN8nApiError(fallbackError);
      }
    }
  }

  // Workflow Management
  async createWorkflow(workflow: Partial<Workflow>): Promise<Workflow> {
    try {
      const cleanedWorkflow = cleanWorkflowForCreate(workflow);
      const response = await this.client.post('/workflows', cleanedWorkflow);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async getWorkflow(id: string): Promise<Workflow> {
    try {
      const response = await this.client.get(`/workflows/${id}`);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async updateWorkflow(id: string, workflow: Partial<Workflow>): Promise<Workflow> {
    try {
      // First, try PUT method (newer n8n versions)
      const cleanedWorkflow = cleanWorkflowForUpdate(workflow as Workflow);
      try {
        const response = await this.client.put(`/workflows/${id}`, cleanedWorkflow);
        return response.data;
      } catch (putError: any) {
        // If PUT fails with 405 (Method Not Allowed), try PATCH
        if (putError.response?.status === 405) {
          logger.debug('PUT method not supported, falling back to PATCH');
          const response = await this.client.patch(`/workflows/${id}`, cleanedWorkflow);
          return response.data;
        }
        throw putError;
      }
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async deleteWorkflow(id: string): Promise<Workflow> {
    try {
      const response = await this.client.delete(`/workflows/${id}`);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async activateWorkflow(id: string): Promise<Workflow> {
    try {
      const response = await this.client.post(`/workflows/${id}/activate`);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async deactivateWorkflow(id: string): Promise<Workflow> {
    try {
      const response = await this.client.post(`/workflows/${id}/deactivate`);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  /**
   * Lists workflows from n8n instance.
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of workflows
   *
   * @remarks
   * This method handles two response formats for backwards compatibility:
   * - Modern (n8n v0.200.0+): {data: Workflow[], nextCursor?: string}
   * - Legacy (older versions): Workflow[] (wrapped automatically)
   *
   * @see https://github.com/czlonkowski/n8n-mcp/issues/349
   */
  async listWorkflows(params: WorkflowListParams = {}): Promise<WorkflowListResponse> {
    try {
      const response = await this.client.get('/workflows', { params });
      return this.validateListResponse<Workflow>(response.data, 'workflows');
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  // Execution Management
  async getExecution(id: string, includeData = false): Promise<Execution> {
    try {
      const response = await this.client.get(`/executions/${id}`, {
        params: { includeData },
      });
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  /**
   * Lists executions from n8n instance.
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of executions
   *
   * @remarks
   * This method handles two response formats for backwards compatibility:
   * - Modern (n8n v0.200.0+): {data: Execution[], nextCursor?: string}
   * - Legacy (older versions): Execution[] (wrapped automatically)
   *
   * @see https://github.com/czlonkowski/n8n-mcp/issues/349
   */
  async listExecutions(params: ExecutionListParams = {}): Promise<ExecutionListResponse> {
    try {
      const response = await this.client.get('/executions', { params });
      return this.validateListResponse<Execution>(response.data, 'executions');
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async deleteExecution(id: string): Promise<void> {
    try {
      await this.client.delete(`/executions/${id}`);
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  // Webhook Execution
  async triggerWebhook(request: WebhookRequest): Promise<any> {
    try {
      const { webhookUrl, httpMethod, data, headers, waitForResponse = true } = request;

      // SECURITY: Validate URL for SSRF protection (includes DNS resolution)
      // See: https://github.com/czlonkowski/n8n-mcp/issues/265 (HIGH-03)
      const { SSRFProtection } = await import('../utils/ssrf-protection');
      const validation = await SSRFProtection.validateWebhookUrl(webhookUrl);

      if (!validation.valid) {
        throw new Error(`SSRF protection: ${validation.reason}`);
      }

      // Extract path from webhook URL
      const url = new URL(webhookUrl);
      const webhookPath = url.pathname;
      
      // Make request directly to webhook endpoint
      const config: AxiosRequestConfig = {
        method: httpMethod,
        url: webhookPath,
        headers: {
          ...headers,
          // Don't override API key header for webhook endpoints
          'X-N8N-API-KEY': undefined,
        },
        data: httpMethod !== 'GET' ? data : undefined,
        params: httpMethod === 'GET' ? data : undefined,
        // Webhooks might take longer
        timeout: waitForResponse ? 120000 : 30000,
      };

      // Create a new axios instance for webhook requests to avoid API interceptors
      const webhookClient = axios.create({
        baseURL: new URL('/', webhookUrl).toString(),
        validateStatus: (status) => status < 500, // Don't throw on 4xx
      });

      const response = await webhookClient.request(config);
      
      return {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers,
      };
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  // Credential Management
  /**
   * Lists credentials from n8n instance.
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of credentials
   *
   * @remarks
   * This method handles two response formats for backwards compatibility:
   * - Modern (n8n v0.200.0+): {data: Credential[], nextCursor?: string}
   * - Legacy (older versions): Credential[] (wrapped automatically)
   *
   * @see https://github.com/czlonkowski/n8n-mcp/issues/349
   */
  async listCredentials(params: CredentialListParams = {}): Promise<CredentialListResponse> {
    try {
      const response = await this.client.get('/credentials', { params });
      return this.validateListResponse<Credential>(response.data, 'credentials');
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async getCredential(id: string): Promise<Credential> {
    try {
      const response = await this.client.get(`/credentials/${id}`);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async createCredential(credential: Partial<Credential>): Promise<Credential> {
    try {
      const response = await this.client.post('/credentials', credential);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async updateCredential(id: string, credential: Partial<Credential>): Promise<Credential> {
    try {
      const response = await this.client.patch(`/credentials/${id}`, credential);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async deleteCredential(id: string): Promise<void> {
    try {
      await this.client.delete(`/credentials/${id}`);
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  // Tag Management
  /**
   * Lists tags from n8n instance.
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of tags
   *
   * @remarks
   * This method handles two response formats for backwards compatibility:
   * - Modern (n8n v0.200.0+): {data: Tag[], nextCursor?: string}
   * - Legacy (older versions): Tag[] (wrapped automatically)
   *
   * @see https://github.com/czlonkowski/n8n-mcp/issues/349
   */
  async listTags(params: TagListParams = {}): Promise<TagListResponse> {
    try {
      const response = await this.client.get('/tags', { params });
      return this.validateListResponse<Tag>(response.data, 'tags');
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async createTag(tag: Partial<Tag>): Promise<Tag> {
    try {
      const response = await this.client.post('/tags', tag);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async updateTag(id: string, tag: Partial<Tag>): Promise<Tag> {
    try {
      const response = await this.client.patch(`/tags/${id}`, tag);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async deleteTag(id: string): Promise<void> {
    try {
      await this.client.delete(`/tags/${id}`);
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  // Source Control Management (Enterprise feature)
  async getSourceControlStatus(): Promise<SourceControlStatus> {
    try {
      const response = await this.client.get('/source-control/status');
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async pullSourceControl(force = false): Promise<SourceControlPullResult> {
    try {
      const response = await this.client.post('/source-control/pull', { force });
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async pushSourceControl(
    message: string,
    fileNames?: string[]
  ): Promise<SourceControlPushResult> {
    try {
      const response = await this.client.post('/source-control/push', {
        message,
        fileNames,
      });
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  // Variable Management (via Source Control API)
  async getVariables(): Promise<Variable[]> {
    try {
      const response = await this.client.get('/variables');
      return response.data.data || [];
    } catch (error) {
      // Variables might not be available in all n8n versions
      logger.warn('Variables API not available, returning empty array');
      return [];
    }
  }

  async createVariable(variable: Partial<Variable>): Promise<Variable> {
    try {
      const response = await this.client.post('/variables', variable);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async updateVariable(id: string, variable: Partial<Variable>): Promise<Variable> {
    try {
      const response = await this.client.patch(`/variables/${id}`, variable);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async deleteVariable(id: string): Promise<void> {
    try {
      await this.client.delete(`/variables/${id}`);
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  /**
   * Validates and normalizes n8n API list responses.
   * Handles both modern format {data: [], nextCursor?: string} and legacy array format.
   *
   * @param responseData - Raw response data from n8n API
   * @param resourceType - Resource type for error messages (e.g., 'workflows', 'executions')
   * @returns Normalized response in modern format
   * @throws Error if response structure is invalid
   */
  private validateListResponse<T>(
    responseData: any,
    resourceType: string
  ): { data: T[]; nextCursor?: string | null } {
    // Validate response structure
    if (!responseData || typeof responseData !== 'object') {
      throw new Error(`Invalid response from n8n API for ${resourceType}: response is not an object`);
    }

    // Handle legacy case where API returns array directly (older n8n versions)
    if (Array.isArray(responseData)) {
      logger.warn(
        `n8n API returned array directly instead of {data, nextCursor} object for ${resourceType}. ` +
        'Wrapping in expected format for backwards compatibility.'
      );
      return {
        data: responseData,
        nextCursor: null
      };
    }

    // Validate expected format {data: [], nextCursor?: string}
    if (!Array.isArray(responseData.data)) {
      const keys = Object.keys(responseData).slice(0, 5);
      const keysPreview = keys.length < Object.keys(responseData).length
        ? `${keys.join(', ')}...`
        : keys.join(', ');
      throw new Error(
        `Invalid response from n8n API for ${resourceType}: expected {data: [], nextCursor?: string}, ` +
        `got object with keys: [${keysPreview}]`
      );
    }

    return responseData;
  }
}