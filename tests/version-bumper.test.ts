import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { bumpVersion, getCurrentVersion, bumpProjectVersion } from '../src/core/version-bumper';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('version-bumper', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('bumpVersion', () => {
    it('should bump patch version', () => {
      const result = bumpVersion('1.2.3', 'patch');
      expect(result).toBe('1.2.4');
    });

    it('should bump minor version and reset patch', () => {
      const result = bumpVersion('1.2.3', 'minor');
      expect(result).toBe('1.3.0');
    });

    it('should bump major version and reset minor and patch', () => {
      const result = bumpVersion('1.2.3', 'major');
      expect(result).toBe('2.0.0');
    });

    it('should handle version with v prefix', () => {
      const result = bumpVersion('v1.2.3', 'patch');
      expect(result).toBe('1.2.4');
    });

    it('should throw on invalid version', () => {
      expect(() => bumpVersion('invalid', 'patch')).toThrow('Invalid version format');
    });
  });

  describe('getCurrentVersion', () => {
    it('should get version from package.json', async () => {
      const packageJson = {
        name: 'test-package',
        version: '1.2.3',
      };
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const version = await getCurrentVersion(testDir);
      expect(version).toBe('1.2.3');
    });

    it('should get version from Cargo.toml', async () => {
      const cargoToml = `[package]
name = "test-crate"
version = "2.0.0"
edition = "2024"
`;
      await fs.writeFile(path.join(testDir, 'Cargo.toml'), cargoToml);

      const version = await getCurrentVersion(testDir);
      expect(version).toBe('2.0.0');
    });

    it('should return null if no version files found', async () => {
      const version = await getCurrentVersion(testDir);
      expect(version).toBeNull();
    });
  });

  describe('bumpProjectVersion', () => {
    it('should bump version in package.json', async () => {
      const packageJson = {
        name: 'test-package',
        version: '1.0.0',
      };
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = await bumpProjectVersion(testDir, 'minor');

      expect(result.oldVersion).toBe('1.0.0');
      expect(result.newVersion).toBe('1.1.0');
      expect(result.filesUpdated).toContain('package.json');

      const updated = JSON.parse(
        await fs.readFile(path.join(testDir, 'package.json'), 'utf-8')
      );
      expect(updated.version).toBe('1.1.0');
    });

    it('should bump version in Cargo.toml', async () => {
      const cargoToml = `[package]
name = "test-crate"
version = "0.5.0"
edition = "2024"
`;
      await fs.writeFile(path.join(testDir, 'Cargo.toml'), cargoToml);

      const result = await bumpProjectVersion(testDir, 'major');

      expect(result.oldVersion).toBe('0.5.0');
      expect(result.newVersion).toBe('1.0.0');
      expect(result.filesUpdated).toContain('Cargo.toml');

      const updated = await fs.readFile(path.join(testDir, 'Cargo.toml'), 'utf-8');
      expect(updated).toContain('version = "1.0.0"');
    });

    it('should throw if no version files found', async () => {
      await expect(bumpProjectVersion(testDir, 'patch')).rejects.toThrow(
        'Could not find version in project files'
      );
    });
  });
});

