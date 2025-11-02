import { exec } from 'child_process';
import { promisify } from 'util';
import { fileExists, readFile, readJsonFile } from '../utils/file-system.js';
import path from 'path';

const execAsync = promisify(exec);

export interface DependencyCheckResult {
  outdated: OutdatedDependency[];
  vulnerable: VulnerableDependency[];
  total: number;
  upToDate: number;
}

export interface OutdatedDependency {
  name: string;
  current: string;
  latest: string;
  type: 'dependency' | 'devDependency';
}

export interface VulnerableDependency {
  name: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  url?: string;
}

export async function checkDependencies(
  cwd: string = process.cwd()
): Promise<DependencyCheckResult> {
  const result: DependencyCheckResult = {
    outdated: [],
    vulnerable: [],
    total: 0,
    upToDate: 0,
  };

  // Check for different project types
  const hasPackageJson = await fileExists(path.join(cwd, 'package.json'));
  const hasCargoToml = await fileExists(path.join(cwd, 'Cargo.toml'));
  const hasPyprojectToml = await fileExists(path.join(cwd, 'pyproject.toml'));
  const hasGoMod = await fileExists(path.join(cwd, 'go.mod'));

  if (hasPackageJson) {
    await checkNpmDependencies(cwd, result);
  }

  if (hasCargoToml) {
    await checkCargoDependencies(cwd, result);
  }

  if (hasPyprojectToml) {
    await checkPythonDependencies(cwd, result);
  }

  if (hasGoMod) {
    await checkGoDependencies(cwd, result);
  }

  return result;
}

interface NpmPackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface NpmOutdatedInfo {
  current: string;
  latest: string;
}

interface NpmVulnerability {
  severity: 'low' | 'moderate' | 'high' | 'critical';
  via?: Array<{ title?: string; url?: string }>;
}

async function checkNpmDependencies(cwd: string, result: DependencyCheckResult): Promise<void> {
  try {
    const packageJson = await readJsonFile<NpmPackageJson>(path.join(cwd, 'package.json'));
    if (!packageJson) return;

    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    result.total += Object.keys(deps).length;

    // Check for outdated
    try {
      const { stdout } = await execAsync('npm outdated --json', { cwd });
      const outdated: Record<string, NpmOutdatedInfo> = JSON.parse(stdout);

      for (const [name, info] of Object.entries(outdated)) {
        result.outdated.push({
          name,
          current: info.current,
          latest: info.latest,
          type: packageJson.dependencies?.[name] ? 'dependency' : 'devDependency',
        });
      }
    } catch {
      // npm outdated exits with code 1 when there are outdated packages
    }

    // Check for vulnerabilities
    try {
      const { stdout } = await execAsync('npm audit --json', { cwd });
      const audit: { vulnerabilities?: Record<string, NpmVulnerability> } = JSON.parse(stdout);

      if (audit.vulnerabilities) {
        for (const [name, vuln] of Object.entries(audit.vulnerabilities)) {
          result.vulnerable.push({
            name,
            severity: vuln.severity,
            title: vuln.via?.[0]?.title || 'Vulnerability found',
            url: vuln.via?.[0]?.url,
          });
        }
      }
    } catch {
      // Ignore audit errors
    }

    result.upToDate = result.total - result.outdated.length;
  } catch {
    // Ignore errors
  }
}

async function checkCargoDependencies(cwd: string, result: DependencyCheckResult): Promise<void> {
  try {
    const cargoToml = await readFile(path.join(cwd, 'Cargo.toml'));
    const depMatches = cargoToml.match(/\[dependencies\]([\s\S]*?)(\[|$)/);

    if (depMatches) {
      const deps = depMatches[1].split('\n').filter((l) => l.trim() && !l.startsWith('#'));
      result.total += deps.filter((l) => l.includes('=')).length;
    }

    // Check with cargo-outdated if available
    try {
      const { stdout } = await execAsync('cargo outdated --format json', { cwd });
      const outdated = JSON.parse(stdout);

      if (outdated.dependencies) {
        for (const dep of outdated.dependencies) {
          result.outdated.push({
            name: dep.name,
            current: dep.project,
            latest: dep.latest,
            type: 'dependency',
          });
        }
      }
    } catch {
      // cargo-outdated not installed or failed
    }

    // Check with cargo-audit if available
    try {
      const { stdout } = await execAsync('cargo audit --json', { cwd });
      const audit = JSON.parse(stdout);

      if (audit.vulnerabilities?.list) {
        for (const vuln of audit.vulnerabilities.list) {
          result.vulnerable.push({
            name: vuln.package?.name || 'unknown',
            severity: vuln.advisory?.severity || 'moderate',
            title: vuln.advisory?.title || 'Vulnerability found',
            url: vuln.advisory?.url,
          });
        }
      }
    } catch {
      // cargo-audit not installed or failed
    }

    result.upToDate = Math.max(0, result.total - result.outdated.length);
  } catch {
    // Ignore errors
  }
}

async function checkPythonDependencies(cwd: string, result: DependencyCheckResult): Promise<void> {
  try {
    // Check requirements.txt if exists
    const requirementsPath = path.join(cwd, 'requirements.txt');
    if (await fileExists(requirementsPath)) {
      const requirements = await readFile(requirementsPath);
      const deps = requirements.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
      result.total += deps.length;
    }

    // Check pyproject.toml if exists
    const pyprojectPath = path.join(cwd, 'pyproject.toml');
    if (await fileExists(pyprojectPath)) {
      const content = await readFile(pyprojectPath);
      const depMatches = content.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(\[|$)/);
      if (depMatches) {
        const deps = depMatches[1].split('\n').filter((l) => l.trim() && !l.startsWith('#'));
        result.total += deps.filter((l) => l.includes('=')).length;
      }
    }

    // Check with pip-audit if available
    try {
      const { stdout } = await execAsync('pip-audit --format json', { cwd });
      const audit = JSON.parse(stdout);

      if (audit.dependencies) {
        for (const dep of audit.dependencies) {
          if (dep.vulns && dep.vulns.length > 0) {
            for (const vuln of dep.vulns) {
              result.vulnerable.push({
                name: dep.name,
                severity: vuln.severity || 'moderate',
                title: vuln.description || 'Vulnerability found',
                url: vuln.url,
              });
            }
          }
        }
      }
    } catch {
      // pip-audit not installed or failed
    }

    result.upToDate = Math.max(0, result.total - result.outdated.length);
  } catch {
    // Ignore errors
  }
}

async function checkGoDependencies(cwd: string, result: DependencyCheckResult): Promise<void> {
  try {
    const goMod = await readFile(path.join(cwd, 'go.mod'));
    const requires = goMod.match(/require \(([\s\S]*?)\)/);

    if (requires) {
      const deps = requires[1].split('\n').filter((l) => l.trim() && !l.startsWith('//'));
      result.total += deps.length;
    }

    // Check with go list if available
    try {
      const { stdout } = await execAsync('go list -u -m -json all', { cwd });
      const modules = stdout
        .trim()
        .split('\n')
        .filter((l) => l)
        .map((l) => JSON.parse(l));

      for (const mod of modules) {
        if (mod.Update) {
          result.outdated.push({
            name: mod.Path,
            current: mod.Version,
            latest: mod.Update.Version,
            type: 'dependency',
          });
        }
      }
    } catch {
      // go list failed
    }

    result.upToDate = Math.max(0, result.total - result.outdated.length);
  } catch {
    // Ignore errors
  }
}

export function formatDependencyReport(result: DependencyCheckResult): string {
  const lines: string[] = [];

  lines.push('# Dependency Check Report');
  lines.push('');
  lines.push(`**Total Dependencies**: ${result.total}`);
  lines.push(`**Up-to-Date**: ${result.upToDate}`);
  lines.push(`**Outdated**: ${result.outdated.length}`);
  lines.push(`**Vulnerable**: ${result.vulnerable.length}`);
  lines.push('');

  if (result.outdated.length > 0) {
    lines.push('## Outdated Dependencies');
    lines.push('');
    for (const dep of result.outdated) {
      lines.push(`- **${dep.name}**: ${dep.current} → ${dep.latest} (${dep.type})`);
    }
    lines.push('');
  }

  if (result.vulnerable.length > 0) {
    lines.push('## Vulnerable Dependencies');
    lines.push('');
    for (const vuln of result.vulnerable) {
      lines.push(`- ❌ **${vuln.name}** (${vuln.severity}): ${vuln.title}`);
      if (vuln.url) {
        lines.push(`  More info: ${vuln.url}`);
      }
    }
    lines.push('');
  }

  if (result.outdated.length === 0 && result.vulnerable.length === 0) {
    lines.push('## Summary');
    lines.push('');
    lines.push('✅ All dependencies are up-to-date and secure!');
  }

  return lines.join('\n');
}
