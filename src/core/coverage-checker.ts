import { exec } from 'child_process';
import { promisify } from 'util';
import { fileExists } from '../utils/file-system.js';
import path from 'path';

const execAsync = promisify(exec);

export interface CoverageResult {
  percentage: number;
  meetsThreshold: boolean;
  threshold: number;
  details?: CoverageDetails;
}

export interface CoverageDetails {
  lines?: number;
  statements?: number;
  functions?: number;
  branches?: number;
}

export async function checkCoverage(
  cwd: string = process.cwd(),
  threshold: number = 95
): Promise<CoverageResult> {
  // Try different coverage tools based on project type
  const hasPackageJson = await fileExists(path.join(cwd, 'package.json'));
  const hasCargoToml = await fileExists(path.join(cwd, 'Cargo.toml'));
  const hasPyprojectToml = await fileExists(path.join(cwd, 'pyproject.toml'));
  const hasGoMod = await fileExists(path.join(cwd, 'go.mod'));
  const hasPomXml = await fileExists(path.join(cwd, 'pom.xml'));

  if (hasPackageJson) {
    return await checkNpmCoverage(cwd, threshold);
  } else if (hasCargoToml) {
    return await checkCargoCoverage(cwd, threshold);
  } else if (hasPyprojectToml) {
    return await checkPythonCoverage(cwd, threshold);
  } else if (hasGoMod) {
    return await checkGoCoverage(cwd, threshold);
  } else if (hasPomXml) {
    return await checkJavaCoverage(cwd, threshold);
  }

  return {
    percentage: 0,
    meetsThreshold: false,
    threshold,
  };
}

async function checkNpmCoverage(cwd: string, threshold: number): Promise<CoverageResult> {
  try {
    // Try to run coverage
    await execAsync('npm test -- --coverage --run', { cwd });

    // Read coverage report
    const coveragePath = path.join(cwd, 'coverage', 'coverage-summary.json');
    if (await fileExists(coveragePath)) {
      const coverage: {
        total: {
          lines: { pct: number };
          statements: { pct: number };
          functions: { pct: number };
          branches: { pct: number };
        };
      } = await import(coveragePath);
      const total = coverage.total;

      const percentage = total.lines.pct || 0;

      return {
        percentage,
        meetsThreshold: percentage >= threshold,
        threshold,
        details: {
          lines: total.lines.pct,
          statements: total.statements.pct,
          functions: total.functions.pct,
          branches: total.branches.pct,
        },
      };
    }
  } catch {
    // Coverage not available
  }

  return {
    percentage: 0,
    meetsThreshold: false,
    threshold,
  };
}

async function checkCargoCoverage(cwd: string, threshold: number): Promise<CoverageResult> {
  try {
    const { stdout } = await execAsync('cargo llvm-cov --summary-only', { cwd });

    // Parse output for coverage percentage
    const match = stdout.match(/TOTAL.*?(\d+\.\d+)%/);
    if (match) {
      const percentage = parseFloat(match[1]);

      return {
        percentage,
        meetsThreshold: percentage >= threshold,
        threshold,
      };
    }
  } catch {
    // cargo llvm-cov not available
  }

  return {
    percentage: 0,
    meetsThreshold: false,
    threshold,
  };
}

async function checkPythonCoverage(cwd: string, threshold: number): Promise<CoverageResult> {
  try {
    const { stdout } = await execAsync('pytest --cov=. --cov-report=term', { cwd });

    // Parse output for coverage percentage
    const match = stdout.match(/TOTAL.*?(\d+)%/);
    if (match) {
      const percentage = parseInt(match[1], 10);

      return {
        percentage,
        meetsThreshold: percentage >= threshold,
        threshold,
      };
    }
  } catch {
    // pytest not available
  }

  return {
    percentage: 0,
    meetsThreshold: false,
    threshold,
  };
}

async function checkGoCoverage(cwd: string, threshold: number): Promise<CoverageResult> {
  try {
    const { stdout } = await execAsync('go test -cover ./...', { cwd });

    // Parse output for coverage percentage
    const matches = stdout.matchAll(/coverage: (\d+\.\d+)% of statements/g);
    const coverages = Array.from(matches).map((m) => parseFloat(m[1]));

    if (coverages.length > 0) {
      const avgCoverage = coverages.reduce((a, b) => a + b, 0) / coverages.length;

      return {
        percentage: avgCoverage,
        meetsThreshold: avgCoverage >= threshold,
        threshold,
      };
    }
  } catch {
    // go test failed
  }

  return {
    percentage: 0,
    meetsThreshold: false,
    threshold,
  };
}

async function checkJavaCoverage(cwd: string, threshold: number): Promise<CoverageResult> {
  try {
    // Try Maven first
    await execAsync('mvn jacoco:report', { cwd });

    // Import readFile
    const { readFile } = await import('../utils/file-system.js');

    // Read Jacoco XML report
    const reportPath = path.join(cwd, 'target', 'site', 'jacoco', 'jacoco.xml');
    if (await fileExists(reportPath)) {
      const report = await readFile(reportPath);

      // Parse XML for coverage (simplified)
      const match = report.match(/type="LINE".*?covered="(\d+)".*?missed="(\d+)"/);
      if (match) {
        const covered = parseInt(match[1], 10);
        const missed = parseInt(match[2], 10);
        const percentage = (covered / (covered + missed)) * 100;

        return {
          percentage,
          meetsThreshold: percentage >= threshold,
          threshold,
        };
      }
    }
  } catch {
    // Try Gradle
    try {
      await execAsync('./gradlew jacocoTestReport', { cwd });
      // Similar XML parsing for Gradle
    } catch {
      // Neither Maven nor Gradle coverage available
    }
  }

  return {
    percentage: 0,
    meetsThreshold: false,
    threshold,
  };
}
