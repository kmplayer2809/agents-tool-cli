import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { LockFile, LockEntry, AssetType, AgentType } from './types.js';
import { LOCK_FILE, GLOBAL_LOCK_FILE } from './constants.js';

function getLockPath(global: boolean, cwd?: string): string {
  if (global) {
    return join(homedir(), GLOBAL_LOCK_FILE);
  }
  return join(cwd || process.cwd(), LOCK_FILE);
}

export async function readLockFile(global = false, cwd?: string): Promise<LockFile> {
  const lockPath = getLockPath(global, cwd);
  if (!existsSync(lockPath)) {
    return { version: 1, entries: [] };
  }
  try {
    const raw = await readFile(lockPath, 'utf-8');
    return JSON.parse(raw) as LockFile;
  } catch {
    return { version: 1, entries: [] };
  }
}

export async function writeLockFile(lock: LockFile, global = false, cwd?: string): Promise<void> {
  const lockPath = getLockPath(global, cwd);
  await writeFile(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf-8');
}

export async function addToLock(
  entry: Omit<LockEntry, 'installedAt'>,
  global = false,
  cwd?: string
): Promise<void> {
  const lock = await readLockFile(global, cwd);
  const existingIdx = lock.entries.findIndex(
    (e) => e.source === entry.source && e.assetType === entry.assetType
  );

  const newEntry: LockEntry = {
    ...entry,
    installedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    lock.entries[existingIdx] = newEntry;
  } else {
    lock.entries.push(newEntry);
  }

  await writeLockFile(lock, global, cwd);
}

export async function removeFromLock(
  source: string,
  assetType: AssetType,
  global = false,
  cwd?: string
): Promise<void> {
  const lock = await readLockFile(global, cwd);
  lock.entries = lock.entries.filter(
    (e) => !(e.source === source && e.assetType === assetType)
  );
  await writeLockFile(lock, global, cwd);
}
