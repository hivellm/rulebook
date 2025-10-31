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

  // Ensure LICENSE exists (MIT by default)
  const licensePath = path.join(projectDir, 'LICENSE');
  if (!(await fileExists(licensePath))) {
    const licenseContent = `MIT License

Copyright (c) ${new Date().getFullYear()} ${projectName}

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
