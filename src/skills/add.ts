import * as p from '@clack/prompts';
import pc from 'picocolors';
import { parseSource } from '../source-parser.js';
import { cloneRepo, cleanupTempDir, GitCloneError } from '../git.js';
import { discoverSkills } from './discover.js';
import { installAsset, type InstallMode } from './installer.js';
import { detectInstalledAgents, agents } from '../agents.js';
import { addToLock } from '../lock.js';
import type { AgentType, Asset } from '../types.js';

interface SkillAddOptions {
  skills: string[];
  global: boolean;
  agentArgs: string[];
  list: boolean;
  yes: boolean;
  copy: boolean;
  all: boolean;
}

export async function runSkillsAdd(source: string, options: SkillAddOptions): Promise<void> {
  p.intro(pc.cyan('agents-tool-cli') + pc.dim(' — Skills'));

  let parsedSource;
  try {
    parsedSource = parseSource(source);
  } catch (err) {
    p.cancel(`Invalid source: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const spinner = p.spinner();
  spinner.start('Cloning repository...');

  let tmpDir: string | null = null;
  const cleanup = async () => {
    if (tmpDir && parsedSource?.type !== 'local') await cleanupTempDir(tmpDir);
  };

  // Handle SIGINT
  process.on('SIGINT', async () => {
    spinner.stop('Cancelled');
    await cleanup();
    process.exit(0);
  });

  try {
    if (parsedSource.type === 'local') {
      tmpDir = parsedSource.localPath!;
      spinner.stop('Using local path');
    } else {
      tmpDir = await cloneRepo(parsedSource);
      spinner.stop('Repository cloned');
    }
  } catch (err) {
    spinner.stop(pc.red('Failed to clone repository'));
    if (err instanceof GitCloneError) {
      p.cancel(err.message);
    } else {
      p.cancel(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    }
    process.exit(1);
  }

  const discovered = discoverSkills(tmpDir, parsedSource.subpath);

  if (discovered.length === 0) {
    p.cancel('No skills found in this repository. Expected SKILL.md files.');
    await cleanup();
    process.exit(1);
  }

  // --list mode
  if (options.list) {
    console.log('\n' + pc.bold('Available skills:'));
    for (const skill of discovered) {
      console.log(`  ${pc.cyan(skill.name)}${skill.description ? pc.dim(' — ' + skill.description) : ''}`);
    }
    console.log();
    await cleanup();
    return;
  }

  // Filter by --skill options
  let selectedSkills = discovered;
  if (options.skills.length > 0 && !options.skills.includes('*')) {
    selectedSkills = discovered.filter((s) =>
      options.skills.some(
        (name) => s.name.toLowerCase() === name.toLowerCase() ||
          s.name.toLowerCase().includes(name.toLowerCase())
      )
    );
    if (selectedSkills.length === 0) {
      p.cancel(`No skills matching: ${options.skills.join(', ')}`);
      await cleanup();
      process.exit(1);
    }
  }

  // Detect agents
  const installedAgents = await detectInstalledAgents();
  let targetAgents: AgentType[] = installedAgents;

  if (options.all) {
    // Install all skills to all agents
    const mode: InstallMode = options.copy ? 'copy' : 'symlink';
    await performInstall(selectedSkills, installedAgents, mode, options.global, source);
    await cleanup();
    return;
  }

  if (!options.yes) {
    // Interactive mode
    if (selectedSkills.length > 1 || options.skills.length === 0) {
      const skillChoices = discovered.map((s) => ({
        value: s.name,
        label: s.name,
        hint: s.description,
      }));

      const chosen = await p.multiselect({
        message: 'Which skills would you like to install?',
        options: skillChoices,
        required: true,
      });

      if (p.isCancel(chosen)) {
        p.cancel('Installation cancelled');
        await cleanup();
        process.exit(0);
      }

      selectedSkills = discovered.filter((s) => (chosen as string[]).includes(s.name));
    }

    // Agent selection
    if (options.agentArgs.length === 0) {
      const agentChoices = installedAgents.map((a) => ({
        value: a,
        label: agents[a]?.displayName || a,
      }));

      const chosenAgents = await p.multiselect({
        message: 'Which agents should receive these skills?',
        options: agentChoices,
        required: true,
      });

      if (p.isCancel(chosenAgents)) {
        p.cancel('Installation cancelled');
        await cleanup();
        process.exit(0);
      }

      targetAgents = chosenAgents as AgentType[];
    } else {
      targetAgents = options.agentArgs as AgentType[];
    }

    // Install mode
    const modeResult = await p.select({
      message: 'Installation method:',
      options: [
        { value: 'symlink', label: 'Symlink (recommended)', hint: 'Single source of truth' },
        { value: 'copy', label: 'Copy', hint: 'Independent copies' },
      ],
    });

    if (p.isCancel(modeResult)) {
      p.cancel('Installation cancelled');
      await cleanup();
      process.exit(0);
    }

    const mode = modeResult as InstallMode;

    const confirmed = await p.confirm({
      message: `Install ${selectedSkills.length} skill(s) for ${targetAgents.length} agent(s)?`,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel('Installation cancelled');
      await cleanup();
      process.exit(0);
    }

    await performInstall(selectedSkills, targetAgents, mode, options.global, source);
  } else {
    // Non-interactive
    targetAgents = options.agentArgs.length > 0 ? (options.agentArgs as AgentType[]) : installedAgents;
    const mode: InstallMode = options.copy ? 'copy' : 'symlink';
    await performInstall(selectedSkills, targetAgents, mode, options.global, source);
  }

  await cleanup();
}

async function performInstall(
  skills: Asset[],
  targetAgents: AgentType[],
  mode: InstallMode,
  global: boolean,
  source: string
): Promise<void> {
  const installSpinner = p.spinner();
  installSpinner.start('Installing skills...');

  const results: { skill: string; agent: string; success: boolean; error?: string }[] = [];

  for (const skill of skills) {
    for (const agentType of targetAgents) {
      const result = await installAsset(skill, 'skills', agentType, { global, mode });
      results.push({
        skill: skill.name,
        agent: agentType,
        success: result.success,
        error: result.error,
      });
    }
  }

  installSpinner.stop('Installation complete');

  // Update lock file
  await addToLock({
    source,
    assetType: 'skills',
    assets: skills.map((s) => s.name),
    agents: targetAgents,
  }, global);

  // Show results
  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (succeeded.length > 0) {
    console.log(pc.green(`\n✓ Installed ${succeeded.length} skill(s) successfully`));
  }
  if (failed.length > 0) {
    console.log(pc.red(`\n✗ Failed to install ${failed.length} skill(s):`));
    for (const f of failed) {
      console.log(pc.dim(`  ${f.skill} → ${f.agent}: ${f.error}`));
    }
  }

  p.outro(pc.green('Done!'));
}
