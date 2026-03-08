export type AssetType = 'skills' | 'rules' | 'mcp';

export type AgentType =
  | 'claude-code'
  | 'cursor'
  | 'codex'
  | 'opencode'
  | 'windsurf'
  | 'cline'
  | 'continue'
  | 'roo'
  | 'gemini-cli'
  | 'universal';

export interface AgentConfig {
  name: AgentType;
  displayName: string;
  dirs: Record<AssetType, string>;
  globalDirs: Record<AssetType, string | undefined>;
  detectInstalled: () => Promise<boolean>;
}

export interface ParsedSource {
  type: 'github' | 'gitlab' | 'git' | 'local';
  url: string;
  subpath?: string;
  localPath?: string;
  ref?: string;
  assetFilter?: string;
}

export interface Asset {
  name: string;
  description: string;
  path: string;
  rawContent?: string;
  metadata?: Record<string, unknown>;
}

export interface AddOptions {
  source: string;
  assetType: AssetType;
  global: boolean;
  agents: AgentType[] | '*';
  assets: string[] | '*';
  list: boolean;
  yes: boolean;
  copy: boolean;
  all: boolean;
}

export interface LockEntry {
  source: string;
  assetType: AssetType;
  assets: string[];
  agents: AgentType[];
  installedAt: string;
  hash?: string;
}

export interface LockFile {
  version: 1;
  entries: LockEntry[];
}
