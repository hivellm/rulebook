<!-- KUBERNETES:START -->
# Kubernetes Instructions

**CRITICAL**: Follow these Kubernetes best practices for all cluster deployments.

## Resource Requirements

ALL Deployments MUST define resource requests and limits:
```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

Omitting resource limits causes unbounded resource consumption and can destabilize the cluster.

## Health Probes

ALL Deployments MUST define both readiness and liveness probes:
```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 3
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 20
  failureThreshold: 3
```

### Probe Guidelines
- **readinessProbe**: Gates traffic to the pod. Use a lightweight endpoint
- **livenessProbe**: Restarts the pod if unhealthy. Set `initialDelaySeconds` high enough for startup
- Consider a **startupProbe** for slow-starting applications

## Security Context

ALL Pods MUST define a security context:
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 1000
  fsGroup: 1000
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL
```

### Pod Security Standards
- Apply `restricted` Pod Security Standard where possible
- Never run containers as root
- Drop all Linux capabilities unless explicitly required

## Namespace

- Use explicit namespaces for all resources (never use `default`)
- Apply least-privilege RBAC per namespace
- Use `ResourceQuota` and `LimitRange` per namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-app
  labels:
    pod-security.kubernetes.io/enforce: restricted
```

## Secrets Management

- NEVER put secrets in YAML files committed to git
- Use Kubernetes Secrets or external secret managers:
  - HashiCorp Vault
  - AWS Secrets Manager / SSM Parameter Store
  - Azure Key Vault
  - Google Secret Manager
- Use `ExternalSecret` CRD or `sealed-secrets` for GitOps workflows

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: my-app
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@host:5432/db"
```

## Deployment Pattern

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
  labels:
    app: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: my-app
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      containers:
        - name: my-app
          image: my-registry/my-app:1.0.0
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
          envFrom:
            - secretRef:
                name: app-secrets
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 20
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
```

## Service Pattern

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: my-app
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 3000
      protocol: TCP
  type: ClusterIP
```

## Labels and Annotations

Apply consistent labels to all resources:
```yaml
metadata:
  labels:
    app.kubernetes.io/name: my-app
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/component: backend
    app.kubernetes.io/managed-by: helm
```

## Best Practices

- Use `RollingUpdate` strategy with `maxUnavailable: 0` for zero-downtime deploys
- Set `PodDisruptionBudget` for high-availability workloads
- Use `HorizontalPodAutoscaler` for auto-scaling
- Pin container image tags (never use `latest`)
- Use `NetworkPolicy` to restrict pod-to-pod communication
- Store configuration in `ConfigMap`, secrets in `Secret`
- Use `topologySpreadConstraints` for multi-zone distribution

<!-- KUBERNETES:END -->
