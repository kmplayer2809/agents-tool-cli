import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import type { AgentConfig, AgentType, AssetType } from './types.js';

const home = homedir();
const claudeHome = process.env.CLAUDE_CONFIG_DIR?.trim() || join(home, '.claude');

function makeDirs(base: string): Record<AssetType, string> {
  return {
    skills: join(base, 'skills'),
    rules: join(base, 'rules'),
    mcp: join(base, 'mcp'),
  };
}

export const agents: Record<AgentType, AgentConfig> = {
  'claude-code': {
    name: 'claude-code',
    displayName: 'Claude Code',
    dirs: makeDirs('.claude'),
    globalDirs: makeDirs(claudeHome),
    detectInstalled: async () => existsSync(claudeHome),
  },
  cursor: {
    name: 'cursor',
    displayName: 'Cursor',
    dirs: makeDirs('.cursor'),
    globalDirs: makeDirs(join(home, '.cursor')),
    detectInstalled: async () => existsSync(join(home, '.cursor')),
  },
  codex: {
    name: 'codex',
    displayName: 'Codex',
    dirs: makeDirs('.codex'),
    globalDirs: makeDirs(join(home, '.codex')),
    detectInstalled: async () => existsSync(join(home, '.codex')),
  },
  opencode: {
    name: 'opencode',
    displayName: 'OpenCode',
    dirs: makeDirs('.opencode'),
    globalDirs: makeDirs(join(home, '.opencode')),
    detectInstalled: async () => existsSync(join(home, '.opencode')),
  },
  windsurf: {
    name: 'windsurf',
    displayName: 'Windsurf',
    dirs: makeDirs('.windsurf'),
    globalDirs: makeDirs(join(home, '.windsurf')),
    detectInstalled: async () => existsSync(join(home, '.codeium')),
  },
  cline: {
    name: 'cline',
    displayName: 'Cline',
    dirs: makeDirs('.cline'),
    globalDirs: makeDirs(join(home, '.cline')),
    detectInstalled: async () => existsSync(join(home, '.cline')),
  },
  continue: {
    name: 'continue',
    displayName: 'Continue',
    dirs: makeDirs('.continue'),
    globalDirs: makeDirs(join(home, '.continue')),
    detectInstalled: async () => existsSync(join(home, '.continue')),
  },
  roo: {
    name: 'roo',
    displayName: 'Roo',
    dirs: makeDirs('.roo'),
    globalDirs: makeDirs(join(home, '.roo')),
    detectInstalled: async () => existsSync(join(home, '.roo')),
  },
  'gemini-cli': {
    name: 'gemini-cli',
    displayName: 'Gemini CLI',
    dirs: makeDirs('.gemini'),
    globalDirs: makeDirs(join(home, '.gemini')),
    detectInstalled: async () => existsSync(join(home, '.gemini')),
  },
  universal: {
    name: 'universal',
    displayName: 'Universal',
    dirs: makeDirs('.agents'),
    globalDirs: makeDirs(join(home, '.agents')),
    detectInstalled: async () => true,
  },
};

export async function detectInstalledAgents(): Promise<AgentType[]> {
  const results = await Promise.all(
    (Object.values(agents) as AgentConfig[]).map(async (a) => ({
      name: a.name,
      installed: await a.detectInstalled(),
    }))
  );
  return results.filter((r) => r.installed).map((r) => r.name);
}

export function isUniversalAgent(agentType: AgentType): boolean {
  return agentType === 'universal';
}
