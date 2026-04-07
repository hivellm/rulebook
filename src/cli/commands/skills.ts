import chalk from 'chalk';
import ora from 'ora';
import { SkillsManager, getDefaultTemplatesPath } from '../../core/skills-manager.js';
import type { SkillCategory } from '../../types.js';

export async function skillListCommand(options: {
  category?: string;
  enabled?: boolean;
}): Promise<void> {
  try {
    const cwd = process.cwd();
    const spinner = ora('Discovering skills...').start();

    const skillsManager = new SkillsManager(getDefaultTemplatesPath(), cwd);
    const { createConfigManager } = await import('../../core/config-manager.js');
    const configManager = createConfigManager(cwd);

    let skills;
    if (options.category) {
      skills = await skillsManager.getSkillsByCategory(options.category as SkillCategory);
    } else {
      skills = await skillsManager.getSkills();
    }

    let enabledIds = new Set<string>();
    try {
      const config = await configManager.loadConfig();
      enabledIds = new Set(config.skills?.enabled || []);
    } catch {
      // No config file, all skills disabled
    }

    if (options.enabled) {
      skills = skills.filter((s) => enabledIds.has(s.id));
    }

    spinner.succeed(`Found ${skills.length} skill(s)`);

    if (skills.length === 0) {
      console.log(chalk.yellow('\nNo skills found matching criteria.'));
      return;
    }

    const byCategory = new Map<string, typeof skills>();
    for (const skill of skills) {
      const cat = skill.category;
      if (!byCategory.has(cat)) {
        byCategory.set(cat, []);
      }
      byCategory.get(cat)!.push(skill);
    }

    console.log(chalk.bold.blue('\n📦 Available Skills\n'));

    for (const [category, categorySkills] of byCategory) {
      console.log(chalk.bold.white(`${category.toUpperCase()}`));
      for (const skill of categorySkills) {
        const enabled = enabledIds.has(skill.id);
        const status = enabled ? chalk.green('✓') : chalk.gray('○');
        const name = enabled ? chalk.green(skill.metadata.name) : chalk.white(skill.metadata.name);
        console.log(`  ${status} ${name}`);
        console.log(chalk.gray(`    ${skill.metadata.description}`));
        console.log(chalk.gray(`    ID: ${skill.id}`));
      }
      console.log('');
    }

    console.log(chalk.gray('Use "rulebook skill add <skill-id>" to enable a skill'));
    console.log(chalk.gray('Use "rulebook skill remove <skill-id>" to disable a skill'));
  } catch (error) {
    console.error(chalk.red('\n❌ Failed to list skills:'), error);
    process.exit(1);
  }
}

export async function skillAddCommand(skillId: string): Promise<void> {
  try {
    const cwd = process.cwd();
    const spinner = ora(`Adding skill: ${skillId}...`).start();

    const skillsManager = new SkillsManager(getDefaultTemplatesPath(), cwd);
    const { createConfigManager } = await import('../../core/config-manager.js');
    const configManager = createConfigManager(cwd);

    const skill = await skillsManager.getSkillById(skillId);
    if (!skill) {
      spinner.fail(`Skill not found: ${skillId}`);

      const allSkills = await skillsManager.getSkills();
      const similar = allSkills.filter(
        (s) =>
          s.id.includes(skillId.toLowerCase()) ||
          s.metadata.name.toLowerCase().includes(skillId.toLowerCase())
      );

      if (similar.length > 0) {
        console.log(chalk.yellow('\nDid you mean one of these?'));
        for (const s of similar.slice(0, 5)) {
          console.log(chalk.gray(`  - ${s.id} (${s.metadata.name})`));
        }
      }

      console.log(chalk.gray('\nUse "rulebook skill list" to see all available skills'));
      process.exit(1);
    }

    let config = await configManager.loadConfig();
    config = await skillsManager.enableSkill(skillId, config);

    const validation = await skillsManager.validateSkills(config);
    if (validation.conflicts.length > 0) {
      spinner.warn(`Skill enabled with conflicts`);
      console.log(chalk.yellow('\n⚠️  Conflicts detected:'));
      for (const conflict of validation.conflicts) {
        console.log(chalk.yellow(`  - ${conflict.skillA} conflicts with ${conflict.skillB}`));
        console.log(chalk.gray(`    ${conflict.reason}`));
      }
    } else {
      spinner.succeed(`Skill added: ${skill.metadata.name}`);
    }

    await configManager.saveConfig(config);

    console.log(chalk.green(`\n✓ Skill "${skill.metadata.name}" is now enabled`));
    console.log(chalk.gray(`  Category: ${skill.category}`));
    console.log(chalk.gray(`  Description: ${skill.metadata.description}`));

    if (validation.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      for (const warning of validation.warnings) {
        console.log(chalk.yellow(`  - ${warning}`));
      }
    }

    console.log(chalk.gray('\nRun "rulebook update" to regenerate AGENTS.md with the new skill'));
  } catch (error) {
    console.error(chalk.red('\n❌ Failed to add skill:'), error);
    process.exit(1);
  }
}

export async function skillRemoveCommand(skillId: string): Promise<void> {
  try {
    const cwd = process.cwd();
    const spinner = ora(`Removing skill: ${skillId}...`).start();

    const skillsManager = new SkillsManager(getDefaultTemplatesPath(), cwd);
    const { createConfigManager } = await import('../../core/config-manager.js');
    const configManager = createConfigManager(cwd);

    const skill = await skillsManager.getSkillById(skillId);
    if (!skill) {
      spinner.fail(`Skill not found: ${skillId}`);
      console.log(chalk.gray('Use "rulebook skill list" to see all available skills'));
      process.exit(1);
    }

    let config = await configManager.loadConfig();

    if (!config.skills?.enabled?.includes(skillId)) {
      spinner.fail(`Skill "${skillId}" is not currently enabled`);
      process.exit(1);
    }

    config = await skillsManager.disableSkill(skillId, config);
    await configManager.saveConfig(config);

    spinner.succeed(`Skill removed: ${skill.metadata.name}`);

    console.log(chalk.green(`\n✓ Skill "${skill.metadata.name}" is now disabled`));
    console.log(chalk.gray('\nRun "rulebook update" to regenerate AGENTS.md without this skill'));
  } catch (error) {
    console.error(chalk.red('\n❌ Failed to remove skill:'), error);
    process.exit(1);
  }
}

export async function skillShowCommand(skillId: string): Promise<void> {
  try {
    const cwd = process.cwd();
    const spinner = ora(`Loading skill: ${skillId}...`).start();

    const skillsManager = new SkillsManager(getDefaultTemplatesPath(), cwd);
    const { createConfigManager } = await import('../../core/config-manager.js');
    const configManager = createConfigManager(cwd);

    const skill = await skillsManager.getSkillById(skillId);
    if (!skill) {
      spinner.fail(`Skill not found: ${skillId}`);

      const allSkills = await skillsManager.getSkills();
      const similar = allSkills.filter(
        (s) =>
          s.id.includes(skillId.toLowerCase()) ||
          s.metadata.name.toLowerCase().includes(skillId.toLowerCase())
      );

      if (similar.length > 0) {
        console.log(chalk.yellow('\nDid you mean one of these?'));
        for (const s of similar.slice(0, 5)) {
          console.log(chalk.gray(`  - ${s.id} (${s.metadata.name})`));
        }
      }

      process.exit(1);
    }

    spinner.stop();

    let enabled = false;
    try {
      const config = await configManager.loadConfig();
      enabled = config.skills?.enabled?.includes(skillId) || false;
    } catch {
      // No config
    }

    console.log(chalk.bold.blue(`\n📦 ${skill.metadata.name}\n`));
    console.log(chalk.white(`ID: ${skill.id}`));
    console.log(chalk.white(`Category: ${skill.category}`));
    console.log(
      chalk.white(`Status: ${enabled ? chalk.green('Enabled') : chalk.gray('Disabled')}`)
    );

    if (skill.metadata.version) {
      console.log(chalk.white(`Version: ${skill.metadata.version}`));
    }
    if (skill.metadata.author) {
      console.log(chalk.white(`Author: ${skill.metadata.author}`));
    }

    console.log(chalk.white(`\nDescription:`));
    console.log(chalk.gray(`  ${skill.metadata.description}`));

    if (skill.metadata.tags && skill.metadata.tags.length > 0) {
      console.log(chalk.white(`\nTags: ${skill.metadata.tags.join(', ')}`));
    }

    if (skill.metadata.dependencies && skill.metadata.dependencies.length > 0) {
      console.log(chalk.white(`\nDependencies:`));
      for (const dep of skill.metadata.dependencies) {
        console.log(chalk.gray(`  - ${dep}`));
      }
    }

    if (skill.metadata.conflicts && skill.metadata.conflicts.length > 0) {
      console.log(chalk.yellow(`\nConflicts with:`));
      for (const conflict of skill.metadata.conflicts) {
        console.log(chalk.yellow(`  - ${conflict}`));
      }
    }

    console.log(chalk.white(`\nContent Preview:`));
    const preview = skill.content.slice(0, 500);
    console.log(chalk.gray(preview + (skill.content.length > 500 ? '...' : '')));

    console.log(chalk.gray(`\nPath: ${skill.path}`));
  } catch (error) {
    console.error(chalk.red('\n❌ Failed to show skill:'), error);
    process.exit(1);
  }
}

export async function skillSearchCommand(query: string): Promise<void> {
  try {
    const cwd = process.cwd();
    const spinner = ora(`Searching for: ${query}...`).start();

    const skillsManager = new SkillsManager(getDefaultTemplatesPath(), cwd);
    const { createConfigManager } = await import('../../core/config-manager.js');
    const configManager = createConfigManager(cwd);

    const skills = await skillsManager.searchSkills(query);

    spinner.succeed(`Found ${skills.length} result(s)`);

    if (skills.length === 0) {
      console.log(chalk.yellow(`\nNo skills found matching "${query}"`));
      console.log(chalk.gray('Try a different search term or use "rulebook skill list"'));
      return;
    }

    let enabledIds = new Set<string>();
    try {
      const config = await configManager.loadConfig();
      enabledIds = new Set(config.skills?.enabled || []);
    } catch {
      // No config
    }

    console.log(chalk.bold.blue(`\n🔍 Search Results for "${query}"\n`));

    for (const skill of skills) {
      const enabled = enabledIds.has(skill.id);
      const status = enabled ? chalk.green('✓') : chalk.gray('○');
      const name = enabled ? chalk.green(skill.metadata.name) : chalk.white(skill.metadata.name);
      console.log(`${status} ${name} (${skill.category})`);
      console.log(chalk.gray(`  ${skill.metadata.description}`));
      console.log(chalk.gray(`  ID: ${skill.id}\n`));
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Search failed:'), error);
    process.exit(1);
  }
}
