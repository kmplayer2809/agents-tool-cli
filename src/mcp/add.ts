import * as p from '@clack/prompts';
import pc from 'picocolors';
import { parseSource } from '../source-parser.js';
import { cloneRepo, cleanupTempDir, GitCloneError } from '../git.js';
import { discoverMcp } from './discover.js';
import { installAsset, type InstallMode } from '../skills/installer.js';
import { detectInstalledAgents, agents } from '../agents.js';
import { addToLock } from '../lock.js';
import type { AgentType, Asset } from '../types.js';

interface McpAddOptions {
  mcpNames: string[];
  global: boolean;
  agentArgs: string[];
  list: boolean;
  yes: boolean;
  copy: boolean;
  all: boolean;
}

export async function runMcpAdd(source: string, options: McpAddOptions): Promise<void> {
  p.intro(pc.cyan('agents-tool-cli') + pc.dim(' — MCP'));

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

  const discovered = discoverMcp(tmpDir, parsedSource.subpath);

  if (discovered.length === 0) {
    p.cancel('No MCP servers found in this repository. Expected MCP.md or mcp.json files.');
    await cleanup();
    process.exit(1);
  }

  if (options.list) {
    console.log('\n' + pc.bold('Available MCP servers:'));
    for (const mcp of discovered) {
      console.log(`  ${pc.cyan(mcp.name)}${mcp.description ? pc.dim(' — ' + mcp.description) : ''}`);
    }
    console.log();
    await cleanup();
    return;
  }

  let selectedMcps = discovered;
  if (options.mcpNames.length > 0 && !options.mcpNames.includes('*')) {
    selectedMcps = discovered.filter((m) =>
      options.mcpNames.some(
        (name) => m.name.toLowerCase() === name.toLowerCase() ||
          m.name.toLowerCase().includes(name.toLowerCase())
      )
    );
    if (selectedMcps.length === 0) {
      p.cancel(`No MCP servers matching: ${options.mcpNames.join(', ')}`);
      await cleanup();
      process.exit(1);
    }
  }

  const installedAgents = await detectInstalledAgents();
  let targetAgents: AgentType[] = installedAgents;

  if (options.all) {
    const mode: InstallMode = options.copy ? 'copy' : 'symlink';
    await performInstall(selectedMcps, installedAgents, mode, options.global, source);
    await cleanup();
    return;
  }

  if (!options.yes) {
    if (selectedMcps.length > 1 || options.mcpNames.length === 0) {
      const mcpChoices = discovered.map((m) => ({
        value: m.name,
        label: m.name,
        hint: m.description,
      }));

      const chosen = await p.multiselect({
        message: 'Which MCP servers would you like to install?',
        options: mcpChoices,
        required: true,
      });

      if (p.isCancel(chosen)) {
        p.cancel('Installation cancelled');
        await cleanup();
        process.exit(0);
      }

      selectedMcps = discovered.filter((m) => (chosen as string[]).includes(m.name));
    }

    if (options.agentArgs.length === 0) {
      const agentChoices = installedAgents.map((a) => ({
        value: a,
        label: agents[a]?.displayName || a,
      }));

      const chosenAgents = await p.multiselect({
        message: 'Which agents should receive these MCP servers?',
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
      message: `Install ${selectedMcps.length} MCP server(s) for ${targetAgents.length} agent(s)?`,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel('Installation cancelled');
      await cleanup();
      process.exit(0);
    }

    await performInstall(selectedMcps, targetAgents, mode, options.global, source);
  } else {
    targetAgents = options.agentArgs.length > 0 ? (options.agentArgs as AgentType[]) : installedAgents;
    const mode: InstallMode = options.copy ? 'copy' : 'symlink';
    await performInstall(selectedMcps, targetAgents, mode, options.global, source);
  }

  await cleanup();
}

async function performInstall(
  mcps: Asset[],
  targetAgents: AgentType[],
  mode: InstallMode,
  global: boolean,
  source: string
): Promise<void> {
  const installSpinner = p.spinner();
  installSpinner.start('Installing MCP servers...');

  const results: { mcp: string; agent: string; success: boolean; error?: string }[] = [];

  for (const mcp of mcps) {
    for (const agentType of targetAgents) {
      const result = await installAsset(mcp, 'mcp', agentType, { global, mode });
      results.push({
        mcp: mcp.name,
        agent: agentType,
        success: result.success,
        error: result.error,
      });
    }
  }

  installSpinner.stop('Installation complete');

  await addToLock({
    source,
    assetType: 'mcp',
    assets: mcps.map((m) => m.name),
    agents: targetAgents,
  }, global);

  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (succeeded.length > 0) {
    console.log(pc.green(`\n✓ Installed ${succeeded.length} MCP server(s) successfully`));
  }
  if (failed.length > 0) {
    console.log(pc.red(`\n✗ Failed to install ${failed.length} MCP server(s):`));
    for (const f of failed) {
      console.log(pc.dim(`  ${f.mcp} → ${f.agent}: ${f.error}`));
    }
  }

  p.outro(pc.green('Done!'));
}
