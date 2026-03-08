import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';
import matter from 'gray-matter';
import type { Asset } from '../types.js';
import { RULE_FILE } from '../constants.js';

export function discoverRules(repoPath: string, subpath?: string): Asset[] {
  const basePath = subpath ? join(repoPath, subpath) : repoPath;
  const assets: Asset[] = [];

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

  if (assets.length === 0) {
    const rootRuleFile = join(basePath, RULE_FILE);
    if (existsSync(rootRuleFile)) {
      const asset = parseAssetFile(rootRuleFile, basename(basePath));
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
