import { fileExists, readFile, writeFile } from '../utils/file-system.js';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AutoFixResult {
  applied: string[];
  failed: string[];
  skipped: string[];
}

/**
 * Auto-fix common issues in the project
 */
export async function autoFixProject(projectDir: string): Promise<AutoFixResult> {
  const result: AutoFixResult = {
    applied: [],
    failed: [],
    skipped: [],
  };

  // Fix 1: Add .gitignore if missing
  const gitignorePath = path.join(projectDir, '.gitignore');
  if (!(await fileExists(gitignorePath))) {
    const gitignoreContent = `# Dependencies
node_modules/
target/
dist/
build/
*.egg-info/
__pycache__/

# IDEs
.vscode/
.idea/
*.swp
*.swo

# Environment
.env
.env.local

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Coverage
coverage/
.nyc_output/
*.lcov

# Build outputs
*.o
*.so
*.dylib
*.dll
*.exe
`;
    try {
      await writeFile(gitignorePath, gitignoreContent);
      result.applied.push('Created .gitignore');
    } catch {
      result.failed.push('Failed to create .gitignore');
    }
  } else {
    result.skipped.push('.gitignore already exists');
  }

  // Fix 2: Add LICENSE if missing
  const licensePath = path.join(projectDir, 'LICENSE');
  if (!(await fileExists(licensePath))) {
    const licenseContent = `MIT License

Copyright (c) ${new Date().getFullYear()} [Project Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
    try {
      await writeFile(licensePath, licenseContent);
      result.applied.push('Created LICENSE (MIT)');
    } catch {
      result.failed.push('Failed to create LICENSE');
    }
  } else {
    result.skipped.push('LICENSE already exists');
  }

  // Fix 3: Format code if formatters are available
  const packageJsonPath = path.join(projectDir, 'package.json');
  if (await fileExists(packageJsonPath)) {
    try {
      const packageContent = await readFile(packageJsonPath);
      const pkg = JSON.parse(packageContent);

      if (pkg.scripts?.format) {
        await execAsync('npm run format', { cwd: projectDir });
        result.applied.push('Formatted code with npm run format');
      } else {
        result.skipped.push('No format script found in package.json');
      }
    } catch (error) {
      result.failed.push('Failed to format code: ' + (error as Error).message);
    }
  }

  // Fix 4: Add README.md if missing
  const readmePath = path.join(projectDir, 'README.md');
  if (!(await fileExists(readmePath))) {
    const readmeContent = `# Project Name

Brief description of your project.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

## Development

\`\`\`bash
npm test
npm run lint
npm run build
\`\`\`

## License

MIT - See LICENSE file for details.
`;
    try {
      await writeFile(readmePath, readmeContent);
      result.applied.push('Created README.md');
    } catch {
      result.failed.push('Failed to create README.md');
    }
  } else {
    result.skipped.push('README.md already exists');
  }

  // Fix 5: Create /docs directory if strict docs enabled
  const docsDir = path.join(projectDir, 'docs');
  if (!(await fileExists(docsDir))) {
    try {
      await execAsync(`mkdir -p "${docsDir}"`, { cwd: projectDir });
      result.applied.push('Created /docs directory');
    } catch {
      result.failed.push('Failed to create /docs directory');
    }
  } else {
    result.skipped.push('/docs directory already exists');
  }

  return result;
}

/**
 * Fix lint errors automatically
 */
export async function autoFixLint(projectDir: string): Promise<boolean> {
  const packageJsonPath = path.join(projectDir, 'package.json');

  if (await fileExists(packageJsonPath)) {
    try {
      const packageContent = await readFile(packageJsonPath);
      const pkg = JSON.parse(packageContent);

      if (pkg.scripts?.['lint:fix']) {
        await execAsync('npm run lint:fix', { cwd: projectDir });
        return true;
      }

      if (pkg.scripts?.lint) {
        await execAsync('npm run lint -- --fix', { cwd: projectDir });
        return true;
      }
    } catch {
      return false;
    }
  }

  // Try common fix commands
  try {
    await execAsync('npx eslint . --fix', { cwd: projectDir });
    return true;
  } catch {
    // Ignore
  }

  return false;
}
