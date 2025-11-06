# Credential Management Quick Reference

## 🔑 New MCP Tools (6 Total)

### 1. Create Credential
```javascript
n8n_create_credential({
  name: "My API Key",
  type: "httpHeaderAuth",
  data: {
    name: "X-API-Key",
    value: "secret-123"
  }
})
```
**Returns:** `{ id, name, type, createdAt }`  
**Security:** ⚠️ Data is write-only, never returned

---

### 2. Get Credential
```javascript
n8n_get_credential({
  id: "credential-id"
})
```
**Returns:** `{ id, name, type, createdAt, updatedAt }`  
**Security:** ✅ No sensitive data included

---

### 3. List Credentials
```javascript
// All credentials
n8n_list_credentials({})

// Filter by type
n8n_list_credentials({
  type: "httpBasicAuth"
})
```
**Returns:** `{ credentials: [...], count: N }`  
**Security:** ✅ Metadata only

---

### 4. Delete Credential
```javascript
n8n_delete_credential({
  id: "credential-id"
})
```
**Returns:** `{ id, name, deleted: true }`  
**Warning:** ⚠️ Breaks workflows using this credential

---

### 5. Get Credential Schema
```javascript
n8n_get_credential_schema({
  credentialTypeName: "gmailOAuth2Api"
})
```
**Returns:** Schema with field definitions  
**Use Case:** Dynamic form building

---

### 6. Update Credential
```javascript
n8n_update_credential({
  id: "credential-id",
  name: "New Name"
})
```
**Returns:** Updated credential metadata  
**Note:** ℹ️ Can only update name, not data

---

## 🎯 Common Patterns

### Pattern: Safe Credential Creation
```javascript
// 1. Get schema first
const schema = await n8n_get_credential_schema({
  credentialTypeName: "httpBasicAuth"
});

// 2. Validate required fields
const requiredFields = schema.properties
  .filter(p => p.required)
  .map(p => p.name);

// 3. Create credential
const result = await n8n_create_credential({
  name: "My HTTP Auth",
  type: "httpBasicAuth",
  data: {
    user: "myuser",
    password: process.env.PASSWORD
  }
});

console.log(`Created: ${result.id}`);
```

### Pattern: Credential Audit
```javascript
// Find all credentials of specific type
const apiKeys = await n8n_list_credentials({
  type: "httpHeaderAuth"
});

console.log(`Found ${apiKeys.count} API key credentials`);

// List all credential types in use
const allCreds = await n8n_list_credentials({});
const types = [...new Set(allCreds.credentials.map(c => c.type))];
console.log("Types in use:", types);
```

### Pattern: Safe Deletion
```javascript
// 1. Check what will be affected
const cred = await n8n_get_credential({ id: "cred-123" });
console.log(`About to delete: ${cred.name} (${cred.type})`);

// 2. Optional: List workflows to check usage
const workflows = await n8n_list_workflows({});
const usingCred = workflows.data.filter(wf =>
  JSON.stringify(wf.nodes).includes(cred.id)
);

if (usingCred.length > 0) {
  console.warn(`⚠️  ${usingCred.length} workflows use this credential`);
}

// 3. Delete if safe
const result = await n8n_delete_credential({ id: "cred-123" });
```

### Pattern: Credential Rotation
```javascript
// 1. Create new credential
const newCred = await n8n_create_credential({
  name: "API Key v2",
  type: "httpHeaderAuth",
  data: { name: "X-API-Key", value: newKey }
});

// 2. Update workflows to use new credential
// (workflow update code here)

// 3. Delete old credential
await n8n_delete_credential({ id: oldCredId });
```

---

## 🚦 Error Handling

### Common Errors

**Invalid Credential Type**
```javascript
try {
  await n8n_create_credential({
    name: "Test",
    type: "invalid-type",
    data: {}
  });
} catch (error) {
  // Error: Unknown credential type
}
```

**Missing Required Fields**
```javascript
try {
  await n8n_create_credential({
    name: "Test",
    type: "httpBasicAuth",
    data: { user: "test" } // Missing 'password'
  });
} catch (error) {
  // Error: Invalid credential data
}
```

**Credential Not Found**
```javascript
try {
  await n8n_get_credential({ id: "nonexistent" });
} catch (error) {
  // Error: Credential not found
}
```

---

## 🔒 Security Checklist

### ✅ DO
- Get credential from environment variables or secret manager
- Use `n8n_get_credential_schema` to validate structure
- Delete credentials when no longer needed
- Update credential names for clarity
- Filter credentials by type for auditing

### ❌ DON'T
- Store credentials in code or version control
- Log credential data
- Share credential IDs in public channels
- Delete credentials without checking workflow usage
- Attempt to retrieve credential data (it's not possible)

---

## 📊 Credential Types Reference

Common credential types you can use:

| Type | Description | Common Uses |
|------|-------------|-------------|
| `httpBasicAuth` | HTTP Basic Auth | REST APIs |
| `httpHeaderAuth` | HTTP Header Auth | API Keys |
| `httpDigestAuth` | HTTP Digest Auth | Legacy APIs |
| `oauth2Api` | Generic OAuth2 | Third-party services |
| `gmailOAuth2Api` | Gmail OAuth2 | Email automation |
| `slackOAuth2Api` | Slack OAuth2 | Slack integrations |
| `postgresDb` | PostgreSQL | Database connections |
| `mysqlDb` | MySQL | Database connections |

**Note:** Use `n8n_get_credential_schema` to see available fields for any type.

---

## 🎓 Real-World Examples

### Example 1: Automated Environment Setup
```javascript
async function setupEnvironment(env) {
  const credentials = {
    production: [
      { name: "Prod API", type: "httpHeaderAuth", data: {...} },
      { name: "Prod DB", type: "postgresDb", data: {...} }
    ],
    staging: [
      { name: "Stage API", type: "httpHeaderAuth", data: {...} },
      { name: "Stage DB", type: "postgresDb", data: {...} }
    ]
  };

  for (const cred of credentials[env]) {
    const result = await n8n_create_credential(cred);
    console.log(`✓ Created ${result.name}`);
  }
}
```

### Example 2: Credential Inventory Report
```javascript
async function generateCredentialReport() {
  const creds = await n8n_list_credentials({});
  
  const report = {
    total: creds.count,
    byType: {},
    oldest: null,
    newest: null
  };
  
  for (const cred of creds.credentials) {
    // Count by type
    report.byType[cred.type] = (report.byType[cred.type] || 0) + 1;
    
    // Track dates
    const createdAt = new Date(cred.createdAt);
    if (!report.oldest || createdAt < new Date(report.oldest.createdAt)) {
      report.oldest = cred;
    }
    if (!report.newest || createdAt > new Date(report.newest.createdAt)) {
      report.newest = cred;
    }
  }
  
  return report;
}
```

### Example 3: Credential Migration
```javascript
async function migrateCredentials(oldType, newType, transform) {
  // 1. Get all credentials of old type
  const oldCreds = await n8n_list_credentials({ type: oldType });
  
  // 2. Get schema for new type
  const newSchema = await n8n_get_credential_schema({
    credentialTypeName: newType
  });
  
  // 3. Create new credentials
  for (const oldCred of oldCreds.credentials) {
    const newData = transform(oldCred, newSchema);
    
    const newCred = await n8n_create_credential({
      name: `${oldCred.name} (migrated)`,
      type: newType,
      data: newData
    });
    
    console.log(`Migrated ${oldCred.name} → ${newCred.id}`);
  }
}
```

---

## 💡 Tips & Tricks

1. **Always get the schema first** - Ensures you provide correct fields
2. **Use descriptive names** - Makes credentials easier to manage
3. **Filter when listing** - Speeds up searches in large installations
4. **Check workflows before deleting** - Prevents breaking production
5. **Use environment variables** - Never hardcode credential data
6. **Audit regularly** - Find and remove unused credentials

---

## 🐛 Troubleshooting

**Problem:** "Invalid credential data"  
**Solution:** Get the schema and verify all required fields are provided

**Problem:** "Credential not found"  
**Solution:** List credentials to verify the ID exists

**Problem:** Can't retrieve credential password  
**Solution:** This is by design - credentials are write-only for security

**Problem:** Workflow fails after credential update  
**Solution:** Credential data can't be updated, only the name. Create new credential instead.

---

**Quick Reference Version:** 1.0  
**Last Updated:** November 5, 2025  
**Conceived by:** Romuald Członkowski - https://www.aiadvisors.pl/en
