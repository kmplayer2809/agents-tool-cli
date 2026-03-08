import pc from 'picocolors';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import matter from 'gray-matter';

export async function runMcpList(options: { global: boolean; agentArgs: string[] }): Promise<void> {
  const { global: isGlobal } = options;
  const baseDir = isGlobal ? homedir() : process.cwd();

  const canonicalDir = join(baseDir, '.agents', 'mcp');

  console.log(pc.bold('\nInstalled MCP Servers\n'));

  if (existsSync(canonicalDir)) {
    const mcps = readdirSync(canonicalDir).filter((f) =>
      statSync(join(canonicalDir, f)).isDirectory()
    );

    if (mcps.length === 0) {
      console.log(pc.dim('  No MCP servers installed.\n'));
      return;
    }

    for (const mcpDir of mcps) {
      const mcpPath = join(canonicalDir, mcpDir);
      const mcpMd = join(mcpPath, 'MCP.md');
      const mcpJson = join(mcpPath, 'mcp.json');
      let name = mcpDir;
      let description = '';

      if (existsSync(mcpMd)) {
        try {
          const { data } = matter(readFileSync(mcpMd, 'utf-8'));
          name = (data.name as string) || mcpDir;
          description = (data.description as string) || '';
        } catch {
          // ignore
        }
      } else if (existsSync(mcpJson)) {
        try {
          const data = JSON.parse(readFileSync(mcpJson, 'utf-8')) as Record<string, unknown>;
          name = (data.name as string) || mcpDir;
          description = (data.description as string) || '';
        } catch {
          // ignore
        }
      }

      console.log(`  ${pc.cyan(name)}${description ? pc.dim(' — ' + description) : ''}`);
    }
    console.log();
  } else {
    console.log(pc.dim('  No MCP servers installed.\n'));
  }
}
