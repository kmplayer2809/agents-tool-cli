import { runSkillsAdd } from './add.js';
import { runSkillsList } from './list.js';
import { runSkillsRemove } from './remove.js';
import { runSkillsFind } from './find.js';

export async function runSkillsCommand(subcommand: string, args: string[]): Promise<void> {
  const parsed = parseArgs(args);

  switch (subcommand) {
    case 'add':
    case 'a':
      if (!parsed.positional[0]) {
        console.error('Usage: --skills add <source>');
        process.exit(1);
      }
      await runSkillsAdd(parsed.positional[0], {
        skills: parsed.getAll('skill', 's'),
        global: parsed.has('global', 'g'),
        agentArgs: parsed.getAll('agent', 'a'),
        list: parsed.has('list', 'l'),
        yes: parsed.has('yes', 'y'),
        copy: parsed.has('copy'),
        all: parsed.has('all'),
      });
      break;

    case 'list':
    case 'ls':
      await runSkillsList({
        global: parsed.has('global', 'g'),
        agentArgs: parsed.getAll('agent', 'a'),
      });
      break;

    case 'remove':
    case 'rm':
      await runSkillsRemove(parsed.positional, {
        global: parsed.has('global', 'g'),
        agentArgs: parsed.getAll('agent', 'a'),
        yes: parsed.has('yes', 'y'),
        all: parsed.has('all'),
      });
      break;

    case 'find':
      await runSkillsFind(parsed.positional[0]);
      break;

    default:
      console.error(`Unknown skills subcommand: ${subcommand}`);
      console.error('Available: add, list, remove, find');
      process.exit(1);
  }
}

// Simple argv parser
function parseArgs(args: string[]) {
  const flags: Record<string, string[]> = {};
  const positional: string[] = [];

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        if (!flags[key]) flags[key] = [];
        while (args[i + 1] && !args[i + 1].startsWith('-')) {
          flags[key].push(args[i + 1]);
          i++;
        }
      } else {
        flags[key] = ['true'];
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        if (!flags[key]) flags[key] = [];
        while (args[i + 1] && !args[i + 1].startsWith('-')) {
          flags[key].push(args[i + 1]);
          i++;
        }
      } else {
        flags[key] = ['true'];
      }
    } else {
      positional.push(arg);
    }
    i++;
  }

  return {
    positional,
    flags,
    has: (...names: string[]) =>
      names.some(
        (n) =>
          flags[n]?.[0] === 'true' ||
          (flags[n] && flags[n].length > 0 && flags[n][0] !== 'true')
      ),
    get: (name: string, short?: string): string | undefined =>
      flags[name]?.[0] || (short ? flags[short]?.[0] : undefined),
    getAll: (...names: string[]): string[] => {
      const result: string[] = [];
      for (const name of names) {
        if (flags[name]) result.push(...flags[name].filter((v) => v !== 'true'));
      }
      return result;
    },
  };
}
