window.BENCHMARK_DATA = {
  "lastUpdate": 1762443692449,
  "repoUrl": "https://github.com/ArtemisAI/n8n-mcp",
  "entries": {
    "n8n-mcp Benchmarks": [
      {
        "commit": {
          "author": {
            "email": "56956555+czlonkowski@users.noreply.github.com",
            "name": "Romuald Członkowski",
            "username": "czlonkowski"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": false,
          "id": "a4ef1efaf87795bafda3e230ffb2c0b4e3fcb253",
          "message": "fix: Gracefully handle FTS5 unavailability in sql.js fallback (#398)\n\nFixed critical startup crash when server falls back to sql.js adapter\ndue to Node.js version mismatches.\n\nProblem:\n- better-sqlite3 fails to load when Node runtime version differs from build version\n- Server falls back to sql.js (pure JS, no native dependencies)\n- Database health check crashed with \"no such module: fts5\"\n- Server exits immediately, preventing Claude Desktop connection\n\nSolution:\n- Wrapped FTS5 health check in try-catch block\n- Logs warning when FTS5 not available\n- Server continues with fallback search (LIKE queries)\n- Graceful degradation: works with any Node.js version\n\nImpact:\n- Server now starts successfully with sql.js fallback\n- Works with Node v20 (Claude Desktop) even when built with Node v22\n- Clear warnings about FTS5 unavailability\n- Users can choose: sql.js (slower, works everywhere) or rebuild better-sqlite3 (faster)\n\nFiles Changed:\n- src/mcp/server.ts: Added try-catch around FTS5 health check (lines 299-317)\n\nTesting:\n- ✅ Tested with Node v20.17.0 (Claude Desktop)\n- ✅ Tested with Node v22.17.0 (build version)\n- ✅ All 6 startup checkpoints pass\n- ✅ Database health check passes with warning\n\nFixes: Claude Desktop connection failures with Node.js version mismatches\n\nConceived by Romuald Członkowski - https://www.aiadvisors.pl/en",
          "timestamp": "2025-11-04T16:14:16+01:00",
          "tree_id": "dacb97a77111098208d181d2b2726235819bd78a",
          "url": "https://github.com/ArtemisAI/n8n-mcp/commit/a4ef1efaf87795bafda3e230ffb2c0b4e3fcb253"
        },
        "date": 1762371610936,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "sample - array sorting - small",
            "value": 0.0136,
            "range": "0.3096",
            "unit": "ms",
            "extra": "73341 ops/sec"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "daniel@artemis-ai.ca",
            "name": "ArtemisAI",
            "username": "ArtemisAI"
          },
          "committer": {
            "email": "daniel@artemis-ai.ca",
            "name": "ArtemisAI",
            "username": "ArtemisAI"
          },
          "distinct": false,
          "id": "fc82c0bef529af8e42fb6b28b584cea3da1e74f4",
          "message": "feat: add workflow activation/deactivation via dedicated API endpoints\n\nAdd support for activating and deactivating n8n workflows using the\ndedicated POST /workflows/{id}/activate and POST /workflows/{id}/deactivate\nendpoints that were previously not utilized by n8n-mcp.\n\nChanges:\n- Add activateWorkflow() and deactivateWorkflow() methods to N8nApiClient\n- Add n8n_activate_workflow and n8n_deactivate_workflow MCP tools\n- Add handleActivateWorkflow() and handleDeactivateWorkflow() handlers\n- Register new tools in server validation and handler routing\n- Remove outdated 'Cannot activate/deactivate workflows via API' limitation\n\nPreviously, n8n-mcp used PUT /workflows/{id} which ignores the active flag.\nThis implementation uses the correct endpoints that properly handle workflow\nstate changes.\n\nTested with n8n v1.114.4\nAPI Version: Requires n8n v1.0+ (when activation endpoints were added)\nBackward compatible with existing workflows\n\nFixes workflow activation not working via n8n-mcp tools",
          "timestamp": "2025-11-05T13:16:38-05:00",
          "tree_id": "66580462a16b5a56292c28892173d6bb321988cd",
          "url": "https://github.com/ArtemisAI/n8n-mcp/commit/fc82c0bef529af8e42fb6b28b584cea3da1e74f4"
        },
        "date": 1762372722827,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "sample - array sorting - small",
            "value": 0.0136,
            "range": "0.3096",
            "unit": "ms",
            "extra": "73341 ops/sec"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "daniel@artemis-ai.ca",
            "name": "ArtemisAI",
            "username": "ArtemisAI"
          },
          "committer": {
            "email": "daniel@artemis-ai.ca",
            "name": "ArtemisAI",
            "username": "ArtemisAI"
          },
          "distinct": true,
          "id": "54b380b7e2818f3ed89748e193e68c7dba8ae8cf",
          "message": "Merge feat/core-features-bundle: Credential management + fixes\n\nFeatures added:\n- Credential management (4 working tools: create, get, schema, delete)\n- Removed non-existent API endpoints (list, update)\n- Fixed integration test configuration to use real n8n API\n- Updated branding and attribution for ArtemisAI fork\n\nAll builds passing, MCP server functional.",
          "timestamp": "2025-11-05T22:52:20-05:00",
          "tree_id": "36325c2231b2da8912120e03484989e787d40302",
          "url": "https://github.com/ArtemisAI/n8n-mcp/commit/54b380b7e2818f3ed89748e193e68c7dba8ae8cf"
        },
        "date": 1762402148291,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "sample - array sorting - small",
            "value": 0.0136,
            "range": "0.3096",
            "unit": "ms",
            "extra": "73341 ops/sec"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "daniel@artemis-ai.ca",
            "name": "ArtemisAI",
            "username": "ArtemisAI"
          },
          "committer": {
            "email": "daniel@artemis-ai.ca",
            "name": "ArtemisAI",
            "username": "ArtemisAI"
          },
          "distinct": true,
          "id": "cea9fcf54af41ba177ade0fb17ac414d58e01940",
          "message": "docs: update tracking to reflect Feature 006 (Tag Management) completion\n\n- Mark Phase 3 as 100% complete (1/1 features)\n- Update overall progress: 5/9 features complete (56%)\n- Add comprehensive testing results\n- Document all 6 tag tools verified and working\n- Update next milestone: Complete Feature 005 (User Management)",
          "timestamp": "2025-11-06T00:36:48-05:00",
          "tree_id": "bbcd06297e4be08bfaf51be35a72858bae13e6ac",
          "url": "https://github.com/ArtemisAI/n8n-mcp/commit/cea9fcf54af41ba177ade0fb17ac414d58e01940"
        },
        "date": 1762407511640,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "sample - array sorting - small",
            "value": 0.0136,
            "range": "0.3096",
            "unit": "ms",
            "extra": "73341 ops/sec"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "daniel@artemis-ai.ca",
            "name": "ArtemisAI",
            "username": "ArtemisAI"
          },
          "committer": {
            "email": "daniel@artemis-ai.ca",
            "name": "ArtemisAI",
            "username": "ArtemisAI"
          },
          "distinct": true,
          "id": "a0e4077034fa4b5eb23d39a32fe15396b9622ac5",
          "message": "docs: mark Feature 009 complete - 6/9 features ready for upstream PR",
          "timestamp": "2025-11-06T01:32:38-05:00",
          "tree_id": "62d9513dde69f4c98475af23743aa7402d4c8a5e",
          "url": "https://github.com/ArtemisAI/n8n-mcp/commit/a0e4077034fa4b5eb23d39a32fe15396b9622ac5"
        },
        "date": 1762410872741,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "sample - array sorting - small",
            "value": 0.0136,
            "range": "0.3096",
            "unit": "ms",
            "extra": "73341 ops/sec"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "daniel@artemis-ai.ca",
            "name": "ArtemisAI",
            "username": "ArtemisAI"
          },
          "committer": {
            "email": "daniel@artemis-ai.ca",
            "name": "ArtemisAI",
            "username": "ArtemisAI"
          },
          "distinct": true,
          "id": "3291ae8fcc749929baf7e2ed982f08b71d5d97e0",
          "message": "chore: use upstream database version",
          "timestamp": "2025-11-06T10:39:40-05:00",
          "tree_id": "32029e46e27339ab3df27994c5eb95e271d78121",
          "url": "https://github.com/ArtemisAI/n8n-mcp/commit/3291ae8fcc749929baf7e2ed982f08b71d5d97e0"
        },
        "date": 1762443692167,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "sample - array sorting - small",
            "value": 0.0136,
            "range": "0.3096",
            "unit": "ms",
            "extra": "73341 ops/sec"
          }
        ]
      }
    ]
  }
}