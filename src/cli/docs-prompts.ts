import inquirer from 'inquirer';
import path from 'path';
import type { DocsConfig } from '../core/docs-generator.js';

export async function promptDocsConfig(): Promise<DocsConfig> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: process.cwd().split(path.sep).pop() || 'my-project',
      validate: (value: string) => {
        if (!value.trim()) {
          return 'Project name is required';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'description',
      message: 'Project description:',
      default: 'A modern software project',
    },
    {
      type: 'input',
      name: 'author',
      message: 'Author name:',
      default: 'Your Name',
    },
    {
      type: 'input',
      name: 'email',
      message: 'Contact email (optional):',
      default: '',
    },
    {
      type: 'list',
      name: 'license',
      message: 'License:',
      choices: ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'ISC', 'Unlicense'],
      default: 'MIT',
    },
  ]);

  return answers as DocsConfig;
}
