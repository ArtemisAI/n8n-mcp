# Network Client Setup Guide

## Overview

This guide explains how to connect to n8n-MCP from any machine on your network and call MCP tools via HTTP. n8n-MCP acts as a centralized service that provides AI-powered n8n assistance to multiple clients across your network.

## Quick Start

### 1. Start n8n-MCP Server

On the machine hosting the MCP server:

```bash
# Start with docker-compose
docker-compose -f docker-compose.n8n.yml up -d

# Services will be available at:
# - n8n: http://localhost:5678
# - n8n-mcp: http://0.0.0.0:3000 (accessible from network)
```

### 2. Get Your Machine IP

Find the IP address of the machine running n8n-MCP:

```bash
# Linux/Mac
hostname -I

# Windows PowerShell
(Get-NetIPAddress | Where-Object {$_.AddressFamily -eq "IPv4" -and $_.IPAddress -notlike "127.*"}).IPAddress
```

Example: `192.168.1.100`

### 3. Connect from Remote Machine

### Method 1: Node.js/TypeScript Client

Install the TypeScript example:

```bash
npm install axios
```

Use the provided `examples/network-client.ts`:

```typescript
import { NetworkMCPClient } from './network-client';

const client = new NetworkMCPClient(
  'http://192.168.1.100:3000',
  'your-secure-token-123456789'
);

// Get service info
const info = await client.getServiceInfo();
console.log(info);

// List nodes
const nodes = await client.listNodes();
console.log(nodes);

// Call a tool
const result = await client.callTool('search_nodes', { query: 'http', limit: 5 });
console.log(result);
```

### Method 2: Python Client

```python
import requests
import json

class NetworkMCPClient:
    def __init__(self, base_url, auth_token):
        self.base_url = base_url.rstrip('/')
        self.auth_token = auth_token
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_token}'
        }
        self.request_id = 0

    def get_service_info(self):
        response = requests.get(f'{self.base_url}/info')
        return response.json()

    def get_health(self):
        response = requests.get(f'{self.base_url}/health')
        return response.json()

    def get_tools(self):
        response = requests.get(f'{self.base_url}/tools')
        return response.json()

    def call_tool(self, tool_name, tool_input=None):
        self.request_id += 1
        payload = {
            'jsonrpc': '2.0',
            'id': self.request_id,
            'method': 'tools/call',
            'params': {
                'name': tool_name,
                'arguments': tool_input or {}
            }
        }
        response = requests.post(
            f'{self.base_url}/mcp',
            json=payload,
            headers=self.headers
        )
        return response.json()

# Usage
client = NetworkMCPClient('http://192.168.1.100:3000', 'your-secure-token-123456789')
info = client.get_service_info()
print(info)
```

### Method 3: cURL (Shell/Bash)

```bash
# Get service info
curl http://192.168.1.100:3000/info

# Get health status
curl http://192.168.1.100:3000/health

# Get available tools
curl http://192.168.1.100:3000/tools

# Call a tool (requires authentication)
curl -X POST http://192.168.1.100:3000/mcp \
  -H "Authorization: Bearer your-secure-token-123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/call",
    "params": {
      "name": "search_nodes",
      "arguments": {
        "query": "http",
        "limit": 5
      }
    }
  }'

# Get metrics
curl http://192.168.1.100:3000/metrics \
  -H "Authorization: Bearer your-secure-token-123456789"
```

## Available Endpoints

### Public Endpoints (No Auth Required)

#### `GET /info` - Service Information
Returns metadata about the MCP server, available endpoints, and capabilities.

**Response:**
```json
{
  "service": "n8n-MCP-Server",
  "version": "2.20.0",
  "baseUrl": "http://192.168.1.100:3000",
  "protocols": {
    "transport": "HTTP Streamable",
    "format": "JSON-RPC 2.0",
    "specification": "Model Context Protocol"
  },
  "endpoints": {
    "health": "http://192.168.1.100:3000/health",
    "info": "http://192.168.1.100:3000/info",
    "tools": "http://192.168.1.100:3000/tools",
    "metrics": "http://192.168.1.100:3000/metrics",
    "mcp": "http://192.168.1.100:3000/mcp"
  }
}
```

#### `GET /health` - Health Status
Check if the server is running and get session information.

**Response:**
```json
{
  "status": "ok",
  "version": "2.20.0",
  "sessions": {
    "active": 3,
    "total": 15,
    "max": 100,
    "usage": "3/100"
  },
  "memory": {
    "used": 128,
    "total": 2048,
    "unit": "MB"
  }
}
```

#### `GET /tools` - Available Tools
Lists all MCP tools provided by the server.

**Response:**
```json
{
  "tools": [
    {
      "name": "list_nodes",
      "description": "List all available n8n nodes"
    },
    {
      "name": "get_node_info",
      "description": "Get detailed information about a specific node"
    }
    // ... 21 total tools
  ],
  "count": 21
}
```

#### `GET /health` - Health Check (with discovery)
Complete health and discovery information without authentication.

### Protected Endpoints (Auth Required)

#### `POST /mcp` - MCP Endpoint
Main endpoint for calling MCP tools. Requires Bearer token authentication.

**Headers:**
```
Authorization: Bearer {MCP_AUTH_TOKEN}
Content-Type: application/json
```

**Request Format (JSON-RPC 2.0):**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      "param1": "value1",
      "param2": "value2"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    // Tool result data
  }
}
```

#### `GET /metrics` - Server Metrics
Returns usage statistics and performance metrics.

**Response:**
```json
{
  "sessions": {
    "active": 3,
    "total": 15,
    "expired": 12,
    "maxAllowed": 100,
    "usagePercent": "3.00"
  },
  "uptime": {
    "seconds": 86400,
    "formatted": "24h 0m"
  },
  "memory": {
    "heapUsed": "128 MB",
    "heapTotal": "512 MB"
  }
}
```

## Available Tools

### Documentation & Discovery
- `tools_documentation` - Get comprehensive documentation for all tools
- `list_nodes` - List all available n8n nodes
- `get_node_info` - Get detailed information about a node
- `search_nodes` - Search nodes by name or category
- `get_node_essentials` - Get essential configuration for a node
- `validate_node_config` - Validate node configuration

### Workflow Management
- `n8n_activate_workflow` - Activate a workflow
- `n8n_deactivate_workflow` - Deactivate a workflow
- `n8n_retry_execution` - Retry a workflow execution

### Credentials
- `n8n_create_credential` - Create a new credential
- `n8n_get_credential` - Get credential details
- `n8n_delete_credential` - Delete a credential

### Tags
- `n8n_create_tag` - Create a tag
- `n8n_list_tags` - List all tags
- `n8n_get_tag` - Get tag details
- `n8n_update_tag` - Update a tag
- `n8n_delete_tag` - Delete a tag

### Variables
- `n8n_create_variable` - Create an environment variable
- `n8n_list_variables` - List all variables
- `n8n_get_variable` - Get a variable
- `n8n_update_variable` - Update a variable
- `n8n_delete_variable` - Delete a variable

## Configuration

### Environment Variables

Set these on the MCP server machine (in `.env` or `docker-compose.yml`):

```bash
# Network Configuration
MCP_HOST=0.0.0.0              # Listen on all interfaces
MCP_PORT=3000                 # HTTP port
MCP_AUTH_TOKEN=your-secure-token-123  # Bearer token

# n8n Configuration  
N8N_API_URL=http://n8n:5678   # Internal n8n address
N8N_API_KEY=your-n8n-api-key  # n8n API authentication

# Logging
LOG_LEVEL=info
NODE_ENV=production

# CORS
CORS_ORIGIN=*                 # Allow all origins (configure for security)
```

### Generate Secure Token

```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($bytes)
[BitConverter]::ToString($bytes).Replace("-", "").ToLower()
```

## Networking

### Local Network Access

**Setup (Docker Host Machine):**
```yaml
# docker-compose.n8n.yml
services:
  n8n-mcp:
    ports:
      - "0.0.0.0:3000:3000"  # Listen on all interfaces
    environment:
      - MCP_HOST=0.0.0.0
```

**Access from Remote Machine:**
```
http://192.168.1.100:3000
```

### Fixed IP Configuration

If you have a fixed machine IP:

```yaml
# docker-compose.n8n.yml
services:
  n8n-mcp:
    ports:
      - "192.168.1.100:3000:3000"  # Your machine's IP
```

### Docker Network (Container-to-Container)

For containers on the same Docker network:

```
http://n8n-mcp:3000  # Use service name
```

## Security Best Practices

### 1. Token Management
- Generate strong random tokens (32+ characters)
- Keep tokens secure (environment variables, secrets management)
- Rotate tokens regularly
- Use different tokens per network segment (optional)

### 2. Network Security
```bash
# Restrict port access to known IPs (Linux iptables)
iptables -A INPUT -p tcp --dport 3000 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -j DROP
```

### 3. Firewall Rules
```bash
# UFW (Ubuntu/Debian)
ufw allow from 192.168.1.0/24 to any port 3000

# Firewalld (RHEL/CentOS)
firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" port protocol="tcp" port="3000" accept'
```

### 4. HTTPS (Optional, for Remote Access)

Use a reverse proxy (nginx, traefik) with SSL certificates:

```nginx
server {
    listen 443 ssl http2;
    server_name mcp.example.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header Content-Type application/json;
    }
}
```

### 5. Rate Limiting

Server has built-in rate limiting:
- Per IP: 100 requests/15 minutes
- Per token: 500 requests/hour
- Per session: 1000 requests/day

## Troubleshooting

### Connection Refused
```bash
# Check if server is running
curl http://192.168.1.100:3000/health

# Check if firewall allows port
netstat -tlnp | grep 3000

# Check Docker container logs
docker logs n8n-mcp
```

### Authentication Failed
```bash
# Verify token is correct
echo "Bearer your-secure-token-123456789"

# Test with curl
curl -H "Authorization: Bearer your-secure-token-123456789" \
  http://192.168.1.100:3000/metrics
```

### Slow Responses
```bash
# Check server metrics
curl http://192.168.1.100:3000/metrics \
  -H "Authorization: Bearer your-token"

# Check Docker resource usage
docker stats n8n-mcp
```

### Session Errors
```bash
# Check active sessions
curl http://192.168.1.100:3000/health

# Restart server if needed
docker restart n8n-mcp
```

## Advanced Usage

### Multi-Application Integration

Different applications can connect to the same MCP server:

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────┐
│  Node.js App    │    │  Python Script   │    │  n8n Client  │
└────────┬────────┘    └────────┬─────────┘    └──────┬───────┘
         │                       │                     │
         └───────────────────────┼─────────────────────┘
                                 │
                    ┌────────────▼──────────┐
                    │  n8n-MCP Server      │
                    │  (192.168.1.100:3000)│
                    └────────────┬──────────┘
                                 │
                    ┌────────────▼──────────┐
                    │ n8n Instance         │
                    │ (localhost:5678)     │
                    └──────────────────────┘
```

### Session Management

Each client gets its own session:

```typescript
// Session automatically created on first request
const client = new NetworkMCPClient(url, token);

// Session ID automatically handled
const result = await client.callTool('list_nodes');

// Session automatically expires after 30 minutes of inactivity
```

### Error Handling

```typescript
try {
  const result = await client.callTool('invalid_tool');
} catch (error) {
  if (error.response?.status === 401) {
    console.log('Authentication failed - check token');
  } else if (error.response?.status === 404) {
    console.log('Tool not found');
  } else {
    console.log('Server error');
  }
}
```

## Performance Optimization

### Connection Pooling
For high-volume usage, reuse the client instance:

```typescript
// Good - reuse client
const client = new NetworkMCPClient(url, token);
for (let i = 0; i < 100; i++) {
  await client.callTool('list_nodes');
}

// Bad - new client per request
for (let i = 0; i < 100; i++) {
  const client = new NetworkMCPClient(url, token);
  await client.callTool('list_nodes');
}
```

### Batch Operations
Combine multiple operations when possible:

```typescript
// Fetch multiple nodes in parallel
const [nodes, tools, info] = await Promise.all([
  client.listNodes(),
  client.getTools(),
  client.getServiceInfo()
]);
```

## Support & Documentation

- GitHub: https://github.com/czlonkowski/n8n-mcp
- Issues: https://github.com/czlonkowski/n8n-mcp/issues
- Documentation: See `/docs` directory
