# HTTP Network Integration Plan - n8n-MCP

## Overview

Transform n8n-MCP into a network-accessible HTTP service that allows any machine and project on your network to access n8n automation through the MCP protocol.

## Current State Analysis

✅ **Already Implemented:**
- HTTP server via Express.js (`SingleSessionHTTPServer`)
- StreamableHTTPServerTransport (MCP SDK recommended transport)
- Docker container support with health checks
- Bearer token authentication
- Multi-session management
- Session cleanup and timeout handling

## Implementation Strategy

### Phase 1: Network Configuration

#### 1.1 Environment Variables for Network Access
Create `.env` for network-accessible setup:

```env
# Network Configuration
MCP_HOST=0.0.0.0                           # Listen on all interfaces
MCP_PORT=3000                              # HTTP port
MCP_AUTH_TOKEN=your-secure-token-123       # Bearer token for auth

# n8n Configuration
N8N_API_URL=http://n8n:5678               # Internal Docker network
N8N_API_KEY=your-n8n-api-key              # n8n API authentication

# Logging
LOG_LEVEL=info
NODE_ENV=production

# Network Security
CORS_ORIGINS=*                             # Configure based on your network
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=15m
```

#### 1.2 Expose Service on Network

**Update docker-compose.n8n.yml:**

```yaml
n8n-mcp:
  ports:
    - "0.0.0.0:3000:3000"  # Listen on all interfaces instead of localhost
  environment:
    - MCP_HOST=0.0.0.0
    - MCP_PORT=3000
```

**Or directly expose machine IP:**
```yaml
ports:
  - "192.168.1.100:3000:3000"  # Your machine IP on network
```

### Phase 2: Service Discovery

#### 2.1 Health Check Endpoint
- **Endpoint:** `GET /health`
- **Returns:** Service status, version, available tools
- **Authentication:** Optional for health check

#### 2.2 Service Info Endpoint
- **Endpoint:** `GET /info`
- **Returns:** Server version, protocols supported, available operations

#### 2.3 Tools Discovery Endpoint
- **Endpoint:** `GET /tools`
- **Returns:** List of available MCP tools

### Phase 3: Multi-Tenant Network Access

#### 3.1 Per-Network-Client Sessions
Each machine/client gets its own session:
- Session ID generated per initialize request
- Automatic session cleanup after inactivity
- Session-specific state isolation

#### 3.2 Headers for Multi-Tenant Support
```
Authorization: Bearer {MCP_AUTH_TOKEN}
X-Session-ID: {auto-generated or client-provided}
X-Client-Info: {machine-name}/{application}
```

### Phase 4: Security Implementation

#### 4.1 Authentication Layer
- Bearer token validation on all requests
- Rate limiting per IP/token
- Request signature validation (optional)

#### 4.2 CORS Configuration
```javascript
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['*'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### 4.3 Network Isolation
- Internal n8n API accessible only within Docker network
- All network clients authenticate via MCP_AUTH_TOKEN
- IP whitelist option (optional)

### Phase 5: Client Implementation Guide

#### 5.1 Network Endpoint Configuration

For remote machines, use:
```
http://{machine-ip}:3000/mcp
```

Example: `http://192.168.1.100:3000/mcp`

#### 5.2 Client Connection Example (Node.js)

```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { HTTPClientTransport } from "@modelcontextprotocol/sdk/client/http.js";

// Remote HTTP connection
const transport = new HTTPClientTransport({
  url: new URL("http://192.168.1.100:3000/mcp"),
  headers: {
    Authorization: "Bearer your-secure-token-123"
  }
});

const client = new Client({
  name: "network-client",
  version: "1.0.0"
}, {
  capabilities: {}
});

await client.connect(transport);
const tools = await client.listTools();
```

#### 5.3 Client Connection Example (Python)

```python
import httpx
import json

BASE_URL = "http://192.168.1.100:3000"
AUTH_TOKEN = "your-secure-token-123"

headers = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

# List tools
response = httpx.post(
    f"{BASE_URL}/mcp",
    json={
        "jsonrpc": "2.0",
        "id": "1",
        "method": "tools/list",
        "params": {}
    },
    headers=headers
)

tools = response.json()
print(tools)
```

#### 5.4 n8n Integration (n8n-nodes-mcp)

```json
{
  "nodeType": "n8n-nodes-mcp",
  "credentialName": "Network n8n-MCP",
  "httpStreamUrl": "http://192.168.1.100:3000/mcp",
  "authorizationHeader": "Bearer your-secure-token-123"
}
```

### Phase 6: Advanced Features

#### 6.1 Request Logging & Monitoring
- Log all requests with timestamp, client, operation
- Track usage per authentication token
- Metrics endpoint: `GET /metrics`

#### 6.2 Connection Status Dashboard
- Real-time session monitoring
- Active clients list
- Request/response statistics

#### 6.3 Rate Limiting Strategy
```
- Per IP: 100 requests/15min
- Per token: 500 requests/hour
- Per session: 1000 requests/day
```

#### 6.4 Graceful Shutdown
- Notify connected clients of shutdown
- Wait for in-flight requests to complete
- Clean session closure

## Implementation Checklist

### Server-Side Changes

- [ ] Update `SingleSessionHTTPServer` to bind to `0.0.0.0` by default
- [ ] Add `MCP_HOST` environment variable support
- [ ] Implement `/health` endpoint with JSON response
- [ ] Implement `/info` endpoint with service metadata
- [ ] Implement `/tools` endpoint for discovery
- [ ] Add CORS middleware for network clients
- [ ] Add rate limiting middleware per IP/token
- [ ] Implement request logging with client identification
- [ ] Add metrics collection endpoint
- [ ] Implement graceful shutdown handler
- [ ] Add configuration validation for network mode

### Docker Configuration

- [ ] Update `docker-compose.n8n.yml` to expose on `0.0.0.0`
- [ ] Create `.env.example` with network variables
- [ ] Add network documentation to README
- [ ] Create `docker-compose.network.yml` for extended setup
- [ ] Document port mapping for different network scenarios

### Client Documentation

- [ ] Create `docs/NETWORK_CLIENT_SETUP.md`
- [ ] Add client examples (Node.js, Python, cURL)
- [ ] Document n8n-nodes-mcp remote configuration
- [ ] Create troubleshooting guide
- [ ] Add network security best practices

### Testing & Validation

- [ ] Integration tests for network endpoints
- [ ] Load testing (multiple simultaneous clients)
- [ ] Security testing (token validation, rate limiting)
- [ ] Cross-network testing (different subnets)
- [ ] Docker network testing

## Network Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Network (LAN/WAN)                    │
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Machine 1  │    │   Machine 2  │    │   Machine 3  │   │
│  │ (Client App) │    │  (n8n node)  │    │  (Node.js)   │   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘   │
│         │                    │                    │            │
│         │  HTTP + Bearer     │  HTTP + Bearer     │            │
│         │  Token             │  Token             │            │
│         └────────────┬───────┴────────────┬───────┘            │
│                      │                    │                    │
│              ┌───────▼────────────────────▼────────┐           │
│              │   Docker Host (Your Machine)        │           │
│              │   192.168.1.100:3000                │           │
│              │                                     │           │
│              │  ┌─────────────────────────────┐    │           │
│              │  │   Docker Network            │    │           │
│              │  │  (n8n-network bridge)       │    │           │
│              │  │                             │    │           │
│              │  │  ┌───────┐    ┌──────────┐ │    │           │
│              │  │  │  n8n  │    │n8n-mcp   │ │    │           │
│              │  │  │:5678  │    │:3000     │ │    │           │
│              │  │  │       │◄───┤(HTTP)    │ │    │           │
│              │  │  └───────┘    └──────────┘ │    │           │
│              │  │                             │    │           │
│              │  └─────────────────────────────┘    │           │
│              │                                     │           │
│              └─────────────────────────────────────┘           │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

## Security Considerations

### Token Management
1. Generate strong random token: `openssl rand -hex 32`
2. Share only with trusted machines
3. Rotate regularly
4. Different tokens per network segment (optional)

### Network Security
1. Use VPN for remote access (not local network)
2. Firewall: Restrict port 3000 to known IPs
3. HTTPS (if exposing beyond local network)
4. Rate limiting to prevent abuse

### Best Practices
1. Never expose `N8N_API_KEY` in logs
2. Use separate n8n instances for different security zones
3. Monitor access logs for anomalies
4. Implement IP whitelist for production

## Deployment Options

### Option 1: Local Network (Recommended)
- All machines on same LAN
- Docker host binds to `0.0.0.0`
- Use Docker network hostname for internal connections

### Option 2: VPN Network
- Remote machines connect via VPN
- Docker host on VPN interface
- Firewall rules allow VPN traffic only

### Option 3: Public Internet (Advanced)
- Requires HTTPS + stronger authentication
- Consider reverse proxy (nginx, traefik)
- Implement rate limiting and IP whitelisting
- Consider authentication service (OAuth2, mTLS)

## Rollout Plan

1. **Week 1:** Implement Phase 1-2 (Basic HTTP network exposure)
2. **Week 2:** Implement Phase 3-4 (Multi-tenant & security)
3. **Week 3:** Implement Phase 5-6 (Client docs & monitoring)
4. **Week 4:** Testing, validation, and documentation

## Success Metrics

✅ Network client can call MCP tools from remote machine
✅ Multiple simultaneous clients supported
✅ Session isolation between clients
✅ <100ms average response time
✅ No memory leaks after 24h continuous operation
✅ Rate limiting prevents abuse
✅ Graceful handling of network interruptions
