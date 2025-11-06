# n8n-MCP Feature Development Roadmap

## Overview
This directory contains detailed specifications for implementing missing n8n API features in the MCP server. Each document provides comprehensive implementation guides including API endpoints, code changes, testing plans, and use cases.

## Priority Levels
- **CRUCIAL** ⚠️ : Essential functionality, blocking major use cases
- **HIGH** ⚡: Important features, significant value add
- **MEDIUM** 📊: Useful features, improves experience
- **LOW** 📝: Nice-to-have features

## Implementation Status

### ✅ Completed Features

| # | Feature | Priority | Complexity | Status | Branch | Notes |
|---|---------|----------|------------|--------|--------|-------|
| 001 | Workflow Activation | HIGH | Low | ✅ Complete | Merged to main | 2025-11-04 |
| 002 | Workflow Deactivation | HIGH | Low | ✅ Complete | Merged to main | 2025-11-04 |
| 003 | Retry Execution | HIGH | Low | ✅ Complete | Merged to main | Tested 2025-11-05 |
| 004 | Credential Management | CRUCIAL | High | ✅ Complete | Merged to main | 4 working tools, 2025-11-06 |
| 006 | Tag Management | MEDIUM | Low-Medium | ✅ Complete | Merged to main | 6 working tools, 2025-11-06 |
| 009 | Variable Management | MEDIUM | Low | ✅ Complete | Merged to main | 5 working tools, 2025-11-06 |

### 🔨 Pending Implementation

| # | Feature | Priority | Complexity | Est. Hours | Dependencies | Issue |
|---|---------|----------|------------|------------|--------------|-------|
| 005 | User Management | HIGH ⚡ | Medium | 6-8 | Multi-user instance | [#3](https://github.com/ArtemisAI/n8n-mcp/issues/3) |
| 010 | Source Control Pull | LOW 📝 | Low | 2-3 | Git integration | [#7](https://github.com/ArtemisAI/n8n-mcp/issues/7) |
| 011 | Project Management | LOW 📝 | Medium | 6-8 | Enterprise feature | [#6](https://github.com/ArtemisAI/n8n-mcp/issues/6) |

**Archived Features** (No API Endpoint Available):
- ~~007: Stop Running Execution~~ - No API endpoint exists for stopping executions
- ~~008: Execute Workflow Directly~~ - No API endpoint exists for direct workflow execution

**Upstream Tracking**: [czlonkowski/n8n-mcp#401](https://github.com/czlonkowski/n8n-mcp/issues/401) - General feature request for enhanced API coverage

## Feature Documents

### Core Execution Features
- **003-retry-execution.md** - Retry failed workflow executions
  - API: `POST /executions/{id}/retry`
  - Tools: `n8n_retry_execution`
  - Use case: Automated error recovery, resilient workflows
  - **Issue**: [ArtemisAI/n8n-mcp#1](https://github.com/ArtemisAI/n8n-mcp/issues/1)

### Security & Access Management
- **004-credential-management.md** - Full credential lifecycle (SECURITY-SENSITIVE)
  - API: `/credentials`, `/credentials/{id}`, `/credentials/schema/{type}`
  - Tools: `n8n_create_credential`, `n8n_list_credentials`, `n8n_get_credential_schema`, etc.
  - Use case: CI/CD credential provisioning, secret management
  - ⚠️ **Important**: Credential data is write-only for security
  - **Issue**: [ArtemisAI/n8n-mcp#2](https://github.com/ArtemisAI/n8n-mcp/issues/2)

- **005-user-management.md** - User and role management
  - API: `/users`, `/users/{id}`, `/users/{id}/role`
  - Tools: `n8n_create_user`, `n8n_list_users`, `n8n_change_user_role`, etc.
  - Use case: Automated user provisioning, RBAC management
  - **Issue**: [ArtemisAI/n8n-mcp#3](https://github.com/ArtemisAI/n8n-mcp/issues/3)

### Organization & Discovery
- **006-tag-management.md** - Workflow tagging and organization
  - API: `/tags`, `/tags/{id}`, `/workflows/{id}/tags`
  - Tools: `n8n_create_tag`, `n8n_update_workflow_tags`, etc.
  - Use case: Environment tagging, team organization, workflow discovery
  - **Issue**: [ArtemisAI/n8n-mcp#4](https://github.com/ArtemisAI/n8n-mcp/issues/4)

- **009-variable-management.md** - Environment variable management
  - API: `/variables`, `/variables/{id}`
  - Tools: `n8n_create_variable`, `n8n_list_variables`, etc.
  - Use case: Configuration management, environment-specific settings
  - **Issue**: [ArtemisAI/n8n-mcp#5](https://github.com/ArtemisAI/n8n-mcp/issues/5)

### Enterprise Features
- **010-source-control.md** - Git source control integration
  - API: `/source-control/pull`
  - Tools: `n8n_pull_from_source_control`
  - Use case: GitOps workflows, version control integration
  - **Issue**: [ArtemisAI/n8n-mcp#7](https://github.com/ArtemisAI/n8n-mcp/issues/7)

- **011-project-management.md** - Project and workspace management
  - API: `/projects`, `/projects/{id}`, `/projects/{id}/users`
  - Tools: `n8n_create_project`, `n8n_add_project_user`, etc.
  - Use case: Multi-tenant deployments, team isolation
  - **Issue**: [ArtemisAI/n8n-mcp#6](https://github.com/ArtemisAI/n8n-mcp/issues/6)

### Archived Features (No API Endpoint Available)
- ~~007-stop-running-execution.md~~ - No endpoint exists for stopping running executions
- ~~008-execute-workflow-directly.md~~ - No endpoint exists for direct workflow execution

## Development Workflow

### Collaborative Development Process
We're working as **collaborators** on the n8n-mcp project, implementing features incrementally:

1. **Pre-Implementation**: 
   - Create detailed feature specification in `n8n-mcp-feat-dev/`
   - Create tracking issue in fork ([ArtemisAI/n8n-mcp Issues](https://github.com/ArtemisAI/n8n-mcp/issues))
   - Create clean feature branch from latest upstream main
   - Security scan: No secrets, API keys, or internal URLs in documentation

2. **Implementation via Copilot Agent**:
   - Send feature specification to GitHub Copilot coding agent
   - Agent implements code following documented patterns
   - Agent creates PR in our fork for review

3. **Testing & Validation**:
   - Review agent's implementation code
   - Build and test locally (`npm run build`)
   - Test new tool(s) with MCP client
   - **Regression testing**: Verify existing tools still work
   - Integration test with real n8n instance

4. **Fork Integration**:
   - If tests pass: Merge to fork's main branch
   - Update feature document with completion status
   - Document any lessons learned

5. **Upstream Contribution**:
   - If compatible with upstream: Create PR to `czlonkowski/n8n-mcp`
   - Reference upstream issue (e.g., #401)
   - Update fork issue with PR link
   - Respond to maintainer feedback

6. **Documentation**:
   - Update this README with completion status
   - Create postmortem document (NNN-feature-name.md)
   - Share learnings with community

### Current Implementation: User Management (#005)
- **Target**: Complete features 004-006 before upstream PR
- **Branch Strategy**: Work on feat/next-features, merge to main when complete
- **PR Strategy**: Single comprehensive PR with all completed features
- **Status**: 4/6 core features complete (67%)

## Upstream Contribution Strategy

### Milestone: Feature Bundle PR (Target: 6 Core Features)

**Goal**: Create a single, comprehensive PR to upstream with multiple high-value features

**Completed (3/6):**
- ✅ 001: Workflow Activation
- ✅ 002: Workflow Deactivation  
- ✅ 003: Retry Execution

**In Progress (0/3):**
- ⏳ 004: Credential Management (CRUCIAL - Security review needed)
- ⏳ 005: User Management (HIGH priority)
- ⏳ 006: Tag Management (MEDIUM priority)

**PR Timeline:**
1. **Phase 1** (Complete): Execution control features (001-003) ✅
2. **Phase 2** (Next): Credential & User Management (004-005)
3. **Phase 3** (Final): Tag Management & Polish (006)
4. **Phase 4**: Create comprehensive upstream PR

**PR Benefits:**
- Demonstrates consistent code quality across multiple features
- Shows comprehensive API coverage improvement
- Reduces maintainer review overhead (one large PR vs many small)
- Establishes credibility as a reliable contributor

**PR Preparation Checklist:**
- [ ] All 6 features tested individually
- [ ] All features tested together (integration)
- [ ] Comprehensive regression testing
- [ ] Documentation complete for all features
- [ ] CHANGELOG.md updated
- [ ] No secrets or internal URLs in any code
- [ ] All TypeScript strict mode compliant
- [ ] Consistent error handling patterns
- [ ] User-facing messages reviewed

**Current Status**: 50% complete (3/6 features)

---

## Implementation Guidelines

### Code Structure Pattern
Each feature follows this consistent structure across 4 files:

1. **src/services/n8n-api-client.ts**
   - Add TypeScript interfaces
   - Add API client methods
   - Follow existing error handling patterns

2. **src/mcp/tools-n8n-manager.ts**
   - Define tool schemas with JSON Schema
   - Export tool definitions
   - Add to tools array

3. **src/mcp/handlers-n8n-manager.ts**
   - Implement handler functions
   - Use Zod for validation
   - Return consistent ToolResponse format
   - Update LIMITATIONS array if needed

4. **src/mcp/server.ts**
   - Add validation routing
   - Add handler routing
   - Follow existing switch case patterns

### Build & Test Process
```bash
# 1. Implement changes (via Copilot agent or manual)

# 2. Build TypeScript
npm run build

# 3. Restart MCP server (if using local build)
# Point VS Code MCP config to: C:\...\dist\mcp\index.js

# 4. Test new tools
# Use MCP client to verify:
# - Tool appears in list
# - Parameters validate correctly
# - API calls succeed
# - Error handling works
# - Response format is correct

# 5. Regression testing
# Verify existing tools still work:
# - n8n_list_workflows
# - n8n_get_workflow
# - n8n_activate_workflow
# - n8n_list_executions
# etc.
```

### Git Workflow
```bash
# PREPARATION (before Copilot agent work)
# 1. Ensure main is synced with upstream
git checkout main
git pull upstream main
git push origin main

# 2. Create clean feature branch
git checkout -b feat/feature-name

# 3. Security check: Scan for secrets
# Verify no API keys, tokens, internal URLs in docs

# IMPLEMENTATION (by Copilot agent)
# Agent will make changes and commit

# POST-IMPLEMENTATION (testing & validation)
# 4. Review agent's changes
git diff main

# 5. Test locally (see Build & Test Process above)

# 6. If tests pass, push to fork
git push origin feat/feature-name

# 7. Create PR to fork for review
# URL: https://github.com/ArtemisAI/n8n-mcp/compare/main...feat/feature-name

# UPSTREAM CONTRIBUTION (if compatible)
# 8. Create PR to upstream
# URL: https://github.com/czlonkowski/n8n-mcp/compare/main...ArtemisAI:n8n-mcp:feat/feature-name

# 9. Update tracking issues with PR links
```

## Recommended Implementation Order

### Phase 1: Quick Wins (Week 1)
1. **003-retry-execution** - Low complexity, high value
2. **007-variable-management** - Simple CRUD, useful for config

### Phase 2: Core Features (Week 2-3)
3. **006-tag-management** - Medium complexity, organizational value
4. **004-credential-management** - High complexity but CRUCIAL
   - ⚠️ Requires security review
   - ⚠️ Handle sensitive data carefully

### Phase 3: Advanced Features (Week 4-5)
5. **005-user-management** - Multi-user scenarios
6. **009-source-control** - GitOps integration

### Phase 4: Enterprise Features (Optional)
7. **008-project-management** - Enterprise deployments only
8. **010-audit-generation** - Compliance scenarios

## Testing Strategy

### Unit Tests
- Add to `tests/` directory
- Test each handler function
- Mock API responses
- Verify error handling

### Integration Tests
- Test against real n8n instance
- Verify complete workflows
- Test error scenarios
- Validate data persistence

### MCP Tool Tests
- Use MCP client directly
- Test from VS Code with MCP extension
- Verify tool discovery
- Test parameter validation

## Success Metrics

### Per-Feature Criteria
- [ ] Tool appears in `n8n_list_available_tools`
- [ ] TypeScript compiles without errors
- [ ] All API endpoints tested
- [ ] Error handling comprehensive
- [ ] Documentation complete
- [ ] Integration test passes

### Overall Project Goals
- [ ] 95%+ API coverage for crucial features
- [ ] All CRUD operations supported
- [ ] Consistent error handling
- [ ] Security best practices followed
- [ ] Performance acceptable (<500ms for most operations)

## Documentation Conventions

### File Naming
- `NNN-feature-name.md` (e.g., `003-retry-execution.md`)
- Completed features marked with postmortem notation
- Sequential numbering for chronological tracking

### Document Structure
Each feature doc contains:
1. **Status & Priority**: Current state and importance
2. **Problem Statement**: Why this feature is needed
3. **API Endpoints**: Complete endpoint documentation
4. **Implementation Details**: Exact code changes needed
5. **Testing Plan**: How to verify it works
6. **Use Cases**: Real-world scenarios
7. **Success Criteria**: Definition of done

## Related Resources

### External Documentation
- n8n API Docs: `https://docs.n8n.io/api/`
- n8n API Swagger: `https://n8n.dan-ai.pro/api/v1/docs`
- MCP Protocol: Model Context Protocol specification

### Internal Documentation
- `docs/n8n_API/coverage_analysis.md` - API coverage matrix
- `docs/n8n_API/swagger-ui-init.js` - Complete API spec
- `.mcp/n8n-mcp/README.md` - MCP server documentation

### Development Tools
- Local n8n instance: `https://n8n.dan-ai.pro`
- MCP server build: `C:\Users\Laptop\Desktop\Projects\n8n\.mcp\n8n-mcp\`
- VS Code MCP config: `.vscode/mcp.json`

## Contributing

### Before Starting Implementation
1. Read the feature document completely
2. Understand the API endpoints
3. Review similar existing implementations
4. Create backup files (.bak extension)
5. Create feature branch

### During Implementation
1. Follow code patterns from existing features
2. Use TypeScript strictly
3. Add comprehensive error handling
4. Write clear user-facing messages
5. Update documentation as you go

### After Implementation
1. Build and test locally
2. Update limitations list if needed
3. Write tests
4. Create PR with clear description
5. Update this roadmap with status

## Questions & Support

### Common Issues
- **TypeScript errors**: Check interface imports
- **API 404**: Verify endpoint in swagger docs
- **Tool not appearing**: Check tool registration in server.ts
- **MCP not loading**: Restart VS Code, check mcp.json path

### Getting Help
- Review completed features (001, 002) as examples
- Check n8n API documentation
- Test endpoints with curl first
- Ask in n8n community if API unclear

## License & Attribution
- Original n8n-mcp: czlonkowski/n8n-mcp
- Fork: ArtemisAI/n8n-mcp
- License: Follow n8n-mcp license terms

## Issue Tracking

### Fork Issues (Detailed Implementation Tracking)
All features tracked with detailed specifications in [ArtemisAI/n8n-mcp Issues](https://github.com/ArtemisAI/n8n-mcp/issues):

| Feature | Issue | Status | Priority |
|---------|-------|--------|----------|
| Retry Execution | [#1](https://github.com/ArtemisAI/n8n-mcp/issues/1) | Open | HIGH ⚡ |
| Credential Management | [#2](https://github.com/ArtemisAI/n8n-mcp/issues/2) | Open | CRUCIAL ⚠️ |
| User Management | [#3](https://github.com/ArtemisAI/n8n-mcp/issues/3) | Open | HIGH ⚡ |
| Tag Management | [#4](https://github.com/ArtemisAI/n8n-mcp/issues/4) | Open | MEDIUM 📊 |
| Variable Management | [#5](https://github.com/ArtemisAI/n8n-mcp/issues/5) | Open | MEDIUM 📊 |
| Project Management | [#6](https://github.com/ArtemisAI/n8n-mcp/issues/6) | Open | LOW 📝 |
| Source Control | [#7](https://github.com/ArtemisAI/n8n-mcp/issues/7) | Open | LOW 📝 |
| Audit Generation | [#8](https://github.com/ArtemisAI/n8n-mcp/issues/8) | Open | LOW 📝 |

### Upstream Feature Request
General feature request for enhanced API coverage: [czlonkowski/n8n-mcp#401](https://github.com/czlonkowski/n8n-mcp/issues/401)

This consolidates all proposed features into a single upstream issue for maintainer visibility and community discussion.

### Issue Labels
- `enhancement` - New feature or capability
- `security` - Security-sensitive features requiring review
- `documentation` - Requires documentation creation
- `enterprise` - Enterprise/Pro features

### Contributing Workflow
1. Check fork issues for detailed implementation specs
2. Create feature branch: `git checkout -b feat/feature-name`
3. Implement following documented patterns
4. Reference issue in commit: `feat: add feature-name (#N)`
5. Create PR to fork first for testing
6. After validation, create PR to upstream
7. Link to upstream issue #401 in PR description
