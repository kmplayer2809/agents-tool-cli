import * as p from '@clack/prompts';
import pc from 'picocolors';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { uninstallAsset } from './installer.js';
import { detectInstalledAgents } from '../agents.js';
import type { AgentType } from '../types.js';

export async function runSkillsRemove(
  skillNames: string[],
  options: { global: boolean; agentArgs: string[]; yes: boolean; all: boolean }
): Promise<void> {
  p.intro(pc.cyan('agents-tool-cli') + pc.dim(' — Remove Skills'));

  const { global: isGlobal, agentArgs, yes, all } = options;
  const baseDir = isGlobal ? homedir() : process.cwd();
  const canonicalDir = join(baseDir, '.agents', 'skills');

  if (!existsSync(canonicalDir)) {
    p.cancel('No skills installed.');
    return;
  }

  const installedSkills = readdirSync(canonicalDir).filter((f) =>
    statSync(join(canonicalDir, f)).isDirectory()
  );

  if (installedSkills.length === 0) {
    p.cancel('No skills to remove.');
    return;
  }

  let targetSkills = skillNames.length > 0 ? skillNames : installedSkills;
  const targetAgents: AgentType[] = agentArgs.length > 0 ? (agentArgs as AgentType[]) : await detectInstalledAgents();

  if (!yes && !all) {
    const skillChoices = installedSkills.map((s) => ({ value: s, label: s }));
    const chosen = await p.multiselect({
      message: 'Which skills to remove?',
      options: skillChoices,
      required: true,
    });

    if (p.isCancel(chosen)) {
      p.cancel('Cancelled');
      process.exit(0);
    }

    targetSkills = chosen as string[];
  }

  const confirmed = yes || all || await p.confirm({
    message: `Remove ${targetSkills.length} skill(s)?`,
  });

  if (!confirmed || p.isCancel(confirmed)) {
    p.cancel('Cancelled');
    return;
  }

  const spinner = p.spinner();
  spinner.start('Removing skills...');

  for (const skillName of targetSkills) {
    for (const agentType of targetAgents) {
      await uninstallAsset('skills', skillName, agentType, isGlobal);
    }
  }

  spinner.stop('Done');
  p.outro(pc.green(`Removed ${targetSkills.length} skill(s)`));
}
