import pc from 'picocolors';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import matter from 'gray-matter';

export async function runRulesList(options: { global: boolean; agentArgs: string[] }): Promise<void> {
  const { global: isGlobal } = options;
  const baseDir = isGlobal ? homedir() : process.cwd();

  const canonicalDir = join(baseDir, '.agents', 'rules');

  console.log(pc.bold('\nInstalled Rules\n'));

  if (existsSync(canonicalDir)) {
    const rules = readdirSync(canonicalDir).filter((f) =>
      statSync(join(canonicalDir, f)).isDirectory()
    );

    if (rules.length === 0) {
      console.log(pc.dim('  No rules installed.\n'));
      return;
    }

    for (const ruleDir of rules) {
      const rulePath = join(canonicalDir, ruleDir);
      const ruleMd = join(rulePath, 'RULE.md');
      let name = ruleDir;
      let description = '';

      if (existsSync(ruleMd)) {
        try {
          const { data } = matter(readFileSync(ruleMd, 'utf-8'));
          name = (data.name as string) || ruleDir;
          description = (data.description as string) || '';
        } catch {
          // ignore
        }
      }

      console.log(`  ${pc.cyan(name)}${description ? pc.dim(' — ' + description) : ''}`);
    }
    console.log();
  } else {
    console.log(pc.dim('  No rules installed.\n'));
  }
}
