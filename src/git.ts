import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import simpleGit from 'simple-git';
import type { ParsedSource } from './types.js';

export class GitCloneError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'GitCloneError';
  }
}

export async function cloneRepo(source: ParsedSource): Promise<string> {
  const prefix = join(tmpdir(), 'htrongdi-agents-');
  const tmpDir = await mkdtemp(prefix);

  try {
    const git = simpleGit();
    const cloneOptions: string[] = ['--depth', '1'];

    if (source.ref) {
      cloneOptions.push('--branch', source.ref);
    }

    await git.clone(source.url, tmpDir, cloneOptions);
    return tmpDir;
  } catch (err) {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    throw new GitCloneError(
      `Failed to clone ${source.url}: ${err instanceof Error ? err.message : String(err)}`,
      err
    );
  }
}

export async function cleanupTempDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true }).catch(() => {});
}
