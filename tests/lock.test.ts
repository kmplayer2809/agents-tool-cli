import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { readLockFile, writeLockFile, addToLock, removeFromLock } from '../src/lock.js';

describe('lock file', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `test-lock-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty lock when file does not exist', async () => {
    const lock = await readLockFile(false, tmpDir);
    expect(lock.version).toBe(1);
    expect(lock.entries).toHaveLength(0);
  });

  it('writes and reads lock file', async () => {
    const lock = { version: 1 as const, entries: [] };
    await writeLockFile(lock, false, tmpDir);
    const read = await readLockFile(false, tmpDir);
    expect(read.version).toBe(1);
  });

  it('adds entry to lock', async () => {
    await addToLock({
      source: 'https://github.com/owner/repo',
      assetType: 'skills',
      assets: ['my-skill'],
      agents: ['claude-code'],
    }, false, tmpDir);

    const lock = await readLockFile(false, tmpDir);
    expect(lock.entries).toHaveLength(1);
    expect(lock.entries[0].source).toBe('https://github.com/owner/repo');
    expect(lock.entries[0].assetType).toBe('skills');
  });

  it('removes entry from lock', async () => {
    await addToLock({
      source: 'https://github.com/owner/repo',
      assetType: 'skills',
      assets: ['my-skill'],
      agents: ['claude-code'],
    }, false, tmpDir);

    await removeFromLock('https://github.com/owner/repo', 'skills', false, tmpDir);
    const lock = await readLockFile(false, tmpDir);
    expect(lock.entries).toHaveLength(0);
  });
});
