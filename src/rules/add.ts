import * as p from '@clack/prompts';
import pc from 'picocolors';
import { parseSource } from '../source-parser.js';
import { cloneRepo, cleanupTempDir, GitCloneError } from '../git.js';
import { discoverRules } from './discover.js';
import { installAsset, type InstallMode } from '../skills/installer.js';
import { detectInstalledAgents, agents } from '../agents.js';
import { addToLock } from '../lock.js';
import type { AgentType, Asset } from '../types.js';

interface RuleAddOptions {
  rules: string[];
  global: boolean;
  agentArgs: string[];
  list: boolean;
  yes: boolean;
  copy: boolean;
  all: boolean;
}

export async function runRulesAdd(source: string, options: RuleAddOptions): Promise<void> {
  p.intro(pc.cyan('htrongdi-agents-tool') + pc.dim(' — Rules'));

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

  const discovered = discoverRules(tmpDir, parsedSource.subpath);

  if (discovered.length === 0) {
    p.cancel('No rules found in this repository. Expected RULE.md files.');
    await cleanup();
    process.exit(1);
  }

  if (options.list) {
    console.log('\n' + pc.bold('Available rules:'));
    for (const rule of discovered) {
      console.log(`  ${pc.cyan(rule.name)}${rule.description ? pc.dim(' — ' + rule.description) : ''}`);
    }
    console.log();
    await cleanup();
    return;
  }

  let selectedRules = discovered;
  if (options.rules.length > 0 && !options.rules.includes('*')) {
    selectedRules = discovered.filter((r) =>
      options.rules.some(
        (name) => r.name.toLowerCase() === name.toLowerCase() ||
          r.name.toLowerCase().includes(name.toLowerCase())
      )
    );
    if (selectedRules.length === 0) {
      p.cancel(`No rules matching: ${options.rules.join(', ')}`);
      await cleanup();
      process.exit(1);
    }
  }

  const installedAgents = await detectInstalledAgents();
  let targetAgents: AgentType[] = installedAgents;

  if (options.all) {
    const mode: InstallMode = options.copy ? 'copy' : 'symlink';
    await performInstall(selectedRules, installedAgents, mode, options.global, source);
    await cleanup();
    return;
  }

  if (!options.yes) {
    if (selectedRules.length > 1 || options.rules.length === 0) {
      const ruleChoices = discovered.map((r) => ({
        value: r.name,
        label: r.name,
        hint: r.description,
      }));

      const chosen = await p.multiselect({
        message: 'Which rules would you like to install?',
        options: ruleChoices,
        required: true,
      });

      if (p.isCancel(chosen)) {
        p.cancel('Installation cancelled');
        await cleanup();
        process.exit(0);
      }

      selectedRules = discovered.filter((r) => (chosen as string[]).includes(r.name));
    }

    if (options.agentArgs.length === 0) {
      const agentChoices = installedAgents.map((a) => ({
        value: a,
        label: agents[a]?.displayName || a,
      }));

      const chosenAgents = await p.multiselect({
        message: 'Which agents should receive these rules?',
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
      message: `Install ${selectedRules.length} rule(s) for ${targetAgents.length} agent(s)?`,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel('Installation cancelled');
      await cleanup();
      process.exit(0);
    }

    await performInstall(selectedRules, targetAgents, mode, options.global, source);
  } else {
    targetAgents = options.agentArgs.length > 0 ? (options.agentArgs as AgentType[]) : installedAgents;
    const mode: InstallMode = options.copy ? 'copy' : 'symlink';
    await performInstall(selectedRules, targetAgents, mode, options.global, source);
  }

  await cleanup();
}

async function performInstall(
  rules: Asset[],
  targetAgents: AgentType[],
  mode: InstallMode,
  global: boolean,
  source: string
): Promise<void> {
  const installSpinner = p.spinner();
  installSpinner.start('Installing rules...');

  const results: { rule: string; agent: string; success: boolean; error?: string }[] = [];

  for (const rule of rules) {
    for (const agentType of targetAgents) {
      const result = await installAsset(rule, 'rules', agentType, { global, mode });
      results.push({
        rule: rule.name,
        agent: agentType,
        success: result.success,
        error: result.error,
      });
    }
  }

  installSpinner.stop('Installation complete');

  await addToLock({
    source,
    assetType: 'rules',
    assets: rules.map((r) => r.name),
    agents: targetAgents,
  }, global);

  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (succeeded.length > 0) {
    console.log(pc.green(`\n✓ Installed ${succeeded.length} rule(s) successfully`));
  }
  if (failed.length > 0) {
    console.log(pc.red(`\n✗ Failed to install ${failed.length} rule(s):`));
    for (const f of failed) {
      console.log(pc.dim(`  ${f.rule} → ${f.agent}: ${f.error}`));
    }
  }

  p.outro(pc.green('Done!'));
}
