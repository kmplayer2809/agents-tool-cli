import { mkdir, cp, symlink, lstat, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve, normalize, relative, dirname, sep } from 'path';
import { homedir } from 'os';
import pc from 'picocolors';
import type { Asset, AgentType, AssetType } from '../types.js';
import { agents, isUniversalAgent } from '../agents.js';
import { AGENTS_DIR } from '../constants.js';

/**
 * Platform-aware directory symlink creation.
 * On Windows: uses 'junction' type — works without admin/Developer Mode.
 * On other platforms: standard symlink with no type argument.
 */
async function createDirSymlink(target: string, linkPath: string): Promise<void> {
  if (process.platform === 'win32') {
    await symlink(target, linkPath, 'junction');
  } else {
    await symlink(target, linkPath);
  }
}

export type InstallMode = 'symlink' | 'copy';

export interface InstallResult {
  success: boolean;
  path: string;
  mode: InstallMode;
  error?: string;
}

export function sanitizeName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, '-')
    .replace(/^[.\-]+|[.\-]+$/g, '');
  return sanitized.substring(0, 255) || 'unnamed-asset';
}

function isPathSafe(basePath: string, targetPath: string): boolean {
  const normalizedBase = normalize(resolve(basePath));
  const normalizedTarget = normalize(resolve(targetPath));
  return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase;
}

export function getCanonicalDir(
  assetType: AssetType,
  assetName: string,
  global: boolean,
  cwd?: string
): string {
  const baseDir = global ? homedir() : cwd || process.cwd();
  return join(baseDir, AGENTS_DIR, assetType, sanitizeName(assetName));
}

export function getAgentDir(
  agentType: AgentType,
  assetType: AssetType,
  assetName: string,
  global: boolean,
  cwd?: string
): string {
  if (isUniversalAgent(agentType)) {
    return getCanonicalDir(assetType, assetName, global, cwd);
  }

  const agent = agents[agentType];
  const baseDir = global ? homedir() : cwd || process.cwd();
  const agentDirs = global ? agent.globalDirs : agent.dirs;
  const assetSubDir = agentDirs[assetType];

  if (!assetSubDir) {
    return join(baseDir, AGENTS_DIR, assetType, sanitizeName(assetName));
  }

  return join(global ? '' : baseDir, assetSubDir, sanitizeName(assetName)).replace(/^\//, '');
}

export async function installAsset(
  asset: Asset,
  assetType: AssetType,
  agentType: AgentType,
  options: {
    global: boolean;
    mode: InstallMode;
    cwd?: string;
  }
): Promise<InstallResult> {
  const { global: isGlobal, mode, cwd } = options;
  const canonicalDir = getCanonicalDir(assetType, asset.name, isGlobal, cwd);
  const assetSrcDir = dirname(asset.path);

  // Validate source path safety
  if (!isPathSafe(assetSrcDir, asset.path)) {
    return { success: false, path: canonicalDir, mode, error: 'Path traversal detected' };
  }

  try {
    // Step 1: Copy asset to canonical location
    await mkdir(canonicalDir, { recursive: true });
    await cp(assetSrcDir, canonicalDir, { recursive: true, force: true });

    if (isUniversalAgent(agentType)) {
      return { success: true, path: canonicalDir, mode };
    }

    // Step 2: Create agent-specific symlink or copy
    const baseDir = isGlobal ? homedir() : cwd || process.cwd();
    const agentConfig = agents[agentType];
    const agentDirs = isGlobal ? agentConfig.globalDirs : agentConfig.dirs;
    const agentAssetSubDir = agentDirs[assetType];

    if (!agentAssetSubDir) {
      return { success: true, path: canonicalDir, mode };
    }

    const agentTargetDir = isGlobal
      ? join(agentAssetSubDir, sanitizeName(asset.name))
      : join(baseDir, agentAssetSubDir, sanitizeName(asset.name));

    await mkdir(dirname(agentTargetDir), { recursive: true });

    if (mode === 'symlink') {
      // Remove existing symlink or stale junction (Windows junctions: isSymbolicLink() === false)
      if (existsSync(agentTargetDir)) {
        const stat = await lstat(agentTargetDir);
        if (stat.isSymbolicLink() || (process.platform === 'win32' && stat.isDirectory())) {
          await rm(agentTargetDir, { recursive: true });
        }
      }

      const symlinkTarget = relative(dirname(agentTargetDir), canonicalDir);
      try {
        await createDirSymlink(symlinkTarget, agentTargetDir);
      } catch (symlinkErr) {
        const code = (symlinkErr as NodeJS.ErrnoException).code;
        if (process.platform === 'win32' && (code === 'EPERM' || code === 'EACCES')) {
          // Fallback: copy instead of symlink on Windows when privilege is missing
          console.warn(pc.dim('  ⚠ Symlink failed on Windows (EPERM); copied instead'));
          await cp(canonicalDir, agentTargetDir, { recursive: true, force: true });
          return { success: true, path: agentTargetDir, mode: 'copy' };
        }
        throw symlinkErr;
      }
    } else {
      await cp(canonicalDir, agentTargetDir, { recursive: true, force: true });
    }

    return { success: true, path: agentTargetDir, mode };
  } catch (err) {
    return {
      success: false,
      path: canonicalDir,
      mode,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function uninstallAsset(
  assetType: AssetType,
  assetName: string,
  agentType: AgentType,
  global: boolean,
  cwd?: string
): Promise<boolean> {
  try {
    const canonicalDir = getCanonicalDir(assetType, assetName, global, cwd);

    if (!isUniversalAgent(agentType)) {
      const baseDir = global ? homedir() : cwd || process.cwd();
      const agentConfig = agents[agentType];
      const agentDirs = global ? agentConfig.globalDirs : agentConfig.dirs;
      const agentAssetSubDir = agentDirs[assetType];

      if (agentAssetSubDir) {
        const agentTargetDir = global
          ? join(agentAssetSubDir, sanitizeName(assetName))
          : join(baseDir, agentAssetSubDir, sanitizeName(assetName));

        if (existsSync(agentTargetDir)) {
          await rm(agentTargetDir, { recursive: true, force: true });
        }
      }
    }

    if (existsSync(canonicalDir)) {
      await rm(canonicalDir, { recursive: true, force: true });
    }

    return true;
  } catch {
    return false;
  }
}
