import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectProject } from '../src/core/detector';
import { generateServiceRules } from '../src/core/generator';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('Observability service detection', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-observability-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Sentry detection', () => {
    it('should detect @sentry/node in dependencies', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { '@sentry/node': '^8.0.0' } })
      );

      const result = await detectProject(testDir);

      const sentry = result.services.find((s) => s.service === 'sentry');
      expect(sentry).toBeDefined();
      expect(sentry!.detected).toBe(true);
      expect(sentry!.confidence).toBe(0.9);
      expect(sentry!.indicators).toContain('@sentry/node');
    });

    it('should detect @sentry/react in dependencies', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { '@sentry/react': '^8.0.0' } })
      );

      const result = await detectProject(testDir);

      const sentry = result.services.find((s) => s.service === 'sentry');
      expect(sentry).toBeDefined();
      expect(sentry!.detected).toBe(true);
      expect(sentry!.indicators).toContain('@sentry/react');
    });

    it('should detect @sentry/nextjs in dependencies', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { '@sentry/nextjs': '^8.0.0' } })
      );

      const result = await detectProject(testDir);

      const sentry = result.services.find((s) => s.service === 'sentry');
      expect(sentry).toBeDefined();
      expect(sentry!.detected).toBe(true);
      expect(sentry!.indicators).toContain('@sentry/nextjs');
    });

    it('should detect @sentry/browser in devDependencies', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ devDependencies: { '@sentry/browser': '^8.0.0' } })
      );

      const result = await detectProject(testDir);

      const sentry = result.services.find((s) => s.service === 'sentry');
      expect(sentry).toBeDefined();
      expect(sentry!.detected).toBe(true);
      expect(sentry!.indicators).toContain('@sentry/browser');
    });
  });

  describe('OpenTelemetry detection', () => {
    it('should detect @opentelemetry/sdk-node', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { '@opentelemetry/sdk-node': '^1.0.0' } })
      );

      const result = await detectProject(testDir);

      const otel = result.services.find((s) => s.service === 'opentelemetry');
      expect(otel).toBeDefined();
      expect(otel!.detected).toBe(true);
      expect(otel!.confidence).toBe(0.9);
      expect(otel!.indicators).toContain('@opentelemetry/sdk-node');
    });

    it('should detect @opentelemetry/api', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { '@opentelemetry/api': '^1.0.0' } })
      );

      const result = await detectProject(testDir);

      const otel = result.services.find((s) => s.service === 'opentelemetry');
      expect(otel).toBeDefined();
      expect(otel!.detected).toBe(true);
      expect(otel!.indicators).toContain('@opentelemetry/api');
    });

    it('should detect @opentelemetry/auto-instrumentations-node', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: { '@opentelemetry/auto-instrumentations-node': '^0.40.0' },
        })
      );

      const result = await detectProject(testDir);

      const otel = result.services.find((s) => s.service === 'opentelemetry');
      expect(otel).toBeDefined();
      expect(otel!.detected).toBe(true);
      expect(otel!.indicators).toContain('@opentelemetry/auto-instrumentations-node');
    });
  });

  describe('Datadog detection', () => {
    it('should detect dd-trace', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { 'dd-trace': '^5.0.0' } })
      );

      const result = await detectProject(testDir);

      const datadog = result.services.find((s) => s.service === 'datadog');
      expect(datadog).toBeDefined();
      expect(datadog!.detected).toBe(true);
      expect(datadog!.confidence).toBe(0.9);
      expect(datadog!.indicators).toContain('dd-trace');
    });

    it('should detect datadog-lambda-js', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { 'datadog-lambda-js': '^6.0.0' } })
      );

      const result = await detectProject(testDir);

      const datadog = result.services.find((s) => s.service === 'datadog');
      expect(datadog).toBeDefined();
      expect(datadog!.detected).toBe(true);
      expect(datadog!.indicators).toContain('datadog-lambda-js');
    });
  });

  describe('Pino detection', () => {
    it('should detect pino', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { pino: '^9.0.0' } })
      );

      const result = await detectProject(testDir);

      const pino = result.services.find((s) => s.service === 'pino');
      expect(pino).toBeDefined();
      expect(pino!.detected).toBe(true);
      expect(pino!.confidence).toBe(0.9);
      expect(pino!.indicators).toContain('pino');
    });

    it('should detect pino-http', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { 'pino-http': '^10.0.0' } })
      );

      const result = await detectProject(testDir);

      const pino = result.services.find((s) => s.service === 'pino');
      expect(pino).toBeDefined();
      expect(pino!.detected).toBe(true);
      expect(pino!.indicators).toContain('pino-http');
    });
  });

  describe('Winston detection', () => {
    it('should detect winston', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { winston: '^3.0.0' } })
      );

      const result = await detectProject(testDir);

      const winston = result.services.find((s) => s.service === 'winston');
      expect(winston).toBeDefined();
      expect(winston!.detected).toBe(true);
      expect(winston!.confidence).toBe(0.9);
      expect(winston!.indicators).toContain('winston');
    });

    it('should detect winston-transport in devDependencies', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ devDependencies: { 'winston-transport': '^4.0.0' } })
      );

      const result = await detectProject(testDir);

      const winston = result.services.find((s) => s.service === 'winston');
      expect(winston).toBeDefined();
      expect(winston!.detected).toBe(true);
      expect(winston!.indicators).toContain('winston-transport');
    });
  });

  describe('Prometheus detection', () => {
    it('should detect prom-client', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { 'prom-client': '^15.0.0' } })
      );

      const result = await detectProject(testDir);

      const prom = result.services.find((s) => s.service === 'prometheus');
      expect(prom).toBeDefined();
      expect(prom!.detected).toBe(true);
      expect(prom!.confidence).toBe(0.9);
      expect(prom!.indicators).toContain('prom-client');
    });

    it('should detect express-prometheus-middleware', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { 'express-prometheus-middleware': '^1.0.0' } })
      );

      const result = await detectProject(testDir);

      const prom = result.services.find((s) => s.service === 'prometheus');
      expect(prom).toBeDefined();
      expect(prom!.detected).toBe(true);
      expect(prom!.indicators).toContain('express-prometheus-middleware');
    });
  });

  describe('No false positives', () => {
    it('should not detect observability services in empty directory', async () => {
      const result = await detectProject(testDir);

      const observabilityServices = [
        'sentry',
        'opentelemetry',
        'datadog',
        'pino',
        'winston',
        'prometheus',
      ] as const;
      for (const serviceId of observabilityServices) {
        const service = result.services.find((s) => s.service === serviceId);
        expect(service).toBeDefined();
        expect(service!.detected).toBe(false);
        expect(service!.confidence).toBe(0);
      }
    });

    it('should not detect observability services from empty package.json', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ name: 'test-project', dependencies: {} })
      );

      const result = await detectProject(testDir);

      const observabilityServices = [
        'sentry',
        'opentelemetry',
        'datadog',
        'pino',
        'winston',
        'prometheus',
      ] as const;
      for (const serviceId of observabilityServices) {
        const service = result.services.find((s) => s.service === serviceId);
        expect(service).toBeDefined();
        expect(service!.detected).toBe(false);
      }
    });
  });

  describe('Multiple services detection', () => {
    it('should detect multiple observability services from one package.json', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@sentry/node': '^8.0.0',
            pino: '^9.0.0',
            'prom-client': '^15.0.0',
          },
        })
      );

      const result = await detectProject(testDir);

      const sentry = result.services.find((s) => s.service === 'sentry');
      const pino = result.services.find((s) => s.service === 'pino');
      const prom = result.services.find((s) => s.service === 'prometheus');

      expect(sentry!.detected).toBe(true);
      expect(pino!.detected).toBe(true);
      expect(prom!.detected).toBe(true);
    });
  });

  describe('Template generation', () => {
    it('should generate Sentry service rules from template', async () => {
      const rules = await generateServiceRules('sentry');
      expect(rules).toContain('SENTRY:START');
      expect(rules).toContain('SENTRY:END');
      expect(rules).toContain('SENTRY_DSN');
      expect(rules).toContain('captureException');
    });

    it('should generate OpenTelemetry service rules from template', async () => {
      const rules = await generateServiceRules('opentelemetry');
      expect(rules).toContain('OPENTELEMETRY:START');
      expect(rules).toContain('OPENTELEMETRY:END');
      expect(rules).toContain('OTEL_SERVICE_NAME');
      expect(rules).toContain('W3C Trace Context');
    });

    it('should generate Datadog service rules from template', async () => {
      const rules = await generateServiceRules('datadog');
      expect(rules).toContain('DATADOG:START');
      expect(rules).toContain('DATADOG:END');
      expect(rules).toContain('dd-trace');
      expect(rules).toContain('DD_ENV');
    });

    it('should generate Pino service rules from template', async () => {
      const rules = await generateServiceRules('pino');
      expect(rules).toContain('PINO:START');
      expect(rules).toContain('PINO:END');
      expect(rules).toContain('pino-pretty');
      expect(rules).toContain('child loggers');
    });

    it('should generate Winston service rules from template', async () => {
      const rules = await generateServiceRules('winston');
      expect(rules).toContain('WINSTON:START');
      expect(rules).toContain('WINSTON:END');
      expect(rules).toContain('createLogger');
      expect(rules).toContain('transports');
    });

    it('should generate Prometheus service rules from template', async () => {
      const rules = await generateServiceRules('prometheus');
      expect(rules).toContain('PROMETHEUS:START');
      expect(rules).toContain('PROMETHEUS:END');
      expect(rules).toContain('prom-client');
      expect(rules).toContain('/metrics');
    });
  });
});
