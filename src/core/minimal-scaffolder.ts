import path from 'path';
import { ensureDir, fileExists, writeFile } from '../utils/file-system.js';
import { generateDocsStructure } from './docs-generator.js';

interface MinimalScaffoldOptions {
  projectName?: string;
  description?: string;
  license?: string;
}

export async function scaffoldMinimalProject(
  projectDir: string,
  options: MinimalScaffoldOptions = {}
): Promise<string[]> {
  const generated: string[] = [];

  const projectName = options.projectName || path.basename(projectDir);
  const description =
    options.description || `${projectName} project bootstrapped with Rulebook minimal mode.`;
  const licenseName = options.license || 'MIT';

  // Generate concise docs structure and root README (minimal mode)
  const docsFiles = await generateDocsStructure(
    {
      projectName,
      description,
      author: 'Project Team',
      license: licenseName,
    },
    projectDir,
    'minimal'
  );
  generated.push(...docsFiles);

  // Ensure LICENSE exists (Apache-2.0 by default)
  const licensePath = path.join(projectDir, 'LICENSE');
  if (!(await fileExists(licensePath))) {
    const licenseContent = `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

Copyright ${new Date().getFullYear()} ${projectName}

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
    await writeFile(licensePath, licenseContent);
    generated.push(licensePath);
  }

  // Ensure tests directory exists with placeholder
  const testsDir = path.join(projectDir, 'tests');
  await ensureDir(testsDir);
  const placeholderTest = path.join(testsDir, '.gitkeep');
  if (!(await fileExists(placeholderTest))) {
    await writeFile(placeholderTest, '');
    generated.push(placeholderTest);
  }

  return Array.from(new Set(generated));
}
