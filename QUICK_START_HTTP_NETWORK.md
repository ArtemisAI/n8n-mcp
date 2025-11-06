# Quick Reference - HTTP Network Integration

## Start n8n-MCP Server

```bash
docker-compose -f docker-compose.n8n.yml up -d
```

## Get Your Machine IP

```bash
# Linux/Mac
hostname -I | awk '{print $1}'

# Windows PowerShell
(Get-NetIPAddress | Where-Object {$_.AddressFamily -eq "IPv4" -and $_.IPAddress -notlike "127.*"}).IPAddress

# macOS
ifconfig | grep "inet " | grep -v "127.0.0.1"
```

## Test from Remote Machine

### Basic Health Check
```bash
curl http://192.168.1.100:3000/health
```

### Get Service Info
```bash
curl http://192.168.1.100:3000/info
```

### List Available Tools
```bash
curl http://192.168.1.100:3000/tools
```

### Get Server Metrics (requires token)
```bash
curl -H "Authorization: Bearer your-token" \
  http://192.168.1.100:3000/metrics
```

### Call a Tool (requires token)
```bash
curl -X POST http://192.168.1.100:3000/mcp \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/call",
    "params": {
      "name": "list_nodes",
      "arguments": {}
    }
  }'
```

## Quick TypeScript Client

```typescript
import { NetworkMCPClient } from './examples/network-client';

const client = new NetworkMCPClient(
  'http://192.168.1.100:3000',
  'your-secure-token-123456789'
);

// Get server info
const info = await client.getServiceInfo();
console.log(`Server: ${info.service} v${info.version}`);

// List tools
const tools = await client.getTools();
console.log(`Available tools: ${tools.count}`);

// Call a tool
const nodes = await client.callTool('list_nodes');
console.log(`n8n nodes: ${nodes.length}`);
```

## Quick Python Client

```python
import requests
import json

url = "http://192.168.1.100:3000"
token = "your-secure-token-123456789"

# Get service info
response = requests.get(f"{url}/info")
print(response.json())

# List tools
response = requests.get(f"{url}/tools")
print(f"Available tools: {response.json()['count']}")

# Call a tool
payload = {
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/call",
    "params": {
        "name": "list_nodes",
        "arguments": {}
    }
}

response = requests.post(
    f"{url}/mcp",
    json=payload,
    headers={"Authorization": f"Bearer {token}"}
)
print(response.json())
```

## Environment Configuration

```bash
# .env or docker-compose environment
MCP_HOST=0.0.0.0
MCP_PORT=3000
MCP_AUTH_TOKEN=your-secure-token-123456789
N8N_API_URL=http://n8n:5678
N8N_API_KEY=your-n8n-api-key
LOG_LEVEL=info
NODE_ENV=production
```

## Available Endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /` | No | API info |
| `GET /health` | No | Health status |
| `GET /info` | No | Service metadata |
| `GET /tools` | No | Tools list |
| `GET /metrics` | Yes | Usage stats |
| `POST /mcp` | Yes | Call tools |

## All Available Tools (21 total)

**Documentation:**
- `tools_documentation`
- `list_nodes`
- `get_node_info`
- `search_nodes`
- `get_node_essentials`
- `validate_node_config`

**Workflows:**
- `n8n_activate_workflow`
- `n8n_deactivate_workflow`
- `n8n_retry_execution`

**Credentials:**
- `n8n_create_credential`
- `n8n_get_credential`
- `n8n_delete_credential`

**Tags:**
- `n8n_create_tag`
- `n8n_list_tags`
- `n8n_get_tag`
- `n8n_update_tag`
- `n8n_delete_tag`

**Variables:**
- `n8n_create_variable`
- `n8n_list_variables`
- `n8n_get_variable`
- `n8n_update_variable`
- `n8n_delete_variable`

## Security

### Generate Token
```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
$bytes = New-Object byte[] 32; [Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($bytes); [BitConverter]::ToString($bytes).Replace("-", "").ToLower()
```

### Firewall (allow specific IPs)
```bash
# UFW
ufw allow from 192.168.1.0/24 to any port 3000

# iptables
iptables -A INPUT -p tcp --dport 3000 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -j DROP
```

## Troubleshooting

```bash
# Check if running
curl http://192.168.1.100:3000/health

# Check Docker logs
docker logs n8n-mcp

# Test connectivity
telnet 192.168.1.100 3000

# Check firewall
sudo iptables -L | grep 3000
sudo ufw status

# Restart service
docker restart n8n-mcp
```

## Rate Limits

- Per IP: 100 requests/15 minutes
- Per token: 500 requests/hour
- Per session: 1000 requests/day

## Session Limits

- Max sessions: 100
- Session timeout: 30 minutes (inactivity)
- Auto cleanup: Every 5 minutes

## Documentation

- Full Guide: `docs/NETWORK_CLIENT_SETUP.md`
- Implementation Plan: `HTTP_NETWORK_INTEGRATION_PLAN.md`
- TypeScript Client: `examples/network-client.ts`
- Summary: `IMPLEMENTATION_COMPLETE.md`
