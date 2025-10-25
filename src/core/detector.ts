import path from 'path';
import { fileExists, findFiles, readFile, readJsonFile } from '../utils/file-system.js';
import type {
  DetectionResult,
  LanguageDetection,
  ModuleDetection,
  ExistingAgentsInfo,
  AgentBlock,
} from '../types.js';

export async function detectProject(cwd: string = process.cwd()): Promise<DetectionResult> {
  const languages = await detectLanguages(cwd);
  const modules = await detectModules(cwd);
  const existingAgents = await detectExistingAgents(cwd);

  return {
    languages,
    modules,
    existingAgents,
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

  // Sort by confidence
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
  const allModules: Array<'vectorizer' | 'synap' | 'openspec' | 'context7' | 'github' | 'playwright'> = [
    'vectorizer',
    'synap',
    'openspec',
    'context7',
    'github',
    'playwright',
  ];

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
