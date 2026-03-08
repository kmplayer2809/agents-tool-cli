import pc from 'picocolors';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import matter from 'gray-matter';
import type { AgentType } from '../types.js';

export async function runSkillsList(options: { global: boolean; agentArgs: string[] }): Promise<void> {
  const { global: isGlobal } = options;
  const baseDir = isGlobal ? homedir() : process.cwd();

  // List from canonical location
  const canonicalDir = join(baseDir, '.agents', 'skills');

  console.log(pc.bold('\nInstalled Skills\n'));

  if (existsSync(canonicalDir)) {
    const skills = readdirSync(canonicalDir).filter((f) =>
      statSync(join(canonicalDir, f)).isDirectory()
    );

    if (skills.length === 0) {
      console.log(pc.dim('  No skills installed.\n'));
      return;
    }

    for (const skillDir of skills) {
      const skillPath = join(canonicalDir, skillDir);
      const skillMd = join(skillPath, 'SKILL.md');
      let name = skillDir;
      let description = '';

      if (existsSync(skillMd)) {
        try {
          const { data } = matter(readFileSync(skillMd, 'utf-8'));
          name = (data.name as string) || skillDir;
          description = (data.description as string) || '';
        } catch {
          // ignore
        }
      }

      console.log(`  ${pc.cyan(name)}${description ? pc.dim(' — ' + description) : ''}`);
    }
    console.log();
  } else {
    console.log(pc.dim('  No skills installed.\n'));
  }
}
