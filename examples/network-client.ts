/**
 * Network Client Example for n8n-MCP
 * 
 * This example shows how to connect to n8n-MCP from a remote machine on the network
 * and call MCP tools via HTTP.
 * 
 * Usage:
 *   npx ts-node examples/network-client.ts
 * 
 * Prerequisites:
 *   - n8n-MCP running on your network (e.g., http://192.168.1.100:3000)
 *   - Authentication token configured
 */

import axios, { AxiosInstance } from 'axios';

interface MCPRequestPayload {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: string;
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

class NetworkMCPClient {
  private httpClient: AxiosInstance;
  private baseUrl: string;
  private authToken: string;
  private requestId = 0;

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.authToken = authToken;

    // Create axios instance with default configuration
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
        'User-Agent': 'n8n-mcp-network-client/1.0'
      }
    });
  }

  /**
   * Get service information
   */
  async getServiceInfo(): Promise<any> {
    try {
      const response = await this.httpClient.get('/info');
      return response.data;
    } catch (error) {
      console.error('Failed to get service info:', error);
      throw error;
    }
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<any> {
    try {
      const response = await this.httpClient.get('/health');
      return response.data;
    } catch (error) {
      console.error('Failed to get health status:', error);
      throw error;
    }
  }

  /**
   * List available tools
   */
  async getTools(): Promise<any> {
    try {
      const response = await this.httpClient.get('/tools');
      return response.data;
    } catch (error) {
      console.error('Failed to get tools:', error);
      throw error;
    }
  }

  /**
   * Get metrics and usage statistics
   */
  async getMetrics(): Promise<any> {
    try {
      const response = await this.httpClient.get('/metrics');
      return response.data;
    } catch (error) {
      console.error('Failed to get metrics:', error);
      throw error;
    }
  }

  /**
   * Call an MCP tool
   */
  async callTool(toolName: string, toolInput: Record<string, unknown> = {}): Promise<any> {
    try {
      const payload: MCPRequestPayload = {
        jsonrpc: '2.0',
        id: ++this.requestId,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: toolInput
        }
      };

      const response = await this.httpClient.post<MCPResponse>('/mcp', payload);

      if (response.data.error) {
        throw new Error(`MCP Error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error) {
      console.error(`Failed to call tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * List all nodes
   */
  async listNodes(): Promise<any> {
    return this.callTool('list_nodes');
  }

  /**
   * Get info about a specific node
   */
  async getNodeInfo(nodeType: string): Promise<any> {
    return this.callTool('get_node_info', { nodeType });
  }

  /**
   * Search nodes
   */
  async searchNodes(query: string, limit = 10): Promise<any> {
    return this.callTool('search_nodes', { query, limit });
  }
}

/**
 * Main example
 */
async function main() {
  // Configuration
  const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';
  const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || 'test-secure-token-123456789';

  console.log('🚀 n8n-MCP Network Client Example');
  console.log(`📍 Connecting to: ${MCP_SERVER_URL}`);
  console.log('');

  // Create client
  const client = new NetworkMCPClient(MCP_SERVER_URL, MCP_AUTH_TOKEN);

  try {
    // 1. Get service information
    console.log('📋 Fetching service information...');
    const info = await client.getServiceInfo();
    console.log(`   Service: ${info.service} v${info.version}`);
    console.log(`   Description: ${info.description}`);
    console.log('');

    // 2. Check health
    console.log('🏥 Checking service health...');
    const health = await client.getHealth();
    console.log(`   Status: ${health.status}`);
    console.log(`   Active Sessions: ${health.sessions.active}/${health.sessions.max}`);
    console.log(`   Memory: ${health.memory.used}MB / ${health.memory.total}MB`);
    console.log(`   Uptime: ${health.uptime}s`);
    console.log('');

    // 3. Get available tools
    console.log('🛠️  Getting available tools...');
    const tools = await client.getTools();
    console.log(`   Total tools: ${tools.count}`);
    console.log('   Sample tools:');
    tools.tools.slice(0, 5).forEach((tool: any) => {
      console.log(`     - ${tool.name}: ${tool.description}`);
    });
    console.log('');

    // 4. Get metrics
    console.log('📊 Fetching server metrics...');
    const metrics = await client.getMetrics();
    console.log(`   Active Sessions: ${metrics.sessions.active}`);
    console.log(`   Total Sessions: ${metrics.sessions.total}`);
    console.log(`   Memory Usage: ${metrics.memory.heapUsed} / ${metrics.memory.heapTotal}`);
    console.log('');

    // 5. List nodes (requires authentication and n8n connection)
    console.log('📚 Listing available n8n nodes...');
    try {
      const nodes = await client.listNodes();
      console.log(`   Retrieved: ${Array.isArray(nodes) ? nodes.length : 'unknown'} nodes`);
    } catch (error) {
      console.log('   (Note: Node listing requires n8n connection)');
    }
    console.log('');

    // 6. Search for specific nodes
    console.log('🔍 Searching for HTTP nodes...');
    try {
      const searchResults = await client.searchNodes('http', 5);
      if (searchResults && Array.isArray(searchResults)) {
        console.log(`   Found: ${searchResults.length} nodes`);
        searchResults.slice(0, 3).forEach((node: any) => {
          console.log(`     - ${node.name || node.nodeType}`);
        });
      }
    } catch (error) {
      console.log('   (Note: Node search requires n8n connection)');
    }
    console.log('');

    console.log('✅ All examples completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update MCP_SERVER_URL with your actual server address');
    console.log('2. Update MCP_AUTH_TOKEN with your authentication token');
    console.log('3. Integrate with your application using the NetworkMCPClient class');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for use as a module
export { NetworkMCPClient };
