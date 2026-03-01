import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectProject } from '../src/core/detector';
import { generateServiceRules } from '../src/core/generator';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('Docker and Kubernetes detection', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-docker-k8s-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Docker detection', () => {
    it('should detect Docker when Dockerfile exists', async () => {
      await fs.writeFile(path.join(testDir, 'Dockerfile'), 'FROM node:20-alpine\n');

      const result = await detectProject(testDir);

      const dockerService = result.services.find((s) => s.service === 'docker');
      expect(dockerService).toBeDefined();
      expect(dockerService!.detected).toBe(true);
      expect(dockerService!.confidence).toBeGreaterThanOrEqual(0.9);
      expect(dockerService!.indicators).toContain('Dockerfile');
    });

    it('should detect Docker when .dockerignore exists', async () => {
      await fs.writeFile(path.join(testDir, '.dockerignore'), 'node_modules\n.git\n');

      const result = await detectProject(testDir);

      const dockerService = result.services.find((s) => s.service === 'docker');
      expect(dockerService).toBeDefined();
      expect(dockerService!.detected).toBe(true);
      expect(dockerService!.indicators).toContain('.dockerignore');
    });

    it('should include both indicators when Dockerfile and .dockerignore exist', async () => {
      await fs.writeFile(path.join(testDir, 'Dockerfile'), 'FROM node:20-alpine\n');
      await fs.writeFile(path.join(testDir, '.dockerignore'), 'node_modules\n');

      const result = await detectProject(testDir);

      const dockerService = result.services.find((s) => s.service === 'docker');
      expect(dockerService).toBeDefined();
      expect(dockerService!.detected).toBe(true);
      expect(dockerService!.indicators).toContain('Dockerfile');
      expect(dockerService!.indicators).toContain('.dockerignore');
    });
  });

  describe('Docker Compose detection', () => {
    it('should detect docker-compose.yml', async () => {
      await fs.writeFile(
        path.join(testDir, 'docker-compose.yml'),
        'services:\n  app:\n    build: .\n'
      );

      const result = await detectProject(testDir);

      const composeService = result.services.find((s) => s.service === 'docker-compose');
      expect(composeService).toBeDefined();
      expect(composeService!.detected).toBe(true);
      expect(composeService!.confidence).toBeGreaterThanOrEqual(0.9);
      expect(composeService!.indicators).toContain('docker-compose.yml');
    });

    it('should detect docker-compose.yaml', async () => {
      await fs.writeFile(
        path.join(testDir, 'docker-compose.yaml'),
        'services:\n  app:\n    build: .\n'
      );

      const result = await detectProject(testDir);

      const composeService = result.services.find((s) => s.service === 'docker-compose');
      expect(composeService).toBeDefined();
      expect(composeService!.detected).toBe(true);
      expect(composeService!.indicators).toContain('docker-compose.yaml');
    });
  });

  describe('Kubernetes detection', () => {
    it('should detect k8s/ directory', async () => {
      await fs.mkdir(path.join(testDir, 'k8s'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'k8s', 'deployment.yaml'), 'apiVersion: apps/v1\n');

      const result = await detectProject(testDir);

      const k8sService = result.services.find((s) => s.service === 'kubernetes');
      expect(k8sService).toBeDefined();
      expect(k8sService!.detected).toBe(true);
      expect(k8sService!.indicators).toContain('k8s/ directory');
    });

    it('should detect kubernetes/ directory', async () => {
      await fs.mkdir(path.join(testDir, 'kubernetes'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'kubernetes', 'service.yaml'), 'apiVersion: v1\n');

      const result = await detectProject(testDir);

      const k8sService = result.services.find((s) => s.service === 'kubernetes');
      expect(k8sService).toBeDefined();
      expect(k8sService!.detected).toBe(true);
      expect(k8sService!.indicators).toContain('kubernetes/ directory');
    });

    it('should detect YAML with kind: Deployment in root', async () => {
      const yamlContent = [
        'apiVersion: apps/v1',
        'kind: Deployment',
        'metadata:',
        '  name: my-app',
      ].join('\n');
      await fs.writeFile(path.join(testDir, 'deployment.yaml'), yamlContent);

      const result = await detectProject(testDir);

      const k8sService = result.services.find((s) => s.service === 'kubernetes');
      expect(k8sService).toBeDefined();
      expect(k8sService!.detected).toBe(true);
      expect(k8sService!.indicators).toContain('YAML with kind: Deployment/Service/Ingress');
    });

    it('should detect YAML with kind: Service in root', async () => {
      const yamlContent = ['apiVersion: v1', 'kind: Service', 'metadata:', '  name: my-svc'].join(
        '\n'
      );
      await fs.writeFile(path.join(testDir, 'service.yml'), yamlContent);

      const result = await detectProject(testDir);

      const k8sService = result.services.find((s) => s.service === 'kubernetes');
      expect(k8sService).toBeDefined();
      expect(k8sService!.detected).toBe(true);
    });

    it('should detect YAML with kind: Ingress in root', async () => {
      const yamlContent = [
        'apiVersion: networking.k8s.io/v1',
        'kind: Ingress',
        'metadata:',
        '  name: my-ingress',
      ].join('\n');
      await fs.writeFile(path.join(testDir, 'ingress.yaml'), yamlContent);

      const result = await detectProject(testDir);

      const k8sService = result.services.find((s) => s.service === 'kubernetes');
      expect(k8sService).toBeDefined();
      expect(k8sService!.detected).toBe(true);
    });
  });

  describe('Helm detection', () => {
    it('should detect Chart.yaml for Helm', async () => {
      await fs.writeFile(
        path.join(testDir, 'Chart.yaml'),
        'apiVersion: v2\nname: my-chart\nversion: 1.0.0\n'
      );

      const result = await detectProject(testDir);

      const helmService = result.services.find((s) => s.service === 'helm');
      expect(helmService).toBeDefined();
      expect(helmService!.detected).toBe(true);
      expect(helmService!.confidence).toBeGreaterThanOrEqual(0.9);
      expect(helmService!.indicators).toContain('Chart.yaml');
    });

    it('should detect charts/ directory for Helm', async () => {
      await fs.mkdir(path.join(testDir, 'charts'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'charts', 'subchart.tgz'), 'placeholder');

      const result = await detectProject(testDir);

      const helmService = result.services.find((s) => s.service === 'helm');
      expect(helmService).toBeDefined();
      expect(helmService!.detected).toBe(true);
      expect(helmService!.indicators).toContain('charts/ directory');
    });
  });

  describe('No false positives', () => {
    it('should not detect container services in empty directory', async () => {
      const result = await detectProject(testDir);

      const containerServices = ['docker', 'docker-compose', 'kubernetes', 'helm'] as const;
      for (const serviceId of containerServices) {
        const service = result.services.find((s) => s.service === serviceId);
        expect(service).toBeDefined();
        expect(service!.detected).toBe(false);
        expect(service!.confidence).toBe(0);
      }
    });

    it('should not detect Kubernetes from non-k8s YAML files', async () => {
      const yamlContent = ['name: my-config', 'settings:', '  debug: true'].join('\n');
      await fs.writeFile(path.join(testDir, 'config.yaml'), yamlContent);

      const result = await detectProject(testDir);

      const k8sService = result.services.find((s) => s.service === 'kubernetes');
      expect(k8sService).toBeDefined();
      expect(k8sService!.detected).toBe(false);
    });
  });

  describe('Template generation', () => {
    it('should generate Docker service rules from template', async () => {
      const rules = await generateServiceRules('docker');
      expect(rules).toContain('DOCKER:START');
      expect(rules).toContain('DOCKER:END');
      expect(rules).toContain('Multi-Stage');
      expect(rules).toContain('HEALTHCHECK');
    });

    it('should generate Docker Compose service rules from template', async () => {
      const rules = await generateServiceRules('docker-compose');
      expect(rules).toContain('DOCKER_COMPOSE:START');
      expect(rules).toContain('DOCKER_COMPOSE:END');
      expect(rules).toContain('healthcheck');
    });

    it('should generate Kubernetes service rules from template', async () => {
      const rules = await generateServiceRules('kubernetes');
      expect(rules).toContain('KUBERNETES:START');
      expect(rules).toContain('KUBERNETES:END');
      expect(rules).toContain('readinessProbe');
      expect(rules).toContain('livenessProbe');
      expect(rules).toContain('securityContext');
    });

    it('should generate Helm service rules from template', async () => {
      const rules = await generateServiceRules('helm');
      expect(rules).toContain('HELM:START');
      expect(rules).toContain('HELM:END');
      expect(rules).toContain('Chart.yaml');
      expect(rules).toContain('values.yaml');
      expect(rules).toContain('helm lint');
    });
  });
});
