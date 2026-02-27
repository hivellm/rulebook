---
name: "Grafana"
description: "Use MCP Grafana for metrics visualization, alerting, and observability dashboards."
version: "1.0.0"
category: "modules"
author: "Rulebook"
tags: ["modules", "mcp"]
dependencies: []
conflicts: []
---
<!-- GRAFANA:START -->
# Grafana MCP Instructions

**CRITICAL**: Use MCP Grafana for metrics visualization, alerting, and observability dashboards.

## Core Operations

### Dashboard Management
```typescript
// Get dashboard
grafana.dashboards.getDashboardByUid({ uid: 'dashboard-uid' })

// Create dashboard
grafana.dashboards.postDashboard({
  dashboard: {
    title: 'Application Metrics',
    tags: ['production', 'api'],
    timezone: 'browser',
    panels: [
      {
        title: 'Request Rate',
        type: 'graph',
        targets: [{ expr: 'rate(http_requests_total[5m])' }]
      }
    ]
  },
  overwrite: false
})

// Update dashboard
grafana.dashboards.postDashboard({
  dashboard: modifiedDashboard,
  overwrite: true
})

// Delete dashboard
grafana.dashboards.deleteDashboardByUid({ uid: 'dashboard-uid' })
```

### Data Sources
```typescript
// Get data sources
grafana.datasources.getDataSources()

// Add data source
grafana.datasources.addDataSource({
  name: 'Prometheus',
  type: 'prometheus',
  url: 'http://prometheus:9090',
  access: 'proxy',
  isDefault: true
})

// Query data source
grafana.datasources.queryDataSource({
  datasourceId: 1,
  from: Date.now() - 3600000,  // 1 hour ago
  to: Date.now(),
  queries: [
    { expr: 'up', refId: 'A' }
  ]
})
```

### Alerts
```typescript
// Get alerts
grafana.alerting.getAlerts({ state: 'alerting' })

// Create alert rule
grafana.alerting.postAlertRule({
  title: 'High Error Rate',
  condition: 'A',
  data: [
    {
      refId: 'A',
      queryType: '',
      relativeTimeRange: { from: 600, to: 0 },
      datasourceUid: 'prometheus-uid',
      model: {
        expr: 'rate(http_errors_total[5m]) > 0.05'
      }
    }
  ],
  noDataState: 'NoData',
  execErrState: 'Alerting',
  for: '5m',
  annotations: {
    description: 'Error rate exceeded 5%'
  },
  labels: { severity: 'high' }
})

// Pause alert
grafana.alerting.pauseAlertRule({ uid: 'alert-uid', paused: true })
```

### Annotations
```typescript
// Create annotation
grafana.annotations.postAnnotation({
  dashboardUid: 'dashboard-uid',
  time: Date.now(),
  timeEnd: Date.now(),
  tags: ['deployment'],
  text: 'Deployed version 1.2.0'
})

// Get annotations
grafana.annotations.getAnnotations({
  from: Date.now() - 86400000,  // Last 24h
  to: Date.now(),
  tags: ['deployment']
})
```

### Organizations & Users
```typescript
// Get organization
grafana.orgs.getOrgByName({ orgName: 'Main Org' })

// Add user
grafana.users.createUser({
  email: 'user@example.com',
  login: 'username',
  password: 'secure-password',
  name: 'User Name'
})

// Update user permissions
grafana.org.updateOrgUser({
  userId: 123,
  role: 'Editor'  // Viewer, Editor, Admin
})
```

## Common Patterns

### Deployment Tracking
```typescript
// Mark deployment on dashboard
await grafana.annotations.postAnnotation({
  time: Date.now(),
  tags: ['deployment', 'production'],
  text: `Deployed ${process.env.GIT_SHA}`,
  dashboardUid: 'main-dashboard'
})

// Create snapshot after deployment
const snapshot = await grafana.snapshots.createDashboardSnapshot({
  dashboard: dashboard,
  name: `Production Metrics - ${new Date().toISOString()}`,
  expires: 86400  // 24 hours
})
```

### Automated Dashboard Creation
```typescript
// Create dashboard for new service
async function createServiceDashboard(serviceName) {
  const dashboard = {
    title: `${serviceName} Metrics`,
    tags: ['microservices', serviceName],
    panels: [
      {
        title: 'Request Rate',
        type: 'graph',
        targets: [{
          expr: `rate(http_requests_total{service="${serviceName}"}[5m])`
        }]
      },
      {
        title: 'Error Rate',
        type: 'graph',
        targets: [{
          expr: `rate(http_errors_total{service="${serviceName}"}[5m])`
        }]
      },
      {
        title: 'Response Time (p95)',
        type: 'graph',
        targets: [{
          expr: `histogram_quantile(0.95, rate(http_duration_seconds_bucket{service="${serviceName}"}[5m]))`
        }]
      }
    ]
  }
  
  return await grafana.dashboards.postDashboard({
    dashboard,
    overwrite: false
  })
}
```

### Alert Management
```typescript
// Check for firing alerts
const alerts = await grafana.alerting.getAlerts({ state: 'alerting' })

if (alerts.length > 0) {
  console.log(`${alerts.length} alerts firing:`)
  
  for (const alert of alerts) {
    console.log(`- ${alert.labels.alertname}: ${alert.annotations.description}`)
    
    // Create incident ticket
    await jira.issues.createIssue({
      fields: {
        project: { key: 'OPS' },
        summary: `Alert: ${alert.labels.alertname}`,
        description: alert.annotations.description,
        issuetype: { name: 'Incident' },
        priority: { name: alert.labels.severity === 'critical' ? 'Highest' : 'High' }
      }
    })
  }
}
```

### Metrics Reporting
```typescript
// Generate daily metrics report
async function generateDailyReport() {
  const datasourceId = 1  // Prometheus
  const from = Date.now() - 86400000  // 24h ago
  const to = Date.now()
  
  // Query metrics
  const requestRate = await grafana.datasources.queryDataSource({
    datasourceId,
    from,
    to,
    queries: [{ expr: 'sum(rate(http_requests_total[24h]))', refId: 'A' }]
  })
  
  const errorRate = await grafana.datasources.queryDataSource({
    datasourceId,
    from,
    to,
    queries: [{ expr: 'sum(rate(http_errors_total[24h]))', refId: 'A' }]
  })
  
  // Create report
  const report = {
    date: new Date().toISOString(),
    totalRequests: requestRate.results.A.frames[0].data.values[1][0],
    totalErrors: errorRate.results.A.frames[0].data.values[1][0],
    errorPercentage: (totalErrors / totalRequests * 100).toFixed(2)
  }
  
  // Post to Confluence/Notion
  await notion.pages.create({
    parent: { database_id: reportsDbId },
    properties: {
      'Title': { title: [{ text: { content: `Daily Metrics - ${report.date}` } }] },
      'Requests': { number: report.totalRequests },
      'Errors': { number: report.totalErrors },
      'Error Rate': { number: parseFloat(report.errorPercentage) }
    }
  })
}
```

## Best Practices

✅ **DO:**
- Use dashboard folders for organization
- Tag dashboards appropriately
- Set up proper alert thresholds
- Use variables for flexibility
- Create snapshots before changes
- Document dashboard purpose
- Use templating for multi-instance dashboards

❌ **DON'T:**
- Create duplicate dashboards
- Set alerts without testing
- Ignore alert fatigue
- Hardcode dashboard IDs
- Skip dashboard backups
- Over-complicate queries

## Configuration

```json
{
  "mcpServers": {
    "grafana": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-grafana"],
      "env": {
        "GRAFANA_URL": "http://grafana:3000",
        "GRAFANA_API_KEY": "your-api-key",
        "GRAFANA_ORG_ID": "1"
      }
    }
  }
}
```

**Setup:**
1. Create API key: Configuration → API Keys → Add API key
2. Grant appropriate permissions (Admin for management, Viewer for read-only)
3. Store securely

## Integration with CI/CD

```typescript
// Add deployment annotation on successful deploy
if (deploymentSuccess) {
  await grafana.annotations.postAnnotation({
    time: Date.now(),
    tags: ['deployment', process.env.ENVIRONMENT],
    text: `Deployed ${process.env.GIT_SHA} to ${process.env.ENVIRONMENT}`,
    dashboardUid: process.env.GRAFANA_DASHBOARD_UID
  })
}

// Check alerts before deployment
const alerts = await grafana.alerting.getAlerts({ state: 'alerting' })
if (alerts.length > 0) {
  console.warn('⚠️  Active alerts detected. Deployment may be risky.')
}
```

<!-- GRAFANA:END -->

