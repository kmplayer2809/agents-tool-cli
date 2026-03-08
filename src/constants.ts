export const AGENTS_DIR = '.agents';
export const SKILLS_SUBDIR = 'skills';
export const RULES_SUBDIR = 'rules';
export const MCP_SUBDIR = 'mcp';

export const SKILL_FILE = 'SKILL.md';
export const RULE_FILE = 'RULE.md';
export const MCP_FILE = 'MCP.md';

export const LOCK_FILE = 'agents-tool-lock.json';
export const GLOBAL_LOCK_FILE = '.agents-tool-lock.json';

export const ASSET_SUBDIRS: Record<string, string> = {
  skills: SKILLS_SUBDIR,
  rules: RULES_SUBDIR,
  mcp: MCP_SUBDIR,
};

export const ASSET_FILES: Record<string, string> = {
  skills: SKILL_FILE,
  rules: RULE_FILE,
  mcp: MCP_FILE,
};
