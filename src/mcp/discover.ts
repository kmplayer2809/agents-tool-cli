import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';
import matter from 'gray-matter';
import type { Asset } from '../types.js';
import { MCP_FILE } from '../constants.js';

export function discoverMcp(repoPath: string, subpath?: string): Asset[] {
  const basePath = subpath ? join(repoPath, subpath) : repoPath;
  const assets: Asset[] = [];

  const mcpDir = join(basePath, 'mcp');
  if (existsSync(mcpDir) && statSync(mcpDir).isDirectory()) {
    const entries = readdirSync(mcpDir);
    for (const entry of entries) {
      const entryPath = join(mcpDir, entry);
      if (!statSync(entryPath).isDirectory()) continue;

      // Try MCP.md first, then mcp.json
      const mcpMdFile = join(entryPath, MCP_FILE);
      const mcpJsonFile = join(entryPath, 'mcp.json');

      if (existsSync(mcpMdFile)) {
        const asset = parseMdFile(mcpMdFile, entry);
        if (asset) assets.push(asset);
      } else if (existsSync(mcpJsonFile)) {
        const asset = parseJsonFile(mcpJsonFile, entry);
        if (asset) assets.push(asset);
      }
    }
  }

  if (assets.length === 0) {
    const rootMcpFile = join(basePath, MCP_FILE);
    if (existsSync(rootMcpFile)) {
      const asset = parseMdFile(rootMcpFile, basename(basePath));
      if (asset) assets.push(asset);
    }
  }

  return assets;
}

function parseMdFile(filePath: string, fallbackName: string): Asset | null {
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

function parseJsonFile(filePath: string, fallbackName: string): Asset | null {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    return {
      name: (data.name as string) || fallbackName,
      description: (data.description as string) || '',
      path: filePath,
      rawContent: raw,
      metadata: data,
    };
  } catch {
    return null;
  }
}
