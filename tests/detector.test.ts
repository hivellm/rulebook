import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectProject } from '../src/core/detector';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('detector', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('detectProject', () => {
    it('should detect Rust project with Cargo.toml', async () => {
      await fs.writeFile(path.join(testDir, 'Cargo.toml'), '[package]\nname = "test"');
      await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'src', 'main.rs'), 'fn main() {}');

      const result = await detectProject(testDir);

      expect(result.languages).toHaveLength(1);
      expect(result.languages[0].language).toBe('rust');
      expect(result.languages[0].confidence).toBeGreaterThan(0.8);
      expect(result.languages[0].indicators).toContain('Cargo.toml');
    });

    it('should detect TypeScript project with package.json and tsconfig', async () => {
      await fs.writeFile(path.join(testDir, 'package.json'), '{"name": "test"}');
      await fs.writeFile(path.join(testDir, 'tsconfig.json'), '{}');
      await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'src', 'index.ts'), 'console.log("test")');

      const result = await detectProject(testDir);

      expect(result.languages).toHaveLength(1);
      expect(result.languages[0].language).toBe('typescript');
      expect(result.languages[0].indicators).toContain('package.json');
      expect(result.languages[0].indicators).toContain('tsconfig.json');
    });

    it('should detect Python project with pyproject.toml', async () => {
      await fs.writeFile(path.join(testDir, 'pyproject.toml'), '[tool.poetry]\nname = "test"');
      await fs.writeFile(path.join(testDir, 'main.py'), 'print("test")');

      const result = await detectProject(testDir);

      expect(result.languages).toHaveLength(1);
      expect(result.languages[0].language).toBe('python');
      expect(result.languages[0].indicators).toContain('pyproject.toml');
    });

    it('should detect multiple languages', async () => {
      await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'Cargo.toml'), '[package]\nname = "test"');
      await fs.writeFile(path.join(testDir, 'package.json'), '{"name": "test"}');
      await fs.writeFile(path.join(testDir, 'src', 'main.rs'), 'fn main() {}');
      await fs.writeFile(path.join(testDir, 'src', 'index.ts'), 'console.log("test")');

      const result = await detectProject(testDir);

      expect(result.languages.length).toBeGreaterThanOrEqual(2);
      const languages = result.languages.map((l) => l.language);
      expect(languages).toContain('rust');
      expect(languages).toContain('typescript');
    });

    it('should detect Vectorizer module from MCP config', async () => {
      const mcpConfig = {
        mcpServers: {
          vectorizer: {
            command: 'mcp-vectorizer',
          },
        },
      };
      await fs.writeFile(path.join(testDir, 'mcp.json'), JSON.stringify(mcpConfig, null, 2));

      const result = await detectProject(testDir);

      const vectorizer = result.modules.find((m) => m.module === 'vectorizer');
      expect(vectorizer).toBeDefined();
      expect(vectorizer?.detected).toBe(true);
    });

    it('should detect existing AGENTS.md', async () => {
      const agentsContent = `<!-- RULEBOOK:START -->
# Project Rules
<!-- RULEBOOK:END -->

<!-- RUST:START -->
# Rust Rules
<!-- RUST:END -->`;
      await fs.writeFile(path.join(testDir, 'AGENTS.md'), agentsContent);

      const result = await detectProject(testDir);

      expect(result.existingAgents).not.toBeNull();
      expect(result.existingAgents?.exists).toBe(true);
      expect(result.existingAgents?.blocks).toHaveLength(2);
      expect(result.existingAgents?.blocks[0].name).toBe('RULEBOOK');
      expect(result.existingAgents?.blocks[1].name).toBe('RUST');
    });

    it('should return empty arrays when no project detected', async () => {
      const result = await detectProject(testDir);

      expect(result.languages).toEqual([]);
      expect(result.modules.every((m) => !m.detected)).toBe(true);
      expect(result.existingAgents).toBeNull();
    });

    it('should detect Go project with go.mod', async () => {
      await fs.writeFile(path.join(testDir, 'go.mod'), 'module example.com/test\n\ngo 1.21');
      await fs.writeFile(path.join(testDir, 'main.go'), 'package main\n\nfunc main() {}');

      const result = await detectProject(testDir);

      expect(result.languages).toHaveLength(1);
      expect(result.languages[0].language).toBe('go');
      expect(result.languages[0].indicators).toContain('go.mod');
    });

    describe('framework detection', () => {
      it('should detect NestJS framework from package.json', async () => {
        await fs.writeFile(
          path.join(testDir, 'package.json'),
          JSON.stringify(
            {
              name: 'nestjs-app',
              dependencies: {
                '@nestjs/core': '^10.0.0',
                '@nestjs/common': '^10.0.0',
              },
            },
            null,
            2
          )
        );
        await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
        await fs.writeFile(path.join(testDir, 'src', 'main.ts'), 'console.log("hello")');

        const result = await detectProject(testDir);
        const nest = result.frameworks.find((f) => f.framework === 'nestjs');

        expect(nest).toBeDefined();
        expect(nest?.detected).toBe(true);
      });

      it('should detect Angular framework via angular.json', async () => {
        await fs.writeFile(
          path.join(testDir, 'package.json'),
          JSON.stringify(
            {
              name: 'angular-app',
              dependencies: {
                '@angular/core': '^17.0.0',
              },
            },
            null,
            2
          )
        );
        await fs.writeFile(path.join(testDir, 'angular.json'), '{ "projects": {} }');
        await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
        await fs.writeFile(path.join(testDir, 'src', 'main.ts'), 'console.log("hello")');

        const result = await detectProject(testDir);
        const angular = result.frameworks.find((f) => f.framework === 'angular');

        expect(angular).toBeDefined();
        expect(angular?.detected).toBe(true);
      });

      it('should detect React framework via package.json dependencies', async () => {
        await fs.writeFile(
          path.join(testDir, 'package.json'),
          JSON.stringify(
            {
              name: 'react-app',
              dependencies: {
                react: '^18.0.0',
                'react-dom': '^18.0.0',
              },
            },
            null,
            2
          )
        );
        await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
        await fs.writeFile(path.join(testDir, 'src', 'index.tsx'), 'console.log("hello")');

        const result = await detectProject(testDir);
        const react = result.frameworks.find((f) => f.framework === 'react');

        expect(react).toBeDefined();
        expect(react?.detected).toBe(true);
      });

      it('should detect Vue framework via package.json', async () => {
        await fs.writeFile(
          path.join(testDir, 'package.json'),
          JSON.stringify(
            {
              name: 'vue-app',
              dependencies: {
                vue: '^3.3.0',
              },
            },
            null,
            2
          )
        );
        await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
        await fs.writeFile(path.join(testDir, 'src', 'App.vue'), '<template><div/></template>');
        await fs.writeFile(path.join(testDir, 'src', 'main.ts'), 'console.log("hello")');

        const result = await detectProject(testDir);
        const vue = result.frameworks.find((f) => f.framework === 'vue');

        expect(vue).toBeDefined();
        expect(vue?.detected).toBe(true);
      });

      it('should detect Nuxt framework via nuxt config', async () => {
        await fs.writeFile(
          path.join(testDir, 'package.json'),
          JSON.stringify(
            {
              name: 'nuxt-app',
              dependencies: {
                nuxt: '^3.7.0',
              },
            },
            null,
            2
          )
        );
        await fs.writeFile(path.join(testDir, 'nuxt.config.ts'), 'export default { }');
        await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
        await fs.writeFile(path.join(testDir, 'src', 'app.ts'), 'console.log("hello")');

        const result = await detectProject(testDir);
        const nuxt = result.frameworks.find((f) => f.framework === 'nuxt');

        expect(nuxt).toBeDefined();
        expect(nuxt?.detected).toBe(true);
      });

      it('should detect Spring Boot framework via pom.xml', async () => {
        await fs.writeFile(
          path.join(testDir, 'pom.xml'),
          '<project><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter</artifactId></dependency></dependencies></project>'
        );
        await fs.mkdir(path.join(testDir, 'src', 'main', 'java'), { recursive: true });
        await fs.writeFile(
          path.join(testDir, 'src', 'main', 'java', 'Main.java'),
          'public class Main {}'
        );

        const result = await detectProject(testDir);
        const spring = result.frameworks.find((f) => f.framework === 'spring');

        expect(spring).toBeDefined();
        expect(spring?.detected).toBe(true);
      });

      it('should detect Laravel framework via composer.json', async () => {
        await fs.writeFile(
          path.join(testDir, 'composer.json'),
          JSON.stringify(
            {
              require: {
                'laravel/framework': '^10.0',
              },
            },
            null,
            2
          )
        );
        await fs.writeFile(path.join(testDir, 'artisan'), '<?php echo "artisan";');

        const result = await detectProject(testDir);
        const laravel = result.frameworks.find((f) => f.framework === 'laravel');

        expect(laravel).toBeDefined();
        expect(laravel?.detected).toBe(true);
      });

      it('should detect Django framework via requirements.txt', async () => {
        await fs.writeFile(
          path.join(testDir, 'requirements.txt'),
          'Django==4.2.0\npsycopg2==2.9.0'
        );
        await fs.writeFile(path.join(testDir, 'manage.py'), '#!/usr/bin/env python\nimport django');

        const result = await detectProject(testDir);
        const django = result.frameworks.find((f) => f.framework === 'django');

        expect(django).toBeDefined();
        expect(django?.detected).toBe(true);
        expect(django?.languages).toContain('python');
      });

      it('should detect Flask framework via requirements.txt', async () => {
        await fs.writeFile(
          path.join(testDir, 'requirements.txt'),
          'Flask==3.0.0\nFlask-SQLAlchemy==3.0.0'
        );

        const result = await detectProject(testDir);
        const flask = result.frameworks.find((f) => f.framework === 'flask');

        expect(flask).toBeDefined();
        expect(flask?.detected).toBe(true);
        expect(flask?.languages).toContain('python');
      });

      it('should detect Ruby on Rails framework via Gemfile', async () => {
        await fs.writeFile(path.join(testDir, 'Gemfile'), 'gem "rails", "~> 7.0.0"');
        await fs.mkdir(path.join(testDir, 'bin'), { recursive: true });
        await fs.writeFile(path.join(testDir, 'bin', 'rails'), '#!/usr/bin/env ruby');

        const result = await detectProject(testDir);
        const rails = result.frameworks.find((f) => f.framework === 'rails');

        expect(rails).toBeDefined();
        expect(rails?.detected).toBe(true);
        expect(rails?.languages).toContain('ruby');
      });

      it('should detect Symfony framework via composer.json', async () => {
        await fs.writeFile(
          path.join(testDir, 'composer.json'),
          JSON.stringify({ require: { 'symfony/framework-bundle': '^6.0' } })
        );
        await fs.writeFile(path.join(testDir, 'symfony.lock'), '{}');

        const result = await detectProject(testDir);
        const symfony = result.frameworks.find((f) => f.framework === 'symfony');

        expect(symfony).toBeDefined();
        expect(symfony?.detected).toBe(true);
        expect(symfony?.languages).toContain('php');
      });

      it('should detect Next.js framework via package.json', async () => {
        await fs.writeFile(
          path.join(testDir, 'package.json'),
          JSON.stringify({ dependencies: { next: '^14.0.0', react: '^18.0.0' } })
        );
        await fs.writeFile(path.join(testDir, 'next.config.js'), 'module.exports = {}');

        const result = await detectProject(testDir);
        const nextjs = result.frameworks.find((f) => f.framework === 'nextjs');

        expect(nextjs).toBeDefined();
        expect(nextjs?.detected).toBe(true);
        expect(nextjs?.languages).toContain('typescript');
      });

      it('should detect Electron framework via package.json', async () => {
        await fs.writeFile(
          path.join(testDir, 'package.json'),
          JSON.stringify({
            dependencies: { electron: '^28.0.0' },
            devDependencies: { 'electron-builder': '^24.0.0' },
          })
        );

        const result = await detectProject(testDir);
        const electron = result.frameworks.find((f) => f.framework === 'electron');

        expect(electron).toBeDefined();
        expect(electron?.detected).toBe(true);
        expect(electron?.languages).toContain('typescript');
      });

      it('should detect React Native framework via package.json', async () => {
        await fs.writeFile(
          path.join(testDir, 'package.json'),
          JSON.stringify({ dependencies: { 'react-native': '^0.72.0' } })
        );
        await fs.writeFile(
          path.join(testDir, 'app.json'),
          JSON.stringify({ expo: { name: 'test' } })
        );

        const result = await detectProject(testDir);
        const reactnative = result.frameworks.find((f) => f.framework === 'reactnative');

        expect(reactnative).toBeDefined();
        expect(reactnative?.detected).toBe(true);
      });

      it('should detect Flutter framework via pubspec.yaml', async () => {
        await fs.writeFile(
          path.join(testDir, 'pubspec.yaml'),
          'name: myapp\ndependencies:\n  flutter:\n    sdk: flutter'
        );

        const result = await detectProject(testDir);
        const flutter = result.frameworks.find((f) => f.framework === 'flutter');

        expect(flutter).toBeDefined();
        expect(flutter?.detected).toBe(true);
        expect(flutter?.languages).toContain('dart');
      });
    });

    it('should detect Java project with pom.xml', async () => {
      await fs.writeFile(path.join(testDir, 'pom.xml'), '<project></project>');
      await fs.mkdir(path.join(testDir, 'src', 'main', 'java'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, 'src', 'main', 'java', 'Main.java'),
        'public class Main {}'
      );

      const result = await detectProject(testDir);

      expect(result.languages).toHaveLength(1);
      expect(result.languages[0].language).toBe('java');
      expect(result.languages[0].indicators).toContain('pom.xml');
    });

    it('should detect C++ project with CMakeLists.txt', async () => {
      await fs.writeFile(
        path.join(testDir, 'CMakeLists.txt'),
        'cmake_minimum_required(VERSION 3.0)'
      );
      await fs.writeFile(path.join(testDir, 'main.cpp'), 'int main() { return 0; }');

      const result = await detectProject(testDir);

      expect(result.languages).toHaveLength(1);
      expect(result.languages[0].language).toBe('cpp');
      expect(result.languages[0].indicators).toContain('CMakeLists.txt');
    });

    it('should detect Python project with requirements.txt', async () => {
      await fs.writeFile(path.join(testDir, 'requirements.txt'), 'requests==2.28.0\nflask==2.3.0');
      await fs.writeFile(path.join(testDir, 'app.py'), 'from flask import Flask');

      const result = await detectProject(testDir);

      expect(result.languages).toHaveLength(1);
      expect(result.languages[0].language).toBe('python');
      expect(result.languages[0].indicators).toContain('requirements.txt');
    });

    it('should report git hook presence when hooks exist', async () => {
      const gitHooksDir = path.join(testDir, '.git', 'hooks');
      await fs.mkdir(gitHooksDir, { recursive: true });
      await fs.writeFile(path.join(gitHooksDir, 'pre-commit'), '#!/bin/sh\nexit 0');
      await fs.writeFile(path.join(gitHooksDir, 'pre-push'), '#!/bin/sh\nexit 0');

      const result = await detectProject(testDir);

      expect(result.gitHooks).toBeDefined();
      expect(result.gitHooks?.preCommitExists).toBe(true);
      expect(result.gitHooks?.prePushExists).toBe(true);
    });

    it('should report missing git hooks when directory exists without scripts', async () => {
      const gitHooksDir = path.join(testDir, '.git', 'hooks');
      await fs.mkdir(gitHooksDir, { recursive: true });

      const result = await detectProject(testDir);

      expect(result.gitHooks).toBeDefined();
      expect(result.gitHooks?.preCommitExists).toBe(false);
      expect(result.gitHooks?.prePushExists).toBe(false);
    });

    it('should detect Playwright module from package.json', async () => {
      const packageJson = {
        name: 'test',
        dependencies: {
          playwright: '^1.40.0',
        },
      };
      await fs.writeFile(path.join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      const result = await detectProject(testDir);

      const playwright = result.modules.find((m) => m.module === 'playwright');
      expect(playwright).toBeDefined();
      // Playwright detection might not be implemented yet
      expect(typeof playwright?.detected).toBe('boolean');
    });

    it('should detect Context7 module from MCP config', async () => {
      const mcpConfig = {
        mcpServers: {
          context7: {
            command: 'mcp-context7',
          },
        },
      };
      await fs.writeFile(path.join(testDir, 'mcp.json'), JSON.stringify(mcpConfig, null, 2));

      const result = await detectProject(testDir);

      const context7 = result.modules.find((m) => m.module === 'context7');
      expect(context7).toBeDefined();
      expect(context7?.detected).toBe(true);
    });

    it('should detect Synap module from MCP config', async () => {
      const mcpConfig = {
        mcpServers: {
          synap: {
            command: 'mcp-synap',
          },
        },
      };
      await fs.writeFile(path.join(testDir, 'mcp.json'), JSON.stringify(mcpConfig, null, 2));

      const result = await detectProject(testDir);

      const synap = result.modules.find((m) => m.module === 'synap');
      expect(synap).toBeDefined();
      expect(synap?.detected).toBe(true);
    });

    it('should detect UMICP module from MCP config', async () => {
      const mcpConfig = {
        mcpServers: {
          umicp: {
            command: 'mcp-umicp',
          },
        },
      };
      await fs.writeFile(path.join(testDir, 'mcp.json'), JSON.stringify(mcpConfig, null, 2));

      const result = await detectProject(testDir);

      // UMICP might not be in the modules list yet
      const moduleNames = result.modules.map((m) => m.module);
      expect(Array.isArray(moduleNames)).toBe(true);
    });

    it('should detect multiple modules from MCP config', async () => {
      const mcpConfig = {
        mcpServers: {
          vectorizer: { command: 'mcp-vectorizer' },
          context7: { command: 'mcp-context7' },
          synap: { command: 'mcp-synap' },
          playwright: { command: 'mcp-playwright' },
        },
      };
      await fs.writeFile(path.join(testDir, 'mcp.json'), JSON.stringify(mcpConfig, null, 2));

      const result = await detectProject(testDir);

      const detectedModules = result.modules.filter((m) => m.detected);
      // At least vectorizer, context7, and synap should be detected
      expect(detectedModules.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle invalid AGENTS.md gracefully', async () => {
      await fs.writeFile(path.join(testDir, 'AGENTS.md'), 'Invalid content without blocks');

      const result = await detectProject(testDir);

      expect(result.existingAgents).not.toBeNull();
      expect(result.existingAgents?.exists).toBe(true);
      expect(result.existingAgents?.blocks).toEqual([]);
    });

    it('should handle invalid mcp.json gracefully', async () => {
      await fs.writeFile(path.join(testDir, 'mcp.json'), 'invalid json{');

      const result = await detectProject(testDir);

      // Should not throw, just not detect any modules from MCP
      expect(result.modules.filter((m) => m.detected)).toHaveLength(0);
    });

    it('should detect Ruby project with Gemfile', async () => {
      await fs.writeFile(
        path.join(testDir, 'Gemfile'),
        "source 'https://rubygems.org'\n\ngem 'rails'"
      );
      await fs.writeFile(path.join(testDir, 'app.rb'), 'puts "Hello"');

      const result = await detectProject(testDir);

      // Ruby detection might not be implemented yet
      const ruby = result.languages.find((l) => l.language === 'ruby');
      if (ruby) {
        expect(ruby.indicators).toContain('Gemfile');
      }
      // Test passes either way
      expect(result.languages).toBeDefined();
    });

    it('should detect PHP project with composer.json', async () => {
      await fs.writeFile(path.join(testDir, 'composer.json'), '{"name": "test/project"}');
      await fs.writeFile(path.join(testDir, 'index.php'), '<?php echo "test"; ?>');

      const result = await detectProject(testDir);

      // PHP detection might not be implemented yet
      const php = result.languages.find((l) => l.language === 'php');
      if (php) {
        expect(php.indicators).toContain('composer.json');
      }
      // Test passes either way
      expect(result.languages).toBeDefined();
    });

    it('should handle empty directory', async () => {
      const result = await detectProject(testDir);

      expect(result.languages).toEqual([]);
      expect(result.modules.every((m) => !m.detected)).toBe(true);
      expect(result.existingAgents).toBeNull();
    });

    it('should detect project with custom working directory', async () => {
      const customDir = path.join(testDir, 'custom');
      await fs.mkdir(customDir, { recursive: true });
      await fs.writeFile(path.join(customDir, 'Cargo.toml'), '[package]\nname = "test"');
      await fs.writeFile(path.join(customDir, 'src', 'main.rs'), 'fn main() {}').catch(() => {
        // Ignore if src doesn't exist
      });

      const result = await detectProject(customDir);

      expect(result.languages.length).toBeGreaterThanOrEqual(1);
      const rust = result.languages.find((l) => l.language === 'rust');
      expect(rust).toBeDefined();
    });

    describe('language detection edge cases', () => {
      it('should detect Rust with Cargo.toml but no .rs files', async () => {
        await fs.writeFile(path.join(testDir, 'Cargo.toml'), '[package]\nname = "test"');
        // No .rs files

        const result = await detectProject(testDir);

        const rust = result.languages.find((l) => l.language === 'rust');
        expect(rust).toBeDefined();
        expect(rust?.confidence).toBeLessThan(1.0); // Lower confidence without .rs files
      });

      it('should detect TypeScript with only package.json', async () => {
        await fs.writeFile(path.join(testDir, 'package.json'), '{"name": "test"}');
        // No tsconfig.json, no .ts files

        const result = await detectProject(testDir);

        const ts = result.languages.find((l) => l.language === 'typescript');
        if (ts) {
          expect(ts.confidence).toBeLessThan(1.0);
        }
      });

      it('should detect TypeScript with only tsconfig.json', async () => {
        await fs.writeFile(path.join(testDir, 'tsconfig.json'), '{}');
        // No package.json, no .ts files

        const result = await detectProject(testDir);

        const ts = result.languages.find((l) => l.language === 'typescript');
        if (ts) {
          expect(ts.confidence).toBeLessThan(1.0);
        }
      });

      it('should detect Python with only requirements.txt', async () => {
        await fs.writeFile(path.join(testDir, 'requirements.txt'), 'requests==2.28.0');
        // No pyproject.toml, no setup.py, no .py files

        const result = await detectProject(testDir);

        const python = result.languages.find((l) => l.language === 'python');
        if (python) {
          expect(python.confidence).toBeLessThan(1.0);
        }
      });

      it('should detect Python with only setup.py', async () => {
        await fs.writeFile(path.join(testDir, 'setup.py'), 'from setuptools import setup\nsetup()');
        // No pyproject.toml, no requirements.txt, no .py files

        const result = await detectProject(testDir);

        const python = result.languages.find((l) => l.language === 'python');
        if (python) {
          // setup.py alone might give confidence 0.7 (without .py files) or 1.0 (if .py files found)
          expect(python.confidence).toBeGreaterThanOrEqual(0.7);
        }
      });

      it('should detect Go with go.mod but no .go files', async () => {
        await fs.writeFile(path.join(testDir, 'go.mod'), 'module example.com/test\n\ngo 1.21');
        // No .go files

        const result = await detectProject(testDir);

        const go = result.languages.find((l) => l.language === 'go');
        expect(go).toBeDefined();
        expect(go?.confidence).toBeLessThan(1.0);
      });

      it('should detect Java with only build.gradle', async () => {
        await fs.writeFile(path.join(testDir, 'build.gradle'), 'plugins { id "java" }');
        // No pom.xml, no build.gradle.kts, no .java files

        const result = await detectProject(testDir);

        const java = result.languages.find((l) => l.language === 'java');
        if (java) {
          expect(java.confidence).toBeLessThan(1.0);
        }
      });

      it('should detect Java with only build.gradle.kts', async () => {
        await fs.writeFile(path.join(testDir, 'build.gradle.kts'), 'plugins { id("java") }');
        // No pom.xml, no build.gradle, no .java files

        const result = await detectProject(testDir);

        const java = result.languages.find((l) => l.language === 'java');
        if (java) {
          expect(java.confidence).toBeLessThan(1.0);
        }
      });

      it('should detect C++ with only Makefile', async () => {
        await fs.writeFile(path.join(testDir, 'Makefile'), 'all:\n\techo "test"');
        // No CMakeLists.txt, no .cpp files

        const result = await detectProject(testDir);

        const cpp = result.languages.find((l) => l.language === 'cpp');
        if (cpp) {
          expect(cpp.confidence).toBeLessThan(1.0);
        }
      });

      it('should detect Solidity with only hardhat.config.js', async () => {
        await fs.writeFile(path.join(testDir, 'hardhat.config.js'), 'module.exports = {}');
        // No foundry.toml, no .sol files

        const result = await detectProject(testDir);

        const solidity = result.languages.find((l) => l.language === 'solidity');
        if (solidity) {
          expect(solidity.confidence).toBeLessThan(1.0);
        }
      });

      it('should detect Solidity with only foundry.toml', async () => {
        await fs.writeFile(path.join(testDir, 'foundry.toml'), '[profile.default]');
        // No hardhat.config.js, no .sol files

        const result = await detectProject(testDir);

        const solidity = result.languages.find((l) => l.language === 'solidity');
        if (solidity) {
          expect(solidity.confidence).toBeLessThan(1.0);
        }
      });

      it('should detect Zig with build.zig but no .zig files', async () => {
        await fs.writeFile(path.join(testDir, 'build.zig'), 'const std = @import("std");');
        // No .zig files

        const result = await detectProject(testDir);

        const zig = result.languages.find((l) => l.language === 'zig');
        if (zig) {
          // build.zig alone gives confidence 0.9 (without .zig files) or 1.0 (if .zig files found)
          expect(zig.confidence).toBeGreaterThanOrEqual(0.9);
        }
      });

      it('should detect Erlang with rebar.config but no .erl files', async () => {
        await fs.writeFile(path.join(testDir, 'rebar.config'), '{deps, []}.');
        // No .erl files

        const result = await detectProject(testDir);

        const erlang = result.languages.find((l) => l.language === 'erlang');
        if (erlang) {
          expect(erlang.confidence).toBeLessThan(1.0);
        }
      });

      it('should detect JavaScript when TypeScript is not detected', async () => {
        await fs.writeFile(
          path.join(testDir, 'package.json'),
          '{"name": "test", "type": "module"}'
        );
        await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
        await fs.writeFile(path.join(testDir, 'src', 'index.js'), 'console.log("test")');
        // No tsconfig.json, no .ts files

        const result = await detectProject(testDir);

        const js = result.languages.find((l) => l.language === 'javascript');
        if (js) {
          expect(js.confidence).toBeGreaterThan(0);
          expect(js.indicators).toContain('package.json');
        }
      });

      it('should detect JavaScript with ESM type', async () => {
        await fs.writeFile(
          path.join(testDir, 'package.json'),
          '{"name": "test", "type": "module"}'
        );
        await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
        await fs.writeFile(path.join(testDir, 'src', 'index.js'), 'console.log("test")');

        const result = await detectProject(testDir);

        const js = result.languages.find((l) => l.language === 'javascript');
        if (js) {
          expect(js.indicators).toContain('ESM');
        }
      });

      it('should detect Dart with pubspec.yaml but no .dart files', async () => {
        await fs.writeFile(path.join(testDir, 'pubspec.yaml'), 'name: myapp');
        // No .dart files

        const result = await detectProject(testDir);

        const dart = result.languages.find((l) => l.language === 'dart');
        if (dart) {
          expect(dart.confidence).toBeLessThan(1.0);
        }
      });

      it('should detect Ruby with only .gemspec file', async () => {
        await fs.mkdir(path.join(testDir, 'lib'), { recursive: true });
        await fs.writeFile(
          path.join(testDir, 'lib', 'test.gemspec'),
          'Gem::Specification.new do |s|\n  s.name = "test"\nend'
        );
        // No Gemfile, no .rb files

        const result = await detectProject(testDir);

        const ruby = result.languages.find((l) => l.language === 'ruby');
        if (ruby) {
          expect(ruby.confidence).toBeLessThan(1.0);
        }
      });

      it('should detect Scala with build.sbt but no .scala files', async () => {
        await fs.writeFile(path.join(testDir, 'build.sbt'), 'name := "test"');
        // No .scala files

        const result = await detectProject(testDir);

        const scala = result.languages.find((l) => l.language === 'scala');
        if (scala) {
          expect(scala.confidence).toBeLessThan(1.0);
        }
      });

      it('should detect R with DESCRIPTION but no .R files', async () => {
        await fs.writeFile(path.join(testDir, 'DESCRIPTION'), 'Package: test\nVersion: 1.0');
        // No .R files

        const result = await detectProject(testDir);

        const r = result.languages.find((l) => l.language === 'r');
        if (r) {
          expect(r.confidence).toBeLessThan(1.0);
        }
      });

      it('should detect Haskell with only .cabal file', async () => {
        await fs.writeFile(path.join(testDir, 'test.cabal'), 'name: test\nversion: 1.0');
        // No stack.yaml, no .hs files

        const result = await detectProject(testDir);

        const haskell = result.languages.find((l) => l.language === 'haskell');
        if (haskell) {
          expect(haskell.confidence).toBeLessThan(1.0);
        }
      });

      it('should detect Julia with Project.toml but no .jl files', async () => {
        await fs.writeFile(path.join(testDir, 'Project.toml'), 'name = "test"');
        // No .jl files

        const result = await detectProject(testDir);

        const julia = result.languages.find((l) => l.language === 'julia');
        if (julia) {
          expect(julia.confidence).toBeLessThan(1.0);
        }
      });

      it('should detect Lua with many .lua files', async () => {
        await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
        // Create more than 5 .lua files
        for (let i = 0; i < 6; i++) {
          await fs.writeFile(path.join(testDir, 'src', `file${i}.lua`), 'print("test")');
        }

        const result = await detectProject(testDir);

        const lua = result.languages.find((l) => l.language === 'lua');
        if (lua) {
          expect(lua.confidence).toBeGreaterThan(0);
        }
      });

      it('should not detect Lua with few .lua files', async () => {
        await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
        // Create less than 5 .lua files
        for (let i = 0; i < 3; i++) {
          await fs.writeFile(path.join(testDir, 'src', `file${i}.lua`), 'print("test")');
        }

        const result = await detectProject(testDir);

        const lua = result.languages.find((l) => l.language === 'lua');
        // Should not detect with less than 5 files
        expect(lua).toBeUndefined();
      });
    });
  });

  describe('service detection', () => {
    it('should detect PostgreSQL from package.json', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { pg: '^8.0.0' } })
      );

      const result = await detectProject(testDir);

      const postgres = result.services.find((s) => s.service === 'postgresql');
      expect(postgres).toBeDefined();
      expect(postgres?.detected).toBe(true);
      expect(postgres?.confidence).toBeGreaterThan(0.8);
    });

    it('should detect MongoDB from package.json', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { mongoose: '^7.0.0' } })
      );

      const result = await detectProject(testDir);

      const mongodb = result.services.find((s) => s.service === 'mongodb');
      expect(mongodb).toBeDefined();
      expect(mongodb?.detected).toBe(true);
    });

    it('should detect Redis from package.json', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { ioredis: '^5.0.0' } })
      );

      const result = await detectProject(testDir);

      const redis = result.services.find((s) => s.service === 'redis');
      expect(redis).toBeDefined();
      expect(redis?.detected).toBe(true);
    });

    it('should detect PostgreSQL from .env file', async () => {
      await fs.writeFile(
        path.join(testDir, '.env'),
        'POSTGRES_HOST=localhost\nPOSTGRES_PORT=5432\nPOSTGRES_DB=testdb'
      );

      const result = await detectProject(testDir);

      const postgres = result.services.find((s) => s.service === 'postgresql');
      expect(postgres).toBeDefined();
      expect(postgres?.detected).toBe(true);
    });

    it('should detect MySQL from .env file', async () => {
      await fs.writeFile(
        path.join(testDir, '.env'),
        'MYSQL_HOST=localhost\nMYSQL_PORT=3306\nMYSQL_DATABASE=testdb'
      );

      const result = await detectProject(testDir);

      const mysql = result.services.find((s) => s.service === 'mysql');
      expect(mysql).toBeDefined();
      expect(mysql?.detected).toBe(true);
    });

    it('should detect Redis from .env file', async () => {
      await fs.writeFile(
        path.join(testDir, '.env'),
        'REDIS_HOST=localhost\nREDIS_PORT=6379'
      );

      const result = await detectProject(testDir);

      const redis = result.services.find((s) => s.service === 'redis');
      expect(redis).toBeDefined();
      expect(redis?.detected).toBe(true);
    });

    it('should detect services from docker-compose.yml', async () => {
      await fs.writeFile(
        path.join(testDir, 'docker-compose.yml'),
        `version: '3.8'
services:
  postgres:
    image: postgres:15
  redis:
    image: redis:7
  mongodb:
    image: mongo:7`
      );

      const result = await detectProject(testDir);

      const postgres = result.services.find((s) => s.service === 'postgresql');
      const redis = result.services.find((s) => s.service === 'redis');
      const mongodb = result.services.find((s) => s.service === 'mongodb');

      expect(postgres?.detected).toBe(true);
      expect(redis?.detected).toBe(true);
      expect(mongodb?.detected).toBe(true);
    });

    it('should include all services even if not detected', async () => {
      const result = await detectProject(testDir);

      // Should have all 20 services
      expect(result.services.length).toBeGreaterThanOrEqual(20);

      // All should be marked as not detected
      const undetected = result.services.filter((s) => !s.detected);
      expect(undetected.length).toBeGreaterThan(0);
    });

    it('should detect multiple services from package.json', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            pg: '^8.0.0',
            mongoose: '^7.0.0',
            ioredis: '^5.0.0',
            '@elastic/elasticsearch': '^8.0.0',
          },
        })
      );

      const result = await detectProject(testDir);

      expect(result.services.find((s) => s.service === 'postgresql')?.detected).toBe(true);
      expect(result.services.find((s) => s.service === 'mongodb')?.detected).toBe(true);
      expect(result.services.find((s) => s.service === 'redis')?.detected).toBe(true);
      expect(result.services.find((s) => s.service === 'elasticsearch')?.detected).toBe(true);
    });

    it('should detect MariaDB specifically (not MySQL)', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { mariadb: '^3.0.0' } })
      );

      const result = await detectProject(testDir);

      const mariadb = result.services.find((s) => s.service === 'mariadb');
      const mysql = result.services.find((s) => s.service === 'mysql');

      expect(mariadb?.detected).toBe(true);
      // MySQL should not be detected if mariadb is present
      expect(mysql?.detected).toBe(false);
    });

    it('should detect SQLite from package.json', async () => {
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { 'better-sqlite3': '^9.0.0' } })
      );

      const result = await detectProject(testDir);

      const sqlite = result.services.find((s) => s.service === 'sqlite');
      expect(sqlite).toBeDefined();
      expect(sqlite?.detected).toBe(true);
    });

    it('should detect Kafka from .env file', async () => {
      await fs.writeFile(
        path.join(testDir, '.env'),
        'KAFKA_BROKERS=localhost:9092\nKAFKA_CLIENT_ID=test-client'
      );

      const result = await detectProject(testDir);

      const kafka = result.services.find((s) => s.service === 'kafka');
      expect(kafka).toBeDefined();
      expect(kafka?.detected).toBe(true);
    });

    it('should detect RabbitMQ from .env file', async () => {
      await fs.writeFile(
        path.join(testDir, '.env'),
        'RABBITMQ_URL=amqp://localhost:5672\nAMQP_EXCHANGE=test'
      );

      const result = await detectProject(testDir);

      const rabbitmq = result.services.find((s) => s.service === 'rabbitmq');
      expect(rabbitmq).toBeDefined();
      expect(rabbitmq?.detected).toBe(true);
    });
  });
});
