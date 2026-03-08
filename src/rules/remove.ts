import * as p from '@clack/prompts';
import pc from 'picocolors';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { uninstallAsset } from '../skills/installer.js';
import { detectInstalledAgents } from '../agents.js';
import type { AgentType } from '../types.js';

export async function runRulesRemove(
  ruleNames: string[],
  options: { global: boolean; agentArgs: string[]; yes: boolean; all: boolean }
): Promise<void> {
  p.intro(pc.cyan('htrongdi-agents-tool') + pc.dim(' — Remove Rules'));

  const { global: isGlobal, agentArgs, yes, all } = options;
  const baseDir = isGlobal ? homedir() : process.cwd();
  const canonicalDir = join(baseDir, '.agents', 'rules');

  if (!existsSync(canonicalDir)) {
    p.cancel('No rules installed.');
    return;
  }

  const installedRules = readdirSync(canonicalDir).filter((f) =>
    statSync(join(canonicalDir, f)).isDirectory()
  );

  if (installedRules.length === 0) {
    p.cancel('No rules to remove.');
    return;
  }

  let targetRules = ruleNames.length > 0 ? ruleNames : installedRules;
  const targetAgents: AgentType[] = agentArgs.length > 0 ? (agentArgs as AgentType[]) : await detectInstalledAgents();

  if (!yes && !all) {
    const ruleChoices = installedRules.map((r) => ({ value: r, label: r }));
    const chosen = await p.multiselect({
      message: 'Which rules to remove?',
      options: ruleChoices,
      required: true,
    });

    if (p.isCancel(chosen)) {
      p.cancel('Cancelled');
      process.exit(0);
    }

    targetRules = chosen as string[];
  }

  const confirmed = yes || all || await p.confirm({
    message: `Remove ${targetRules.length} rule(s)?`,
  });

  if (!confirmed || p.isCancel(confirmed)) {
    p.cancel('Cancelled');
    return;
  }

  const spinner = p.spinner();
  spinner.start('Removing rules...');

  for (const ruleName of targetRules) {
    for (const agentType of targetAgents) {
      await uninstallAsset('rules', ruleName, agentType, isGlobal);
    }
  }

  spinner.stop('Done');
  p.outro(pc.green(`Removed ${targetRules.length} rule(s)`));
}
