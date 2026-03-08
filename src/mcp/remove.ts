import * as p from '@clack/prompts';
import pc from 'picocolors';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { uninstallAsset } from '../skills/installer.js';
import { detectInstalledAgents } from '../agents.js';
import type { AgentType } from '../types.js';

export async function runMcpRemove(
  mcpNames: string[],
  options: { global: boolean; agentArgs: string[]; yes: boolean; all: boolean }
): Promise<void> {
  p.intro(pc.cyan('htrongdi-agents-tool') + pc.dim(' — Remove MCP Servers'));

  const { global: isGlobal, agentArgs, yes, all } = options;
  const baseDir = isGlobal ? homedir() : process.cwd();
  const canonicalDir = join(baseDir, '.agents', 'mcp');

  if (!existsSync(canonicalDir)) {
    p.cancel('No MCP servers installed.');
    return;
  }

  const installedMcps = readdirSync(canonicalDir).filter((f) =>
    statSync(join(canonicalDir, f)).isDirectory()
  );

  if (installedMcps.length === 0) {
    p.cancel('No MCP servers to remove.');
    return;
  }

  let targetMcps = mcpNames.length > 0 ? mcpNames : installedMcps;
  const targetAgents: AgentType[] = agentArgs.length > 0 ? (agentArgs as AgentType[]) : await detectInstalledAgents();

  if (!yes && !all) {
    const mcpChoices = installedMcps.map((m) => ({ value: m, label: m }));
    const chosen = await p.multiselect({
      message: 'Which MCP servers to remove?',
      options: mcpChoices,
      required: true,
    });

    if (p.isCancel(chosen)) {
      p.cancel('Cancelled');
      process.exit(0);
    }

    targetMcps = chosen as string[];
  }

  const confirmed = yes || all || await p.confirm({
    message: `Remove ${targetMcps.length} MCP server(s)?`,
  });

  if (!confirmed || p.isCancel(confirmed)) {
    p.cancel('Cancelled');
    return;
  }

  const spinner = p.spinner();
  spinner.start('Removing MCP servers...');

  for (const mcpName of targetMcps) {
    for (const agentType of targetAgents) {
      await uninstallAsset('mcp', mcpName, agentType, isGlobal);
    }
  }

  spinner.stop('Done');
  p.outro(pc.green(`Removed ${targetMcps.length} MCP server(s)`));
}
