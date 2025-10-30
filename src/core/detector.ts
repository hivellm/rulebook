import path from 'path';
import { fileExists, findFiles, readFile, readJsonFile } from '../utils/file-system.js';
import type {
  DetectionResult,
  LanguageDetection,
  ModuleDetection,
  FrameworkDetection,
  FrameworkId,
  ExistingAgentsInfo,
  AgentBlock,
} from '../types.js';

export async function detectProject(cwd: string = process.cwd()): Promise<DetectionResult> {
  const languages = await detectLanguages(cwd);
  const modules = await detectModules(cwd);
  const frameworks = await detectFrameworks(cwd, languages);
  const existingAgents = await detectExistingAgents(cwd);
  const gitHooks = await detectGitHooks(cwd);

  return {
    languages,
    modules,
    frameworks,
    existingAgents,
    gitHooks,
  };
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
      ? ((packageJson as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> })
          .dependencies ?? {})
      : {}),
    ...(packageJson && typeof packageJson === 'object'
      ? ((packageJson as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> })
          .devDependencies ?? {})
      : {}),
  };

  const phpDeps: Record<string, string> = {
    ...(composerJson && typeof composerJson === 'object'
      ? ((composerJson as { require?: Record<string, string>; 'require-dev'?: Record<string, string> })
          .require ?? {})
      : {}),
    ...(composerJson && typeof composerJson === 'object'
      ? ((composerJson as { require?: Record<string, string>; 'require-dev'?: Record<string, string> })
          ['require-dev'] ?? {})
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

        const gradlePath = await findFirstExisting([path.join(cwd, 'build.gradle'), path.join(cwd, 'build.gradle.kts')]);
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
  ];

  const detections: FrameworkDetection[] = [];

  for (const definition of frameworkDefinitions) {
    const match = await definition.detect();
    const availableLanguages = definition.languages.filter((lang) => languageSet.has(lang));
    const languagesForFramework = availableLanguages.length > 0 ? availableLanguages : definition.languages;

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
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
  }

  // Check for OpenSpec
  const openspecDirs = await findFiles('**/openspec', cwd);
  if (openspecDirs.length > 0) {
    modules.push({
      module: 'openspec',
      detected: true,
      source: openspecDirs[0],
    });
  }

  // Add undetected modules
  const detectedModules = new Set(modules.map((m) => m.module));
  const allModules: Array<
    'vectorizer' | 'synap' | 'openspec' | 'context7' | 'github' | 'playwright'
  > = ['vectorizer', 'synap', 'openspec', 'context7', 'github', 'playwright'];

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

async function detectGitHooks(cwd: string): Promise<{ preCommitExists: boolean; prePushExists: boolean }> {
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
