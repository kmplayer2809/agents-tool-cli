import pc from 'picocolors';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { assetRegistry } from './registry.js';
import type { AssetType } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')) as { version: string };
    return pkg.version;
  } catch {
    return '1.0.0';
  }
}

function showBanner(): void {
  const version = getVersion();
  console.log(`
${pc.cyan('agents-tool')} ${pc.dim(`v${version}`)}

${pc.bold('Extensible CLI for AI agent assets')}

  ${pc.dim('$')} ${pc.cyan('npx agents-tool --skills add')} ${pc.dim('<source>')}    Add skills
  ${pc.dim('$')} ${pc.cyan('npx agents-tool --rules add')} ${pc.dim('<source>')}     Add rules
  ${pc.dim('$')} ${pc.cyan('npx agents-tool --mcp add')} ${pc.dim('<source>')}       Add MCP servers

${pc.bold('Commands per type:')} add, list, remove, find, check

${pc.bold('Examples:')}
  npx agents-tool --skills add vercel-labs/agent-skills
  npx agents-tool --skills add vercel-labs/agent-skills --skill frontend-design -a claude-code -g
  npx agents-tool --rules add owner/rules-repo --rule my-rule
  npx agents-tool --mcp add owner/mcp-repo --mcp-name my-server

${pc.bold('Options:')}
  -g, --global          Install globally (~/.agents/...)
  -a, --agent <name>    Target specific agent(s)
  -y, --yes             Skip confirmation prompts
  --copy                Copy instead of symlink
  --all                 Install all to all agents
  --list                List without installing
`);
}

export async function main(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showBanner();
    return;
  }

  if (args[0] === '--version' || args[0] === '-v') {
    console.log(getVersion());
    return;
  }

  const assetTypeFlag = args[0];
  const assetType = assetTypeFlag.replace(/^--/, '') as AssetType;

  if (!assetRegistry[assetType]) {
    console.error(pc.red(`Unknown flag: ${assetTypeFlag}`));
    console.error(`Available: --skills, --rules, --mcp`);
    showBanner();
    process.exit(1);
  }

  const subcommand = args[1];
  if (!subcommand) {
    console.error(pc.red(`Missing subcommand for ${assetTypeFlag}`));
    console.error(`Available subcommands: add, list, remove, find, check`);
    process.exit(1);
  }

  const remainingArgs = args.slice(2);
  await assetRegistry[assetType](subcommand, remainingArgs);
}
