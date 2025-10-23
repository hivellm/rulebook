import { readFile, writeFile, fileExists } from '../utils/file-system.js';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export type BumpType = 'major' | 'minor' | 'patch';

export interface VersionBumpResult {
  oldVersion: string;
  newVersion: string;
  filesUpdated: string[];
}

/**
 * Bump semantic version
 */
export function bumpVersion(version: string, type: BumpType): string {
  const parts = version.replace(/^v/, '').split('.').map(Number);

  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: ${version}`);
  }

  let [major, minor, patch] = parts;

  switch (type) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
      patch += 1;
      break;
  }

  return `${major}.${minor}.${patch}`;
}

/**
 * Update version in package.json
 */
async function updatePackageJson(projectDir: string, newVersion: string): Promise<boolean> {
  const packagePath = path.join(projectDir, 'package.json');

  if (!(await fileExists(packagePath))) {
    return false;
  }

  const content = await readFile(packagePath);
  const pkg = JSON.parse(content);
  pkg.version = newVersion;

  await writeFile(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  return true;
}

/**
 * Update version in Cargo.toml
 */
async function updateCargoToml(projectDir: string, newVersion: string): Promise<boolean> {
  const cargoPath = path.join(projectDir, 'Cargo.toml');

  if (!(await fileExists(cargoPath))) {
    return false;
  }

  let content = await readFile(cargoPath);
  content = content.replace(/^version\s*=\s*"[^"]+"/m, `version = "${newVersion}"`);

  await writeFile(cargoPath, content);
  return true;
}

/**
 * Update version in pyproject.toml
 */
async function updatePyprojectToml(projectDir: string, newVersion: string): Promise<boolean> {
  const pyprojectPath = path.join(projectDir, 'pyproject.toml');

  if (!(await fileExists(pyprojectPath))) {
    return false;
  }

  let content = await readFile(pyprojectPath);
  content = content.replace(/^version\s*=\s*"[^"]+"/m, `version = "${newVersion}"`);

  await writeFile(pyprojectPath, content);
  return true;
}

/**
 * Update version in mix.exs (Elixir)
 */
async function updateMixExs(projectDir: string, newVersion: string): Promise<boolean> {
  const mixPath = path.join(projectDir, 'mix.exs');

  if (!(await fileExists(mixPath))) {
    return false;
  }

  let content = await readFile(mixPath);
  content = content.replace(/version:\s*"[^"]+"/, `version: "${newVersion}"`);

  await writeFile(mixPath, content);
  return true;
}

/**
 * Update version in build.gradle.kts (Kotlin)
 */
async function updateGradleKts(projectDir: string, newVersion: string): Promise<boolean> {
  const gradlePath = path.join(projectDir, 'build.gradle.kts');

  if (!(await fileExists(gradlePath))) {
    return false;
  }

  let content = await readFile(gradlePath);
  content = content.replace(/version\s*=\s*"[^"]+"/, `version = "${newVersion}"`);

  await writeFile(gradlePath, content);
  return true;
}

/**
 * Update version in .csproj (C#)
 */
async function updateCsproj(projectDir: string, newVersion: string): Promise<boolean> {
  const csprojFiles = await execAsync(`find . -maxdepth 2 -name "*.csproj" 2>/dev/null || true`, {
    cwd: projectDir,
  });

  if (!csprojFiles.stdout.trim()) {
    return false;
  }

  const csprojPath = path.join(
    projectDir,
    csprojFiles.stdout.trim().split('\n')[0].replace('./', '')
  );
  let content = await readFile(csprojPath);
  content = content.replace(/<Version>[^<]+<\/Version>/, `<Version>${newVersion}</Version>`);

  await writeFile(csprojPath, content);
  return true;
}

/**
 * Get current version from project files
 */
export async function getCurrentVersion(projectDir: string): Promise<string | null> {
  // Check package.json
  const packagePath = path.join(projectDir, 'package.json');
  if (await fileExists(packagePath)) {
    const content = await readFile(packagePath);
    const pkg = JSON.parse(content);
    return pkg.version;
  }

  // Check Cargo.toml
  const cargoPath = path.join(projectDir, 'Cargo.toml');
  if (await fileExists(cargoPath)) {
    const content = await readFile(cargoPath);
    const match = content.match(/^version\s*=\s*"([^"]+)"/m);
    if (match) return match[1];
  }

  // Check pyproject.toml
  const pyprojectPath = path.join(projectDir, 'pyproject.toml');
  if (await fileExists(pyprojectPath)) {
    const content = await readFile(pyprojectPath);
    const match = content.match(/^version\s*=\s*"([^"]+)"/m);
    if (match) return match[1];
  }

  return null;
}

/**
 * Bump version across all project files
 */
export async function bumpProjectVersion(
  projectDir: string,
  bumpType: BumpType
): Promise<VersionBumpResult> {
  const currentVersion = await getCurrentVersion(projectDir);

  if (!currentVersion) {
    throw new Error('Could not find version in project files');
  }

  const newVersion = bumpVersion(currentVersion, bumpType);
  const filesUpdated: string[] = [];

  // Update all version files
  if (await updatePackageJson(projectDir, newVersion)) {
    filesUpdated.push('package.json');
  }

  if (await updateCargoToml(projectDir, newVersion)) {
    filesUpdated.push('Cargo.toml');
  }

  if (await updatePyprojectToml(projectDir, newVersion)) {
    filesUpdated.push('pyproject.toml');
  }

  if (await updateMixExs(projectDir, newVersion)) {
    filesUpdated.push('mix.exs');
  }

  if (await updateGradleKts(projectDir, newVersion)) {
    filesUpdated.push('build.gradle.kts');
  }

  if (await updateCsproj(projectDir, newVersion)) {
    filesUpdated.push('*.csproj');
  }

  if (filesUpdated.length === 0) {
    throw new Error('No version files found to update');
  }

  return {
    oldVersion: currentVersion,
    newVersion,
    filesUpdated,
  };
}
