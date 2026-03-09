import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.nuxt', 'out', 'coverage', '.cache']);

/**
 * Recursively walk a directory and collect all files matching the given filename.
 * Skips common non-source directories (.git, node_modules, dist, etc.).
 */
export function walkForFile(dir: string, filename: string, found: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return found;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const entryPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(entryPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      walkForFile(entryPath, filename, found);
    } else if (entry === filename) {
      found.push(entryPath);
    }
  }

  return found;
}
