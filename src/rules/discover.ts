import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import matter from 'gray-matter';
import type { Asset } from '../types.js';
import { RULE_FILE } from '../constants.js';
import { walkForFile } from '../walk.js';

export function discoverRules(repoPath: string, subpath?: string): Asset[] {
  const basePath = subpath ? join(repoPath, subpath) : repoPath;
  const assets: Asset[] = [];

  // 1. Check rules/ subdirectory first (standard layout)
  const rulesDir = join(basePath, 'rules');
  if (existsSync(rulesDir) && statSync(rulesDir).isDirectory()) {
    const entries = readdirSync(rulesDir);
    for (const entry of entries) {
      const entryPath = join(rulesDir, entry);
      if (!statSync(entryPath).isDirectory()) continue;
      const ruleFile = join(entryPath, RULE_FILE);
      if (existsSync(ruleFile)) {
        const asset = parseAssetFile(ruleFile, entry);
        if (asset) assets.push(asset);
      }
    }
  }

  // 2. Root-level RULE.md fallback
  if (assets.length === 0) {
    const rootRuleFile = join(basePath, RULE_FILE);
    if (existsSync(rootRuleFile)) {
      const asset = parseAssetFile(rootRuleFile, basename(basePath));
      if (asset) assets.push(asset);
    }
  }

  // 3. Recursive scan fallback — finds RULE.md anywhere in the tree
  //    (handles repos with non-standard layouts)
  if (assets.length === 0) {
    const allFiles = walkForFile(basePath, RULE_FILE);
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
