import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import matter from 'gray-matter';
import type { Asset } from '../types.js';
import { SKILL_FILE } from '../constants.js';
import { walkForFile } from '../walk.js';

export function discoverSkills(repoPath: string, subpath?: string): Asset[] {
  const basePath = subpath ? join(repoPath, subpath) : repoPath;
  const assets: Asset[] = [];

  // 1. Check skills/ subdirectory first (standard layout)
  const skillsDir = join(basePath, 'skills');
  if (existsSync(skillsDir) && statSync(skillsDir).isDirectory()) {
    const entries = readdirSync(skillsDir);
    for (const entry of entries) {
      const entryPath = join(skillsDir, entry);
      if (!statSync(entryPath).isDirectory()) continue;
      const skillFile = join(entryPath, SKILL_FILE);
      if (existsSync(skillFile)) {
        const asset = parseAssetFile(skillFile, entry);
        if (asset) assets.push(asset);
      }
    }
  }

  // 2. Root-level SKILL.md fallback
  if (assets.length === 0) {
    const rootSkillFile = join(basePath, SKILL_FILE);
    if (existsSync(rootSkillFile)) {
      const asset = parseAssetFile(rootSkillFile, basename(basePath));
      if (asset) assets.push(asset);
    }
  }

  // 3. Recursive scan fallback — finds SKILL.md anywhere in the tree
  //    (handles repos with non-standard layouts, e.g. plugins/<name>/skills/<skill>/SKILL.md)
  if (assets.length === 0) {
    const allFiles = walkForFile(basePath, SKILL_FILE);
    for (const filePath of allFiles) {
      const asset = parseAssetFile(filePath, basename(dirname(filePath)));
      if (asset) assets.push(asset);
    }
  }

  return assets;
}

function parseAssetFile(filePath: string, fallbackName: string): Asset | null {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const { data } = matter(raw);
    return {
      name: (data.name as string) || fallbackName,
      description: (data.description as string) || '',
      path: filePath,
      rawContent: raw,
      metadata: data as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}
