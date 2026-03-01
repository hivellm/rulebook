import path from 'path';
import { existsSync } from 'fs';
import { readdir } from 'fs/promises';
import { fileExists, findFiles, readFile, readJsonFile } from '../utils/file-system.js';
import type {
  DetectionResult,
  LanguageDetection,
  ModuleDetection,
  FrameworkDetection,
  FrameworkId,
  ServiceDetection,
  ServiceId,
  ExistingAgentsInfo,
  AgentBlock,
  MonorepoDetection,
} from '../types.js';

export async function detectProject(cwd: string = process.cwd()): Promise<DetectionResult> {
  const languages = await detectLanguages(cwd);
  const modules = await detectModules(cwd);
  const frameworks = await detectFrameworks(cwd, languages);
  const services = await detectServices(cwd);
  const existingAgents = await detectExistingAgents(cwd);
  const gitHooks = await detectGitHooks(cwd);
  const monorepo = await detectMonorepo(cwd);

  return {
    languages,
    modules,
    frameworks,
    services,
    existingAgents,
    gitHooks,
    monorepo,
  };
}

/**
 * Detect monorepo structure: Turborepo, Nx, pnpm workspaces, Lerna, or manual.
 */
export async function detectMonorepo(cwd: string): Promise<MonorepoDetection> {
  // Turborepo
  if (existsSync(path.join(cwd, 'turbo.json'))) {
    const packages = await discoverPackages(cwd);
    return { detected: true, tool: 'turborepo', packages };
  }

  // Nx
  if (existsSync(path.join(cwd, 'nx.json'))) {
    const packages = await discoverPackages(cwd);
    return { detected: true, tool: 'nx', packages };
  }

  // pnpm workspaces
  if (existsSync(path.join(cwd, 'pnpm-workspace.yaml'))) {
    const packages = await discoverPackages(cwd);
    return { detected: true, tool: 'pnpm', packages };
  }

  // Lerna
  if (existsSync(path.join(cwd, 'lerna.json'))) {
    const packages = await discoverPackages(cwd);
    return { detected: true, tool: 'lerna', packages };
  }

  // Manual monorepo — packages/ or apps/ directory with multiple package.json files
  const packages = await discoverPackages(cwd);
  if (packages.length >= 2) {
    return { detected: true, tool: 'manual', packages };
  }

  return { detected: false, tool: null, packages: [] };
}

/**
 * Discover package directories by looking for package.json in packages/ and apps/.
 */
async function discoverPackages(cwd: string): Promise<string[]> {
  const packageDirs: string[] = [];
  const searchDirs = ['packages', 'apps', 'libs', 'services'];

  for (const searchDir of searchDirs) {
    const absDir = path.join(cwd, searchDir);
    if (!existsSync(absDir)) continue;

    try {
      const entries = await readdir(absDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const pkgJson = path.join(absDir, entry.name, 'package.json');
        if (existsSync(pkgJson)) {
          packageDirs.push(`${searchDir}/${entry.name}`);
        }
      }
    } catch {
      // ignore unreadable dirs
    }
  }

  return packageDirs;
}

async function detectLanguages(cwd: string): Promise<LanguageDetection[]> {
  const detections: LanguageDetection[] = [];

  // Detect Rust
  const cargoToml = path.join(cwd, 'Cargo.toml');
  if (await fileExists(cargoToml)) {
    const rsFiles = await findFiles('**/*.rs', cwd);
    detections.push({
      language: 'rust',
      confidence: rsFiles.length > 0 ? 1.0 : 0.8,
      indicators: ['Cargo.toml', `${rsFiles.length} .rs files`],
    });
  }

  // Detect TypeScript
  const packageJson = path.join(cwd, 'package.json');
  const tsConfig = path.join(cwd, 'tsconfig.json');
  if ((await fileExists(packageJson)) || (await fileExists(tsConfig))) {
    const tsFiles = await findFiles('**/*.ts', cwd);
    detections.push({
      language: 'typescript',
      confidence: tsFiles.length > 0 ? 1.0 : 0.7,
      indicators: [
        (await fileExists(packageJson)) ? 'package.json' : '',
        (await fileExists(tsConfig)) ? 'tsconfig.json' : '',
        `${tsFiles.length} .ts files`,
      ].filter(Boolean),
    });
  }

  // Detect Python
  const pyprojectToml = path.join(cwd, 'pyproject.toml');
  const requirementsTxt = path.join(cwd, 'requirements.txt');
  const setupPy = path.join(cwd, 'setup.py');
  if (
    (await fileExists(pyprojectToml)) ||
    (await fileExists(requirementsTxt)) ||
    (await fileExists(setupPy))
  ) {
    const pyFiles = await findFiles('**/*.py', cwd);
    detections.push({
      language: 'python',
      confidence: pyFiles.length > 0 ? 1.0 : 0.7,
      indicators: [
        (await fileExists(pyprojectToml)) ? 'pyproject.toml' : '',
        (await fileExists(requirementsTxt)) ? 'requirements.txt' : '',
        (await fileExists(setupPy)) ? 'setup.py' : '',
        `${pyFiles.length} .py files`,
      ].filter(Boolean),
    });
  }

  // Detect Go
  const goMod = path.join(cwd, 'go.mod');
  if (await fileExists(goMod)) {
    const goFiles = await findFiles('**/*.go', cwd);
    detections.push({
      language: 'go',
      confidence: goFiles.length > 0 ? 1.0 : 0.8,
      indicators: ['go.mod', `${goFiles.length} .go files`],
    });
  }

  // Detect Java
  const pomXml = path.join(cwd, 'pom.xml');
  const buildGradle = path.join(cwd, 'build.gradle');
  const buildGradleKts = path.join(cwd, 'build.gradle.kts');
  if (
    (await fileExists(pomXml)) ||
    (await fileExists(buildGradle)) ||
    (await fileExists(buildGradleKts))
  ) {
    const javaFiles = await findFiles('**/*.java', cwd);
    detections.push({
      language: 'java',
      confidence: javaFiles.length > 0 ? 1.0 : 0.7,
      indicators: [
        (await fileExists(pomXml)) ? 'pom.xml' : '',
        (await fileExists(buildGradle)) ? 'build.gradle' : '',
        (await fileExists(buildGradleKts)) ? 'build.gradle.kts' : '',
        `${javaFiles.length} .java files`,
      ].filter(Boolean),
    });
  }

  // Detect C/C++
  const cmakeLists = path.join(cwd, 'CMakeLists.txt');
  const makeFile = path.join(cwd, 'Makefile');
  if ((await fileExists(cmakeLists)) || (await fileExists(makeFile))) {
    const cppFiles = await findFiles('**/*.{cpp,hpp,cc,h,c}', cwd);
    detections.push({
      language: 'cpp',
      confidence: cppFiles.length > 0 ? 1.0 : 0.8,
      indicators: [
        (await fileExists(cmakeLists)) ? 'CMakeLists.txt' : '',
        (await fileExists(makeFile)) ? 'Makefile' : '',
        `${cppFiles.length} C/C++ files`,
      ].filter(Boolean),
    });
  }

  // Detect Solidity
  const hardhatConfig = path.join(cwd, 'hardhat.config.js');
  const foundryToml = path.join(cwd, 'foundry.toml');
  if ((await fileExists(hardhatConfig)) || (await fileExists(foundryToml))) {
    const solFiles = await findFiles('**/*.sol', cwd);
    detections.push({
      language: 'solidity',
      confidence: solFiles.length > 0 ? 1.0 : 0.8,
      indicators: [
        (await fileExists(hardhatConfig)) ? 'hardhat.config.js' : '',
        (await fileExists(foundryToml)) ? 'foundry.toml' : '',
        `${solFiles.length} .sol files`,
      ].filter(Boolean),
    });
  }

  // Detect Zig
  const buildZig = path.join(cwd, 'build.zig');
  if (await fileExists(buildZig)) {
    const zigFiles = await findFiles('**/*.zig', cwd);
    detections.push({
      language: 'zig',
      confidence: zigFiles.length > 0 ? 1.0 : 0.9,
      indicators: ['build.zig', `${zigFiles.length} .zig files`],
    });
  }

  // Detect Erlang
  const rebarConfig = path.join(cwd, 'rebar.config');
  if (await fileExists(rebarConfig)) {
    const erlFiles = await findFiles('**/*.erl', cwd);
    detections.push({
      language: 'erlang',
      confidence: erlFiles.length > 0 ? 1.0 : 0.8,
      indicators: ['rebar.config', `${erlFiles.length} .erl files`],
    });
  }

  // Detect JavaScript (pure, not TypeScript)
  if (await fileExists(packageJson)) {
    const jsFiles = await findFiles('**/*.js', cwd);
    const hasTS = detections.some((d) => d.language === 'typescript');
    if (!hasTS && jsFiles.length > 0) {
      const pkg = await readJsonFile<{ type?: string }>(packageJson);
      detections.push({
        language: 'javascript',
        confidence: 0.9,
        indicators: [
          'package.json',
          `${jsFiles.length} .js files`,
          pkg?.type === 'module' ? 'ESM' : '',
        ].filter(Boolean),
      });
    }
  }

  // Detect Dart
  const pubspecYaml = path.join(cwd, 'pubspec.yaml');
  if (await fileExists(pubspecYaml)) {
    const dartFiles = await findFiles('**/*.dart', cwd);
    detections.push({
      language: 'dart',
      confidence: dartFiles.length > 0 ? 1.0 : 0.8,
      indicators: ['pubspec.yaml', `${dartFiles.length} .dart files`],
    });
  }

  // Detect Ruby
  const gemfile = path.join(cwd, 'Gemfile');
  const gemspec = await findFiles('**/*.gemspec', cwd);
  if ((await fileExists(gemfile)) || gemspec.length > 0) {
    const rbFiles = await findFiles('**/*.rb', cwd);
    detections.push({
      language: 'ruby',
      confidence: rbFiles.length > 0 ? 1.0 : 0.7,
      indicators: [
        (await fileExists(gemfile)) ? 'Gemfile' : '',
        gemspec.length > 0 ? `${gemspec.length} .gemspec` : '',
        `${rbFiles.length} .rb files`,
      ].filter(Boolean),
    });
  }

  // Detect Scala
  const buildSbt = path.join(cwd, 'build.sbt');
  if (await fileExists(buildSbt)) {
    const scalaFiles = await findFiles('**/*.scala', cwd);
    detections.push({
      language: 'scala',
      confidence: scalaFiles.length > 0 ? 1.0 : 0.8,
      indicators: ['build.sbt', `${scalaFiles.length} .scala files`],
    });
  }

  // Detect R
  const descriptionFile = path.join(cwd, 'DESCRIPTION');
  if (await fileExists(descriptionFile)) {
    const rFiles = await findFiles('**/*.R', cwd);
    detections.push({
      language: 'r',
      confidence: rFiles.length > 0 ? 1.0 : 0.8,
      indicators: ['DESCRIPTION', `${rFiles.length} .R files`],
    });
  }

  // Detect Haskell
  const stackYaml = path.join(cwd, 'stack.yaml');
  const cabalFiles = await findFiles('**/*.cabal', cwd);
  if ((await fileExists(stackYaml)) || cabalFiles.length > 0) {
    const hsFiles = await findFiles('**/*.hs', cwd);
    detections.push({
      language: 'haskell',
      confidence: hsFiles.length > 0 ? 1.0 : 0.8,
      indicators: [
        (await fileExists(stackYaml)) ? 'stack.yaml' : '',
        cabalFiles.length > 0 ? `${cabalFiles.length} .cabal` : '',
        `${hsFiles.length} .hs files`,
      ].filter(Boolean),
    });
  }

  // Detect Julia
  const projectToml = path.join(cwd, 'Project.toml');
  if (await fileExists(projectToml)) {
    const jlFiles = await findFiles('**/*.jl', cwd);
    detections.push({
      language: 'julia',
      confidence: jlFiles.length > 0 ? 1.0 : 0.8,
      indicators: ['Project.toml', `${jlFiles.length} .jl files`],
    });
  }

  // Detect Lua
  const luaFiles = await findFiles('**/*.lua', cwd);
  if (luaFiles.length > 5) {
    detections.push({
      language: 'lua',
      confidence: 0.9,
      indicators: [`${luaFiles.length} .lua files`],
    });
  }

  // Sort by confidence
  return detections.sort((a, b) => b.confidence - a.confidence);
}

async function detectFrameworks(
  cwd: string,
  languages: LanguageDetection[]
): Promise<FrameworkDetection[]> {
  const packageJsonPath = path.join(cwd, 'package.json');
  let packageJson: Record<string, unknown> | null = null;
  if (await fileExists(packageJsonPath)) {
    try {
      packageJson = await readJsonFile<Record<string, unknown>>(packageJsonPath);
    } catch {
      packageJson = null;
    }
  }

  const composerJsonPath = path.join(cwd, 'composer.json');
  let composerJson: Record<string, unknown> | null = null;
  if (await fileExists(composerJsonPath)) {
    try {
      composerJson = await readJsonFile<Record<string, unknown>>(composerJsonPath);
    } catch {
      composerJson = null;
    }
  }

  const languageSet = new Set(languages.map((l) => l.language));
  const npmDeps: Record<string, string> = {
    ...(packageJson && typeof packageJson === 'object'
      ? ((
          packageJson as {
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
          }
        ).dependencies ?? {})
      : {}),
    ...(packageJson && typeof packageJson === 'object'
      ? ((
          packageJson as {
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
          }
        ).devDependencies ?? {})
      : {}),
  };

  const phpDeps: Record<string, string> = {
    ...(composerJson && typeof composerJson === 'object'
      ? ((
          composerJson as {
            require?: Record<string, string>;
            'require-dev'?: Record<string, string>;
          }
        ).require ?? {})
      : {}),
    ...(composerJson && typeof composerJson === 'object'
      ? ((
          composerJson as {
            require?: Record<string, string>;
            'require-dev'?: Record<string, string>;
          }
        )['require-dev'] ?? {})
      : {}),
  };

  const frameworkDefinitions: Array<{
    id: FrameworkId;
    label: string;
    languages: LanguageDetection['language'][];
    detect: () => Promise<{ detected: boolean; confidence: number; indicators: string[] }>;
  }> = [
    {
      id: 'nestjs',
      label: 'NestJS',
      languages: ['typescript', 'javascript'],
      detect: async () => {
        if (npmDeps['@nestjs/core'] || npmDeps['@nestjs/common']) {
          return {
            detected: true,
            confidence: 0.95,
            indicators: ['package.json:@nestjs/core'],
          };
        }

        const nestCli = path.join(cwd, 'nest-cli.json');
        if (await fileExists(nestCli)) {
          return {
            detected: true,
            confidence: 0.9,
            indicators: ['nest-cli.json'],
          };
        }

        return { detected: false, confidence: 0, indicators: [] };
      },
    },
    {
      id: 'spring',
      label: 'Spring Boot',
      languages: ['java', 'kotlin'],
      detect: async () => {
        const pomPath = path.join(cwd, 'pom.xml');
        if (await fileExists(pomPath)) {
          const content = await readFile(pomPath);
          if (content.includes('spring-boot-starter')) {
            return {
              detected: true,
              confidence: 0.95,
              indicators: ['pom.xml:spring-boot-starter'],
            };
          }
        }

        const gradlePath = await findFirstExisting([
          path.join(cwd, 'build.gradle'),
          path.join(cwd, 'build.gradle.kts'),
        ]);
        if (gradlePath) {
          const content = await readFile(gradlePath);
          if (content.includes('spring-boot-starter')) {
            return {
              detected: true,
              confidence: 0.9,
              indicators: [`${path.basename(gradlePath)}:spring-boot-starter`],
            };
          }
        }

        return { detected: false, confidence: 0, indicators: [] };
      },
    },
    {
      id: 'laravel',
      label: 'Laravel',
      languages: ['php'],
      detect: async () => {
        if (phpDeps['laravel/framework']) {
          return {
            detected: true,
            confidence: 0.95,
            indicators: ['composer.json:laravel/framework'],
          };
        }

        const artisanPath = path.join(cwd, 'artisan');
        if (await fileExists(artisanPath)) {
          return {
            detected: true,
            confidence: 0.9,
            indicators: ['artisan'],
          };
        }

        return { detected: false, confidence: 0, indicators: [] };
      },
    },
    {
      id: 'angular',
      label: 'Angular',
      languages: ['typescript', 'javascript'],
      detect: async () => {
        if (npmDeps['@angular/core']) {
          return {
            detected: true,
            confidence: 0.95,
            indicators: ['package.json:@angular/core'],
          };
        }

        const angularConfig = path.join(cwd, 'angular.json');
        if (await fileExists(angularConfig)) {
          return {
            detected: true,
            confidence: 0.9,
            indicators: ['angular.json'],
          };
        }

        return { detected: false, confidence: 0, indicators: [] };
      },
    },
    {
      id: 'react',
      label: 'React',
      languages: ['typescript', 'javascript'],
      detect: async () => {
        if (npmDeps.react && (npmDeps['react-dom'] || npmDeps['react-native'])) {
          const indicator = npmDeps['react-dom'] ? 'react-dom' : 'react-native';
          return {
            detected: true,
            confidence: 0.9,
            indicators: [`package.json:react`, `package.json:${indicator}`],
          };
        }
        return { detected: false, confidence: 0, indicators: [] };
      },
    },
    {
      id: 'vue',
      label: 'Vue.js',
      languages: ['typescript', 'javascript'],
      detect: async () => {
        if (npmDeps.vue) {
          return {
            detected: true,
            confidence: 0.9,
            indicators: ['package.json:vue'],
          };
        }

        const vueConfig = await findFirstExisting([
          path.join(cwd, 'vite.config.ts'),
          path.join(cwd, 'vite.config.js'),
        ]);
        if (vueConfig) {
          const content = await readFile(vueConfig);
          if (content.includes('@vitejs/plugin-vue') || content.includes('vue()')) {
            return {
              detected: true,
              confidence: 0.8,
              indicators: [path.basename(vueConfig)],
            };
          }
        }

        return { detected: false, confidence: 0, indicators: [] };
      },
    },
    {
      id: 'nuxt',
      label: 'Nuxt',
      languages: ['typescript', 'javascript'],
      detect: async () => {
        if (npmDeps.nuxt) {
          return {
            detected: true,
            confidence: 0.9,
            indicators: ['package.json:nuxt'],
          };
        }

        const nuxtConfig = await findFiles('nuxt.config.*', cwd);
        if (nuxtConfig.length > 0) {
          return {
            detected: true,
            confidence: 0.85,
            indicators: [path.basename(nuxtConfig[0])],
          };
        }

        return { detected: false, confidence: 0, indicators: [] };
      },
    },
    {
      id: 'django',
      label: 'Django',
      languages: ['python'],
      detect: async () => {
        const requirementsPath = path.join(cwd, 'requirements.txt');
        if (await fileExists(requirementsPath)) {
          const content = await readFile(requirementsPath);
          if (content.includes('Django')) {
            return {
              detected: true,
              confidence: 0.95,
              indicators: ['requirements.txt:Django'],
            };
          }
        }

        const managePy = path.join(cwd, 'manage.py');
        if (await fileExists(managePy)) {
          const content = await readFile(managePy);
          if (content.includes('django')) {
            return {
              detected: true,
              confidence: 0.9,
              indicators: ['manage.py'],
            };
          }
        }

        return { detected: false, confidence: 0, indicators: [] };
      },
    },
    {
      id: 'flask',
      label: 'Flask',
      languages: ['python'],
      detect: async () => {
        const requirementsPath = path.join(cwd, 'requirements.txt');
        if (await fileExists(requirementsPath)) {
          const content = await readFile(requirementsPath);
          if (content.includes('Flask')) {
            return {
              detected: true,
              confidence: 0.95,
              indicators: ['requirements.txt:Flask'],
            };
          }
        }

        return { detected: false, confidence: 0, indicators: [] };
      },
    },
    {
      id: 'rails',
      label: 'Ruby on Rails',
      languages: ['ruby'],
      detect: async () => {
        const gemfilePath = path.join(cwd, 'Gemfile');
        if (await fileExists(gemfilePath)) {
          const content = await readFile(gemfilePath);
          if (content.includes('rails')) {
            return {
              detected: true,
              confidence: 0.95,
              indicators: ['Gemfile:rails'],
            };
          }
        }

        const railsPath = path.join(cwd, 'bin', 'rails');
        if (await fileExists(railsPath)) {
          return {
            detected: true,
            confidence: 0.9,
            indicators: ['bin/rails'],
          };
        }

        return { detected: false, confidence: 0, indicators: [] };
      },
    },
    {
      id: 'symfony',
      label: 'Symfony',
      languages: ['php'],
      detect: async () => {
        if (phpDeps['symfony/framework-bundle']) {
          return {
            detected: true,
            confidence: 0.95,
            indicators: ['composer.json:symfony/framework-bundle'],
          };
        }

        const symfonyConfig = path.join(cwd, 'symfony.lock');
        if (await fileExists(symfonyConfig)) {
          return {
            detected: true,
            confidence: 0.9,
            indicators: ['symfony.lock'],
          };
        }

        return { detected: false, confidence: 0, indicators: [] };
      },
    },
    {
      id: 'zend',
      label: 'Zend Framework',
      languages: ['php'],
      detect: async () => {
        if (phpDeps['zendframework/zendframework'] || phpDeps['laminas/laminas-mvc']) {
          return {
            detected: true,
            confidence: 0.95,
            indicators: ['composer.json:zendframework or laminas'],
          };
        }

        return { detected: false, confidence: 0, indicators: [] };
      },
    },
    {
      id: 'jquery',
      label: 'jQuery',
      languages: ['javascript', 'typescript'],
      detect: async () => {
        if (npmDeps['jquery']) {
          return {
            detected: true,
            confidence: 0.95,
            indicators: ['package.json:jquery'],
          };
        }

        // Check for jQuery in HTML files
        const indexHtml = path.join(cwd, 'index.html');
        if (await fileExists(indexHtml)) {
          const content = await readFile(indexHtml);
          if (content.includes('jquery') || content.includes('jQuery')) {
            return {
              detected: true,
              confidence: 0.8,
              indicators: ['index.html:jquery'],
            };
          }
        }

        return { detected: false, confidence: 0, indicators: [] };
      },
    },
    {
      id: 'reactnative',
      label: 'React Native',
      languages: ['javascript', 'typescript'],
      detect: async () => {
        if (npmDeps['react-native']) {
          return {
            detected: true,
            confidence: 0.95,
            indicators: ['package.json:react-native'],
          };
        }

        const appJson = path.join(cwd, 'app.json');
        if (await fileExists(appJson)) {
          const content = await readFile(appJson);
          if (content.includes('react-native') || content.includes('expo')) {
            return {
              detected: true,
              confidence: 0.9,
              indicators: ['app.json'],
            };
          }
        }

        return { detected: false, confidence: 0, indicators: [] };
      },
    },
    {
      id: 'flutter',
      label: 'Flutter',
      languages: ['dart'],
      detect: async () => {
        const pubspecPath = path.join(cwd, 'pubspec.yaml');
        if (await fileExists(pubspecPath)) {
          const content = await readFile(pubspecPath);
          if (content.includes('flutter:')) {
            return {
              detected: true,
              confidence: 0.95,
              indicators: ['pubspec.yaml:flutter'],
            };
          }
        }

        return { detected: false, confidence: 0, indicators: [] };
      },
    },
    {
      id: 'nextjs',
      label: 'Next.js',
      languages: ['typescript', 'javascript'],
      detect: async () => {
        if (npmDeps['next']) {
          return {
            detected: true,
            confidence: 0.95,
            indicators: ['package.json:next'],
          };
        }

        const nextConfig = await findFirstExisting([
          path.join(cwd, 'next.config.js'),
          path.join(cwd, 'next.config.mjs'),
          path.join(cwd, 'next.config.ts'),
        ]);
        if (nextConfig) {
          return {
            detected: true,
            confidence: 0.9,
            indicators: [path.basename(nextConfig)],
          };
        }

        return { detected: false, confidence: 0, indicators: [] };
      },
    },
    {
      id: 'electron',
      label: 'Electron',
      languages: ['typescript', 'javascript'],
      detect: async () => {
        if (npmDeps['electron']) {
          return {
            detected: true,
            confidence: 0.95,
            indicators: ['package.json:electron'],
          };
        }

        // Check for electron-builder or electron-forge
        if (npmDeps['electron-builder'] || npmDeps['@electron-forge/cli']) {
          return {
            detected: true,
            confidence: 0.9,
            indicators: ['package.json:electron-builder or electron-forge'],
          };
        }

        return { detected: false, confidence: 0, indicators: [] };
      },
    },
  ];

  const detections: FrameworkDetection[] = [];

  for (const definition of frameworkDefinitions) {
    const match = await definition.detect();
    const availableLanguages = definition.languages.filter((lang) => languageSet.has(lang));
    const languagesForFramework =
      availableLanguages.length > 0 ? availableLanguages : definition.languages;

    detections.push({
      framework: definition.id,
      detected: match.detected,
      languages: languagesForFramework,
      confidence: match.confidence,
      indicators: match.indicators,
    });
  }

  return detections.sort((a, b) => b.confidence - a.confidence);
}

interface MCPConfig {
  mcpServers?: Record<string, unknown>;
  servers?: Record<string, unknown>;
}

async function detectModules(cwd: string): Promise<ModuleDetection[]> {
  const modules: ModuleDetection[] = [];

  // Check for MCP configuration files
  const mcpConfigPaths = [
    path.join(cwd, 'mcp.json'),
    path.join(cwd, 'mcp-config.json'),
    path.join(cwd, '.cursor', 'mcp.json'),
  ];

  for (const mcpPath of mcpConfigPaths) {
    if (await fileExists(mcpPath)) {
      try {
        const config = await readJsonFile<MCPConfig>(mcpPath);
        if (config) {
          // Check for Vectorizer
          if (config.mcpServers?.vectorizer || config.servers?.vectorizer) {
            modules.push({
              module: 'vectorizer',
              detected: true,
              source: mcpPath,
            });
          }

          // Check for Synap
          if (config.mcpServers?.synap || config.servers?.synap) {
            modules.push({
              module: 'synap',
              detected: true,
              source: mcpPath,
            });
          }

          // Check for Context7
          if (config.mcpServers?.context7 || config.servers?.context7) {
            modules.push({
              module: 'context7',
              detected: true,
              source: mcpPath,
            });
          }

          // Check for GitHub MCP Server
          if (config.mcpServers?.github || config.servers?.github) {
            modules.push({
              module: 'github',
              detected: true,
              source: mcpPath,
            });
          }

          // Check for Playwright MCP Server
          if (config.mcpServers?.playwright || config.servers?.playwright) {
            modules.push({
              module: 'playwright',
              detected: true,
              source: mcpPath,
            });
          }

          // Check for Rulebook MCP Server
          if (config.mcpServers?.rulebook || config.servers?.rulebook) {
            modules.push({
              module: 'rulebook_mcp',
              detected: true,
              source: mcpPath,
            });
          }

          // Check for Sequential Thinking MCP Server (various key names)
          const seqKeys = ['sequential-thinking', 'sequential_thinking', 'sequentialThinking'];
          const hasSeqThinking =
            seqKeys.some((k) => config.mcpServers?.[k] || config.servers?.[k]) ||
            Object.entries(config.mcpServers ?? {}).some(([, v]) =>
              typeof v === 'object' &&
              v !== null &&
              'args' in v &&
              Array.isArray((v as { args?: unknown }).args) &&
              ((v as { args: string[] }).args).some((a) =>
                typeof a === 'string' && a.includes('sequential-thinking')
              )
            );
          if (hasSeqThinking) {
            modules.push({
              module: 'sequential_thinking',
              detected: true,
              source: mcpPath,
            });
          }
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
  }

  // Add undetected modules
  const detectedModules = new Set(modules.map((m) => m.module));
  const allModules: Array<
    'vectorizer' | 'synap' | 'context7' | 'github' | 'playwright' | 'rulebook_mcp' | 'sequential_thinking'
  > = ['vectorizer', 'synap', 'context7', 'github', 'playwright', 'rulebook_mcp', 'sequential_thinking'];

  for (const module of allModules) {
    if (!detectedModules.has(module)) {
      modules.push({
        module,
        detected: false,
      });
    }
  }

  return modules;
}

async function detectExistingAgents(cwd: string): Promise<ExistingAgentsInfo | null> {
  const agentsPath = path.join(cwd, 'AGENTS.md');

  if (!(await fileExists(agentsPath))) {
    return null;
  }

  const content = await readFile(agentsPath);
  const blocks = parseAgentBlocks(content);

  return {
    exists: true,
    path: agentsPath,
    content,
    blocks,
  };
}

function parseAgentBlocks(content: string): AgentBlock[] {
  const blocks: AgentBlock[] = [];
  const lines = content.split('\n');

  let currentBlock: { name: string; startLine: number; content: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const startMatch = line.match(/<!--\s*([A-Z_]+):START\s*-->/);
    const endMatch = line.match(/<!--\s*([A-Z_]+):END\s*-->/);

    if (startMatch) {
      currentBlock = {
        name: startMatch[1],
        startLine: i,
        content: [line],
      };
    } else if (endMatch && currentBlock) {
      currentBlock.content.push(line);
      blocks.push({
        name: currentBlock.name,
        startLine: currentBlock.startLine,
        endLine: i,
        content: currentBlock.content.join('\n'),
      });
      currentBlock = null;
    } else if (currentBlock) {
      currentBlock.content.push(line);
    }
  }

  return blocks;
}

async function detectGitHooks(
  cwd: string
): Promise<{ preCommitExists: boolean; prePushExists: boolean }> {
  const preCommitPath = path.join(cwd, '.git', 'hooks', 'pre-commit');
  const prePushPath = path.join(cwd, '.git', 'hooks', 'pre-push');

  return {
    preCommitExists: await fileExists(preCommitPath),
    prePushExists: await fileExists(prePushPath),
  };
}

async function findFirstExisting(pathsToCheck: string[]): Promise<string | null> {
  for (const filePath of pathsToCheck) {
    if (await fileExists(filePath)) {
      return filePath;
    }
  }
  return null;
}

async function detectServices(cwd: string): Promise<ServiceDetection[]> {
  const services: ServiceDetection[] = [];
  const packageJson = path.join(cwd, 'package.json');
  const envFile = path.join(cwd, '.env');
  const dockerCompose = path.join(cwd, 'docker-compose.yml');
  const dockerComposeYaml = path.join(cwd, 'docker-compose.yaml');

  // Check package.json for database drivers
  if (await fileExists(packageJson)) {
    try {
      const pkg = await readJsonFile<{
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      }>(packageJson);
      const allDeps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };

      // PostgreSQL
      if (allDeps['pg'] || allDeps['postgres'] || allDeps['@prisma/client']) {
        services.push({
          service: 'postgresql',
          detected: true,
          confidence: 0.9,
          indicators: ['pg', 'postgres', '@prisma/client'].filter((dep) => allDeps[dep]),
          source: packageJson,
        });
      }

      // MySQL/MariaDB
      if (allDeps['mysql2'] || allDeps['mysql'] || allDeps['mariadb']) {
        services.push({
          service: allDeps['mariadb'] ? 'mariadb' : 'mysql',
          detected: true,
          confidence: 0.9,
          indicators: ['mysql2', 'mysql', 'mariadb'].filter((dep) => allDeps[dep]),
          source: packageJson,
        });
      }

      // MongoDB
      if (allDeps['mongodb'] || allDeps['mongoose']) {
        services.push({
          service: 'mongodb',
          detected: true,
          confidence: 0.9,
          indicators: ['mongodb', 'mongoose'].filter((dep) => allDeps[dep]),
          source: packageJson,
        });
      }

      // Redis
      if (allDeps['redis'] || allDeps['ioredis'] || allDeps['@redis/client']) {
        services.push({
          service: 'redis',
          detected: true,
          confidence: 0.9,
          indicators: ['redis', 'ioredis', '@redis/client'].filter((dep) => allDeps[dep]),
          source: packageJson,
        });
      }

      // Memcached
      if (allDeps['memcached']) {
        services.push({
          service: 'memcached',
          detected: true,
          confidence: 0.9,
          indicators: ['memcached'],
          source: packageJson,
        });
      }

      // Elasticsearch
      if (allDeps['@elastic/elasticsearch'] || allDeps['elasticsearch']) {
        services.push({
          service: 'elasticsearch',
          detected: true,
          confidence: 0.9,
          indicators: ['@elastic/elasticsearch', 'elasticsearch'].filter((dep) => allDeps[dep]),
          source: packageJson,
        });
      }

      // Neo4j
      if (allDeps['neo4j-driver']) {
        services.push({
          service: 'neo4j',
          detected: true,
          confidence: 0.9,
          indicators: ['neo4j-driver'],
          source: packageJson,
        });
      }

      // InfluxDB
      if (allDeps['@influxdata/influxdb-client']) {
        services.push({
          service: 'influxdb',
          detected: true,
          confidence: 0.9,
          indicators: ['@influxdata/influxdb-client'],
          source: packageJson,
        });
      }

      // RabbitMQ
      if (allDeps['amqplib'] || allDeps['amqp-connection-manager']) {
        services.push({
          service: 'rabbitmq',
          detected: true,
          confidence: 0.9,
          indicators: ['amqplib', 'amqp-connection-manager'].filter((dep) => allDeps[dep]),
          source: packageJson,
        });
      }

      // Kafka
      if (allDeps['kafkajs'] || allDeps['node-rdkafka']) {
        services.push({
          service: 'kafka',
          detected: true,
          confidence: 0.9,
          indicators: ['kafkajs', 'node-rdkafka'].filter((dep) => allDeps[dep]),
          source: packageJson,
        });
      }

      // AWS S3
      if (allDeps['@aws-sdk/client-s3'] || allDeps['aws-sdk']) {
        services.push({
          service: 's3',
          detected: true,
          confidence: 0.8,
          indicators: ['@aws-sdk/client-s3', 'aws-sdk'].filter((dep) => allDeps[dep]),
          source: packageJson,
        });
      }

      // Azure Blob
      if (allDeps['@azure/storage-blob']) {
        services.push({
          service: 'azure_blob',
          detected: true,
          confidence: 0.9,
          indicators: ['@azure/storage-blob'],
          source: packageJson,
        });
      }

      // Google Cloud Storage
      if (allDeps['@google-cloud/storage']) {
        services.push({
          service: 'gcs',
          detected: true,
          confidence: 0.9,
          indicators: ['@google-cloud/storage'],
          source: packageJson,
        });
      }

      // MinIO
      if (allDeps['minio']) {
        services.push({
          service: 'minio',
          detected: true,
          confidence: 0.9,
          indicators: ['minio'],
          source: packageJson,
        });
      }

      // SQLite
      if (allDeps['better-sqlite3'] || allDeps['sqlite3']) {
        services.push({
          service: 'sqlite',
          detected: true,
          confidence: 0.9,
          indicators: ['better-sqlite3', 'sqlite3'].filter((dep) => allDeps[dep]),
          source: packageJson,
        });
      }

      // Cassandra
      if (allDeps['cassandra-driver']) {
        services.push({
          service: 'cassandra',
          detected: true,
          confidence: 0.9,
          indicators: ['cassandra-driver'],
          source: packageJson,
        });
      }

      // DynamoDB
      if (allDeps['@aws-sdk/client-dynamodb'] || allDeps['aws-sdk']) {
        services.push({
          service: 'dynamodb',
          detected: true,
          confidence: 0.8,
          indicators: ['@aws-sdk/client-dynamodb', 'aws-sdk'].filter((dep) => allDeps[dep]),
          source: packageJson,
        });
      }

      // SQL Server
      if (allDeps['mssql'] || allDeps['tedious']) {
        services.push({
          service: 'sqlserver',
          detected: true,
          confidence: 0.9,
          indicators: ['mssql', 'tedious'].filter((dep) => allDeps[dep]),
          source: packageJson,
        });
      }

      // Oracle
      if (allDeps['oracledb']) {
        services.push({
          service: 'oracle',
          detected: true,
          confidence: 0.9,
          indicators: ['oracledb'],
          source: packageJson,
        });
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Check .env file for service connection strings
  if (await fileExists(envFile)) {
    try {
      const envContent = await readFile(envFile);
      const envLines = envContent.split('\n');

      for (const line of envLines) {
        const upperLine = line.toUpperCase();

        // PostgreSQL
        if (
          upperLine.includes('POSTGRES') ||
          (upperLine.includes('DATABASE_URL') && upperLine.includes('POSTGRES'))
        ) {
          if (!services.find((s) => s.service === 'postgresql')) {
            services.push({
              service: 'postgresql',
              detected: true,
              confidence: 0.8,
              indicators: ['DATABASE_URL or POSTGRES_* env vars'],
              source: envFile,
            });
          }
        }

        // MySQL
        if (upperLine.includes('MYSQL') && !upperLine.includes('MARIADB')) {
          if (!services.find((s) => s.service === 'mysql')) {
            services.push({
              service: 'mysql',
              detected: true,
              confidence: 0.8,
              indicators: ['MYSQL_* env vars'],
              source: envFile,
            });
          }
        }

        // MariaDB
        if (upperLine.includes('MARIADB')) {
          if (!services.find((s) => s.service === 'mariadb')) {
            services.push({
              service: 'mariadb',
              detected: true,
              confidence: 0.8,
              indicators: ['MARIADB_* env vars'],
              source: envFile,
            });
          }
        }

        // MongoDB
        if (upperLine.includes('MONGODB')) {
          if (!services.find((s) => s.service === 'mongodb')) {
            services.push({
              service: 'mongodb',
              detected: true,
              confidence: 0.8,
              indicators: ['MONGODB_* env vars'],
              source: envFile,
            });
          }
        }

        // Redis
        if (upperLine.includes('REDIS')) {
          if (!services.find((s) => s.service === 'redis')) {
            services.push({
              service: 'redis',
              detected: true,
              confidence: 0.8,
              indicators: ['REDIS_* env vars'],
              source: envFile,
            });
          }
        }

        // Elasticsearch
        if (upperLine.includes('ELASTICSEARCH')) {
          if (!services.find((s) => s.service === 'elasticsearch')) {
            services.push({
              service: 'elasticsearch',
              detected: true,
              confidence: 0.8,
              indicators: ['ELASTICSEARCH_* env vars'],
              source: envFile,
            });
          }
        }

        // RabbitMQ
        if (upperLine.includes('RABBITMQ') || upperLine.includes('AMQP')) {
          if (!services.find((s) => s.service === 'rabbitmq')) {
            services.push({
              service: 'rabbitmq',
              detected: true,
              confidence: 0.8,
              indicators: ['RABBITMQ_* or AMQP_* env vars'],
              source: envFile,
            });
          }
        }

        // Kafka
        if (upperLine.includes('KAFKA')) {
          if (!services.find((s) => s.service === 'kafka')) {
            services.push({
              service: 'kafka',
              detected: true,
              confidence: 0.8,
              indicators: ['KAFKA_* env vars'],
              source: envFile,
            });
          }
        }

        // AWS S3
        if (upperLine.includes('S3_') || (upperLine.includes('AWS_') && upperLine.includes('S3'))) {
          if (!services.find((s) => s.service === 's3')) {
            services.push({
              service: 's3',
              detected: true,
              confidence: 0.7,
              indicators: ['S3_* or AWS_* env vars'],
              source: envFile,
            });
          }
        }

        // Azure Blob
        if (upperLine.includes('AZURE_STORAGE') || upperLine.includes('AZURE_BLOB')) {
          if (!services.find((s) => s.service === 'azure_blob')) {
            services.push({
              service: 'azure_blob',
              detected: true,
              confidence: 0.8,
              indicators: ['AZURE_STORAGE_* or AZURE_BLOB_* env vars'],
              source: envFile,
            });
          }
        }

        // Google Cloud Storage
        if (upperLine.includes('GCS_') || upperLine.includes('GCP_STORAGE')) {
          if (!services.find((s) => s.service === 'gcs')) {
            services.push({
              service: 'gcs',
              detected: true,
              confidence: 0.8,
              indicators: ['GCS_* or GCP_STORAGE_* env vars'],
              source: envFile,
            });
          }
        }

        // MinIO
        if (upperLine.includes('MINIO')) {
          if (!services.find((s) => s.service === 'minio')) {
            services.push({
              service: 'minio',
              detected: true,
              confidence: 0.8,
              indicators: ['MINIO_* env vars'],
              source: envFile,
            });
          }
        }

        // InfluxDB
        if (upperLine.includes('INFLUXDB')) {
          if (!services.find((s) => s.service === 'influxdb')) {
            services.push({
              service: 'influxdb',
              detected: true,
              confidence: 0.8,
              indicators: ['INFLUXDB_* env vars'],
              source: envFile,
            });
          }
        }

        // Neo4j
        if (upperLine.includes('NEO4J')) {
          if (!services.find((s) => s.service === 'neo4j')) {
            services.push({
              service: 'neo4j',
              detected: true,
              confidence: 0.8,
              indicators: ['NEO4J_* env vars'],
              source: envFile,
            });
          }
        }

        // SQL Server
        if (upperLine.includes('SQL_SERVER') || upperLine.includes('MSSQL')) {
          if (!services.find((s) => s.service === 'sqlserver')) {
            services.push({
              service: 'sqlserver',
              detected: true,
              confidence: 0.8,
              indicators: ['SQL_SERVER_* or MSSQL_* env vars'],
              source: envFile,
            });
          }
        }

        // Oracle
        if (upperLine.includes('ORACLE')) {
          if (!services.find((s) => s.service === 'oracle')) {
            services.push({
              service: 'oracle',
              detected: true,
              confidence: 0.8,
              indicators: ['ORACLE_* env vars'],
              source: envFile,
            });
          }
        }
      }
    } catch {
      // Ignore file read errors
    }
  }

  // Check docker-compose.yml for services
  const composeFiles = [dockerCompose, dockerComposeYaml];
  for (const composeFile of composeFiles) {
    if (await fileExists(composeFile)) {
      try {
        const composeContent = await readFile(composeFile);
        const upperContent = composeContent.toUpperCase();

        // PostgreSQL
        if (
          upperContent.includes('POSTGRES') &&
          !services.find((s) => s.service === 'postgresql')
        ) {
          services.push({
            service: 'postgresql',
            detected: true,
            confidence: 0.7,
            indicators: ['docker-compose.yml postgres service'],
            source: composeFile,
          });
        }

        // MySQL
        if (
          upperContent.includes('MYSQL') &&
          !upperContent.includes('MARIADB') &&
          !services.find((s) => s.service === 'mysql')
        ) {
          services.push({
            service: 'mysql',
            detected: true,
            confidence: 0.7,
            indicators: ['docker-compose.yml mysql service'],
            source: composeFile,
          });
        }

        // MariaDB
        if (upperContent.includes('MARIADB') && !services.find((s) => s.service === 'mariadb')) {
          services.push({
            service: 'mariadb',
            detected: true,
            confidence: 0.7,
            indicators: ['docker-compose.yml mariadb service'],
            source: composeFile,
          });
        }

        // MongoDB
        if (upperContent.includes('MONGO') && !services.find((s) => s.service === 'mongodb')) {
          services.push({
            service: 'mongodb',
            detected: true,
            confidence: 0.7,
            indicators: ['docker-compose.yml mongo service'],
            source: composeFile,
          });
        }

        // Redis
        if (upperContent.includes('REDIS') && !services.find((s) => s.service === 'redis')) {
          services.push({
            service: 'redis',
            detected: true,
            confidence: 0.7,
            indicators: ['docker-compose.yml redis service'],
            source: composeFile,
          });
        }

        // Memcached
        if (
          upperContent.includes('MEMCACHED') &&
          !services.find((s) => s.service === 'memcached')
        ) {
          services.push({
            service: 'memcached',
            detected: true,
            confidence: 0.7,
            indicators: ['docker-compose.yml memcached service'],
            source: composeFile,
          });
        }

        // Elasticsearch
        if (
          upperContent.includes('ELASTICSEARCH') &&
          !services.find((s) => s.service === 'elasticsearch')
        ) {
          services.push({
            service: 'elasticsearch',
            detected: true,
            confidence: 0.7,
            indicators: ['docker-compose.yml elasticsearch service'],
            source: composeFile,
          });
        }

        // Neo4j
        if (upperContent.includes('NEO4J') && !services.find((s) => s.service === 'neo4j')) {
          services.push({
            service: 'neo4j',
            detected: true,
            confidence: 0.7,
            indicators: ['docker-compose.yml neo4j service'],
            source: composeFile,
          });
        }

        // InfluxDB
        if (upperContent.includes('INFLUXDB') && !services.find((s) => s.service === 'influxdb')) {
          services.push({
            service: 'influxdb',
            detected: true,
            confidence: 0.7,
            indicators: ['docker-compose.yml influxdb service'],
            source: composeFile,
          });
        }

        // RabbitMQ
        if (upperContent.includes('RABBITMQ') && !services.find((s) => s.service === 'rabbitmq')) {
          services.push({
            service: 'rabbitmq',
            detected: true,
            confidence: 0.7,
            indicators: ['docker-compose.yml rabbitmq service'],
            source: composeFile,
          });
        }

        // Kafka
        if (upperContent.includes('KAFKA') && !services.find((s) => s.service === 'kafka')) {
          services.push({
            service: 'kafka',
            detected: true,
            confidence: 0.7,
            indicators: ['docker-compose.yml kafka service'],
            source: composeFile,
          });
        }

        // MinIO
        if (upperContent.includes('MINIO') && !services.find((s) => s.service === 'minio')) {
          services.push({
            service: 'minio',
            detected: true,
            confidence: 0.7,
            indicators: ['docker-compose.yml minio service'],
            source: composeFile,
          });
        }

        // SQL Server
        if (
          (upperContent.includes('SQLSERVER') || upperContent.includes('MSSQL')) &&
          !services.find((s) => s.service === 'sqlserver')
        ) {
          services.push({
            service: 'sqlserver',
            detected: true,
            confidence: 0.7,
            indicators: ['docker-compose.yml sqlserver service'],
            source: composeFile,
          });
        }
      } catch {
        // Ignore file read errors
      }
    }
  }

  // Add undetected services (for manual selection)
  const detectedServices = new Set(services.map((s) => s.service));
  const allServices: ServiceId[] = [
    'postgresql',
    'mysql',
    'mariadb',
    'sqlserver',
    'oracle',
    'sqlite',
    'mongodb',
    'cassandra',
    'dynamodb',
    'redis',
    'memcached',
    'elasticsearch',
    'neo4j',
    'influxdb',
    'rabbitmq',
    'kafka',
    's3',
    'azure_blob',
    'gcs',
    'minio',
  ];

  for (const service of allServices) {
    if (!detectedServices.has(service)) {
      services.push({
        service,
        detected: false,
        confidence: 0,
        indicators: [],
      });
    }
  }

  return services;
}
