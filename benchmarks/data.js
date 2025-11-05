window.BENCHMARK_DATA = {
  "lastUpdate": 1762371611696,
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
      }
    ]
  }
}