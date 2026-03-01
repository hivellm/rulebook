<!-- HELM:START -->
# Helm Instructions

**CRITICAL**: Follow these Helm best practices for Kubernetes package management.

## Chart Structure

```
charts/<name>/
├── Chart.yaml          # Chart metadata (required)
├── values.yaml         # Default values (required)
├── templates/          # Kubernetes manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── hpa.yaml
│   ├── _helpers.tpl    # Template helpers
│   ├── NOTES.txt       # Post-install notes
│   └── tests/
│       └── test-connection.yaml
├── charts/             # Chart dependencies
└── .helmignore         # Files to exclude from packaging
```

## Chart.yaml Requirements

```yaml
apiVersion: v2
name: my-app
description: A Helm chart for my application
type: application
version: 1.0.0        # Chart version (bump on every change)
appVersion: "1.0.0"   # Application version (keep in sync)
maintainers:
  - name: team-name
    email: team@example.com
dependencies:
  - name: postgresql
    version: "12.x.x"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
```

## values.yaml Requirements

- Document every value with a comment
- Set sensible production defaults
- Never hardcode image tags

```yaml
# -- Number of replicas
replicaCount: 3

image:
  # -- Container image repository
  repository: my-registry/my-app
  # -- Image pull policy
  pullPolicy: IfNotPresent
  # -- Image tag (defaults to chart appVersion)
  tag: ""

# -- Resource requests and limits
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"

# -- Enable/disable autoscaling
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80

# -- Service configuration
service:
  type: ClusterIP
  port: 80

# -- Ingress configuration
ingress:
  enabled: false
  className: ""
  annotations: {}
  hosts:
    - host: my-app.example.com
      paths:
        - path: /
          pathType: ImplementationSpecific
```

## Template Best Practices

### _helpers.tpl
Define reusable template fragments:
```yaml
{{- define "chart.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "chart.labels" -}}
helm.sh/chart: {{ include "chart.chart" . }}
app.kubernetes.io/name: {{ include "chart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "chart.selectorLabels" -}}
app.kubernetes.io/name: {{ include "chart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

### Template Patterns
- Use `{{ include "chart.fullname" . }}` for consistent naming
- Always add labels: `{{ include "chart.labels" . | nindent 4 }}`
- Use `{{ .Values.x | default "fallback" }}` for optional values
- Use `{{- with .Values.x }}` blocks for conditional sections
- Quote all string values: `{{ .Values.image.tag | quote }}`

## Versioning

- Bump `Chart.yaml` version on every change (semver: MAJOR.MINOR.PATCH)
- Keep `appVersion` in sync with the application version
- Use `helm dependency update` after changing dependencies
- Tag releases in version control matching chart version

## Linting and Validation

Run these checks before every commit:
```bash
# Lint the chart
helm lint charts/my-app/

# Render templates locally
helm template my-release charts/my-app/ --values values-dev.yaml

# Validate rendered templates
helm template my-release charts/my-app/ | kubeval --strict

# Dry-run against cluster
helm install my-release charts/my-app/ --dry-run --debug
```

## Common Patterns

### Environment-Specific Values
```bash
# Development
helm install my-app charts/my-app/ -f values-dev.yaml

# Staging
helm install my-app charts/my-app/ -f values-staging.yaml

# Production
helm install my-app charts/my-app/ -f values-prod.yaml
```

### Secrets Management
```yaml
# Use external-secrets or sealed-secrets
# Never store plaintext secrets in values.yaml
externalSecrets:
  enabled: true
  secretStore: aws-secrets-manager
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: /myapp/database-url
```

## Best Practices

- Use `helm create` to scaffold new charts with best-practice defaults
- Include chart tests in `templates/tests/`
- Document all values in `values.yaml` with comments
- Use `.helmignore` to exclude development files from chart packages
- Pin dependency versions (avoid `*` or floating ranges)
- Use `helm diff` plugin to preview changes before upgrading
- Store charts in a Helm repository (ChartMuseum, Harbor, OCI registry)
- Run `helm lint` in CI/CD pipeline

<!-- HELM:END -->
