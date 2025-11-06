// n8n API Types - Ported from n8n-manager-for-ai-agents
// These types define the structure of n8n API requests and responses

// Resource Locator Types
export interface ResourceLocatorValue {
  __rl: true;
  value: string;
  mode: 'id' | 'url' | 'expression' | string;
}

// Expression Format Types
export type ExpressionValue = string | ResourceLocatorValue;

// Workflow Node Types
export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  disabled?: boolean;
  notes?: string;
  notesInFlow?: boolean;
  continueOnFail?: boolean;
  onError?: 'continueRegularOutput' | 'continueErrorOutput' | 'stopWorkflow';
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
  alwaysOutputData?: boolean;
  executeOnce?: boolean;
}

export interface WorkflowConnection {
  [sourceNodeId: string]: {
    [outputType: string]: Array<Array<{
      node: string;
      type: string;
      index: number;
    }>>;
  };
}

export interface WorkflowSettings {
  executionOrder?: 'v0' | 'v1';
  timezone?: string;
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
  saveManualExecutions?: boolean;
  saveExecutionProgress?: boolean;
  executionTimeout?: number;
  errorWorkflow?: string;
}

export interface Workflow {
  id?: string;
  name: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection;
  active?: boolean; // Optional for creation as it's read-only
  isArchived?: boolean; // Optional, available in newer n8n versions
  settings?: WorkflowSettings;
  staticData?: Record<string, unknown>;
  tags?: string[];
  updatedAt?: string;
  createdAt?: string;
  versionId?: string;
  versionCounter?: number; // Added: n8n 1.118.1+ returns this in GET responses
  meta?: {
    instanceId?: string;
  };
}

// Execution Types
export enum ExecutionStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  WAITING = 'waiting',
  // Note: 'running' status is not returned by the API
}

export interface ExecutionSummary {
  id: string;
  finished: boolean;
  mode: string;
  retryOf?: string;
  retrySuccessId?: string;
  status: ExecutionStatus;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  workflowName?: string;
  waitTill?: string;
}

export interface ExecutionData {
  startData?: Record<string, unknown>;
  resultData: {
    runData: Record<string, unknown>;
    lastNodeExecuted?: string;
    error?: Record<string, unknown>;
  };
  executionData?: Record<string, unknown>;
}

export interface Execution extends ExecutionSummary {
  data?: ExecutionData;
}

// Credential Types
export interface Credential {
  id?: string;
  name: string;
  type: string;
  data?: Record<string, unknown>;
  nodesAccess?: Array<{
    nodeType: string;
    date?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CredentialSchema {
  type: string;
  displayName: string;
  properties: Array<{
    name: string;
    type: string;
    required?: boolean;
    displayName?: string;
    typeOptions?: Record<string, unknown>;
  }>;
}

// Tag Types
export interface Tag {
  id?: string;
  name: string;
  workflowIds?: string[];
  workflowCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Variable Types
export interface Variable {
  id?: string;
  key: string;
  value: string;
  type?: 'string';
  projectId?: string;
}

export interface VariableListParams {
  limit?: number;
  cursor?: string;
  projectId?: string;
  state?: 'active' | 'inactive';
}

export interface VariableListResponse {
  data: Variable[];
  nextCursor?: string;
}

// Import/Export Types
export interface WorkflowExport {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection;
  settings?: WorkflowSettings;
  staticData?: Record<string, unknown>;
  tags?: string[];
  pinData?: Record<string, unknown>;
  versionId?: string;
  versionCounter?: number; // Added: n8n 1.118.1+
  meta?: Record<string, unknown>;
}

export interface WorkflowImport {
  name: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection;
  settings?: WorkflowSettings;
  staticData?: Record<string, unknown>;
  tags?: string[];
  pinData?: Record<string, unknown>;
}

// Source Control Types
export interface SourceControlStatus {
  ahead: number;
  behind: number;
  conflicted: string[];
  created: string[];
  current: string;
  deleted: string[];
  detached: boolean;
  files: Array<{
    path: string;
    status: string;
  }>;
  modified: string[];
  notAdded: string[];
  renamed: Array<{
    from: string;
    to: string;
  }>;
  staged: string[];
  tracking: string;
}

export interface SourceControlPullResult {
  conflicts: string[];
  files: Array<{
    path: string;
    status: string;
  }>;
  mergeConflicts: boolean;
  pullResult: 'success' | 'conflict' | 'error';
}

export interface SourceControlPushResult {
  ahead: number;
  conflicts: string[];
  files: Array<{
    path: string;
    status: string;
  }>;
  pushResult: 'success' | 'conflict' | 'error';
}

// Health Check Types
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  instanceId?: string;
  n8nVersion?: string;
  features?: {
    sourceControl?: boolean;
    externalHooks?: boolean;
    workers?: boolean;
    [key: string]: boolean | undefined;
  };
}

// Request Parameter Types
export interface WorkflowListParams {
  limit?: number;
  cursor?: string;
  active?: boolean;
  tags?: string | null;  // Comma-separated string per n8n API spec
  projectId?: string;
  excludePinnedData?: boolean;
  instance?: string;
}

export interface WorkflowListResponse {
  data: Workflow[];
  nextCursor?: string | null;
}

export interface ExecutionListParams {
  limit?: number;
  cursor?: string;
  workflowId?: string;
  projectId?: string;
  status?: ExecutionStatus;
  includeData?: boolean;
}

export interface ExecutionListResponse {
  data: Execution[];
  nextCursor?: string | null;
}

export interface TagListParams {
  limit?: number;
  cursor?: string;
  withUsageCount?: boolean;
}

export interface TagListResponse {
  data: Tag[];
  nextCursor?: string | null;
}

// Webhook Request Type
export interface WebhookRequest {
  webhookUrl: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, unknown>;
  headers?: Record<string, string>;
  waitForResponse?: boolean;
}

// MCP Tool Response Type
export interface McpToolResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
  executionId?: string;
  workflowId?: string;
}

// Execution Filtering Types
export type ExecutionMode = 'preview' | 'summary' | 'filtered' | 'full';

export interface ExecutionPreview {
  totalNodes: number;
  executedNodes: number;
  estimatedSizeKB: number;
  nodes: Record<string, NodePreview>;
}

export interface NodePreview {
  status: 'success' | 'error';
  itemCounts: {
    input: number;
    output: number;
  };
  dataStructure: Record<string, any>;
  estimatedSizeKB: number;
  error?: string;
}

export interface ExecutionRecommendation {
  canFetchFull: boolean;
  suggestedMode: ExecutionMode;
  suggestedItemsLimit?: number;
  reason: string;
}

export interface ExecutionFilterOptions {
  mode?: ExecutionMode;
  nodeNames?: string[];
  itemsLimit?: number;
  includeInputData?: boolean;
  fieldsToInclude?: string[];
}

export interface FilteredExecutionResponse {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  mode: ExecutionMode;
  startedAt: string;
  stoppedAt?: string;
  duration?: number;
  finished: boolean;

  // Preview-specific data
  preview?: ExecutionPreview;
  recommendation?: ExecutionRecommendation;

  // Summary/Filtered data
  summary?: {
    totalNodes: number;
    executedNodes: number;
    totalItems: number;
    hasMoreData: boolean;
  };
  nodes?: Record<string, FilteredNodeData>;

  // Error information
  error?: Record<string, unknown>;
}

export interface FilteredNodeData {
  executionTime?: number;
  itemsInput: number;
  itemsOutput: number;
  status: 'success' | 'error';
  error?: string;
  data?: {
    input?: any[][];
    output?: any[][];
    metadata: {
      totalItems: number;
      itemsShown: number;
      truncated: boolean;
    };
  };
}