# Variable Management Quick Reference

## 📦 New MCP Tools (5 Total)

### 1. Create Variable
```javascript
n8n_create_variable({
  key: "myVariable",
  value: "myValue",
  projectId: "optional-project-id"  // Enterprise feature
})
```
**Returns:** `{ id, key, value, type }`  
**Use Case:** Store reusable data across workflows

---

### 2. List Variables
```javascript
// All variables
n8n_list_variables({})

// With pagination
n8n_list_variables({
  limit: 50,
  cursor: "next-cursor-token"
})

// Filter by project (Enterprise)
n8n_list_variables({
  projectId: "project-123"
})

// Filter by state
n8n_list_variables({
  state: "active"  // or "inactive"
})
```
**Returns:** `{ variables: [...], returned: N, nextCursor, hasMore }`  
**Pagination:** Use `nextCursor` for next page

---

### 3. Get Variable
```javascript
n8n_get_variable({
  id: "variable-id"
})
```
**Returns:** `{ id, key, value, type, projectId? }`  
**Use Case:** Retrieve specific variable details

---

### 4. Update Variable
```javascript
// Update value only
n8n_update_variable({
  id: "variable-id",
  value: "newValue"
})

// Update key only
n8n_update_variable({
  id: "variable-id",
  key: "newVariableName"
})

// Update both
n8n_update_variable({
  id: "variable-id",
  key: "newName",
  value: "newValue"
})
```
**Returns:** `{ id, key, value, type }`  
**Note:** Workflows using this variable will use updated value

---

### 5. Delete Variable
```javascript
n8n_delete_variable({
  id: "variable-id"
})
```
**Returns:** `{ id, key, deleted: true }`  
**Warning:** ⚠️ Workflows using this variable may fail

---

## 🎯 Common Patterns

### Pattern 1: Create and Use Variable
```javascript
// 1. Create variable
const result = n8n_create_variable({
  key: "API_ENDPOINT",
  value: "https://api.example.com"
})

// 2. Reference in workflow
// Use {{$vars.API_ENDPOINT}} in n8n workflow nodes
```

### Pattern 2: List and Filter
```javascript
// Get all variables
const all = n8n_list_variables({ limit: 100 })

// Filter by project
const projectVars = n8n_list_variables({
  projectId: "prod-project-123"
})
```

### Pattern 3: Update Configuration
```javascript
// Get current value
const variable = n8n_get_variable({ id: "var-123" })

// Update to new value
n8n_update_variable({
  id: "var-123",
  value: "updated-config-value"
})
```

### Pattern 4: Cleanup Unused Variables
```javascript
// 1. List all variables
const all = n8n_list_variables({})

// 2. Delete specific variable
n8n_delete_variable({ id: "var-to-remove" })
```

---

## 🔐 Security Notes

1. **Environment-Specific Values**: Use variables for environment-specific configs (dev/staging/prod)
2. **Sensitive Data**: Variables are stored in n8n's database - consider using credentials for highly sensitive data
3. **Access Control**: Variables respect n8n's project-based access control (Enterprise)

---

## 📝 Workflow Integration

Variables can be accessed in n8n workflows using the `$vars` object:

```javascript
// In any n8n node expression
{{$vars.myVariable}}

// Check if variable exists
{{$vars.myVariable ?? 'default-value'}}

// Use in HTTP Request node
{
  "url": "{{$vars.API_ENDPOINT}}/users",
  "headers": {
    "Authorization": "Bearer {{$vars.API_TOKEN}}"
  }
}
```

---

## ⚠️ Important Considerations

1. **Workflow Dependencies**: Always verify workflows aren't using a variable before deletion
2. **Naming Convention**: Use clear, descriptive names (e.g., `API_ENDPOINT` not `x`)
3. **Type Limitation**: Currently only string type is supported
4. **Update Impact**: Updating a variable affects all workflows immediately
5. **Pagination**: Large variable sets require cursor-based pagination

---

## 🚀 Best Practices

### ✅ DO
- Use descriptive variable names (`DB_CONNECTION_STRING`)
- Document variable purpose in external docs
- Test workflow after variable changes
- Use variables for configuration values
- Implement naming conventions across team

### ❌ DON'T
- Store highly sensitive data (use credentials instead)
- Use generic names (`var1`, `temp`)
- Delete variables without checking workflow usage
- Create duplicate variables with similar names

---

## 🔄 Migration from Hardcoded Values

```javascript
// BEFORE: Hardcoded in workflow
{
  "url": "https://api.example.com/data"
}

// AFTER: Using variable
// 1. Create variable
n8n_create_variable({
  key: "API_BASE_URL",
  value: "https://api.example.com"
})

// 2. Update workflow
{
  "url": "{{$vars.API_BASE_URL}}/data"
}
```

---

## 📊 Enterprise Features

### Project Isolation
```javascript
// Create variable for specific project
n8n_create_variable({
  key: "TEAM_A_CONFIG",
  value: "team-a-value",
  projectId: "team-a-project-id"
})

// List project-specific variables
n8n_list_variables({
  projectId: "team-a-project-id"
})
```

---

## 🆘 Troubleshooting

### Variable Not Found
```javascript
// Check if variable exists
const vars = n8n_list_variables({})
const exists = vars.variables.find(v => v.key === "MY_VAR")

if (!exists) {
  // Create it
  n8n_create_variable({
    key: "MY_VAR",
    value: "default-value"
  })
}
```

### Workflow Breaking After Variable Change
```javascript
// 1. Get variable
const old = n8n_get_variable({ id: "var-123" })
console.log("Old value:", old.value)

// 2. Update carefully
n8n_update_variable({
  id: "var-123",
  value: "new-value"
})

// 3. Test workflow immediately
// Use n8n_trigger_webhook_workflow or manual test
```

---

## 📚 Additional Resources

- [n8n Variables Documentation](https://docs.n8n.io/workflows/variables/)
- [n8n API Reference](https://docs.n8n.io/api/)
- [Environment Variables vs n8n Variables](https://docs.n8n.io/hosting/environment-variables/)

---

**Version:** Added in n8n-mcp v2.23.0  
**API Endpoints:** `/variables`  
**Requires:** n8n API v1+ with variables feature

Conceived by Romuald Członkowski - [AI Advisors](https://www.aiadvisors.pl/en)
