import type { AssetType } from './types.js';
import { runSkillsCommand } from './skills/index.js';
import { runRulesCommand } from './rules/index.js';
import { runMcpCommand } from './mcp/index.js';

type CommandHandler = (subcommand: string, args: string[]) => Promise<void>;

export const assetRegistry: Record<AssetType, CommandHandler> = {
  skills: runSkillsCommand,
  rules: runRulesCommand,
  mcp: runMcpCommand,
};
