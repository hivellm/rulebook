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
    const licenseContent = `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

Copyright ${new Date().getFullYear()} [Project Name]

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
`;
    try {
      await writeFile(licensePath, licenseContent);
      result.applied.push('Created LICENSE (Apache-2.0)');
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
