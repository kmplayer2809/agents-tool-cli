import type { ParsedSource } from './types.js';

const GITHUB_SHORTHAND = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const SSH_GIT_URL = /^git@([^:]+):(.+)\.git$/;

export function parseSource(input: string): ParsedSource {
  const trimmed = input.trim();

  // Local path
  if (trimmed.startsWith('./') || trimmed.startsWith('../') || trimmed.startsWith('/')) {
    return {
      type: 'local',
      url: trimmed,
      localPath: trimmed,
    };
  }

  // SSH git URL
  const sshMatch = trimmed.match(SSH_GIT_URL);
  if (sshMatch) {
    return {
      type: 'git',
      url: trimmed,
    };
  }

  // GitHub URL with optional subpath
  if (trimmed.startsWith('https://github.com/') || trimmed.startsWith('http://github.com/')) {
    return parseGitHubUrl(trimmed);
  }

  // GitLab URL
  if (trimmed.startsWith('https://gitlab.com/') || trimmed.startsWith('http://gitlab.com/')) {
    return parseGitLabUrl(trimmed);
  }

  // Generic git URL
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.endsWith('.git')) {
    return {
      type: 'git',
      url: trimmed,
    };
  }

  // GitHub shorthand: owner/repo
  if (GITHUB_SHORTHAND.test(trimmed)) {
    return {
      type: 'github',
      url: `https://github.com/${trimmed}.git`,
    };
  }

  throw new Error(`Cannot parse source: "${input}"`);
}

function parseGitHubUrl(url: string): ParsedSource {
  // https://github.com/owner/repo/tree/branch/path/to/dir
  const treeMatch = url.match(/^https?:\/\/github\.com\/([^/]+\/[^/]+)\/tree\/([^/]+)\/(.+)$/);
  if (treeMatch) {
    const [, ownerRepo, ref, subpath] = treeMatch;
    return {
      type: 'github',
      url: `https://github.com/${ownerRepo}.git`,
      ref,
      subpath,
    };
  }

  // https://github.com/owner/repo
  const repoMatch = url.match(/^https?:\/\/github\.com\/([^/]+\/[^/]+?)(\.git)?(\/?)?$/);
  if (repoMatch) {
    const [, ownerRepo] = repoMatch;
    return {
      type: 'github',
      url: `https://github.com/${ownerRepo}.git`,
    };
  }

  return {
    type: 'github',
    url,
  };
}

function parseGitLabUrl(url: string): ParsedSource {
  const treeMatch = url.match(/^https?:\/\/gitlab\.com\/([^/]+\/[^/]+)\/-\/tree\/([^/]+)\/(.+)$/);
  if (treeMatch) {
    const [, ownerRepo, ref, subpath] = treeMatch;
    return {
      type: 'gitlab',
      url: `https://gitlab.com/${ownerRepo}.git`,
      ref,
      subpath,
    };
  }

  const repoMatch = url.match(/^https?:\/\/gitlab\.com\/([^/]+\/[^/]+?)(\.git)?(\/?)?$/);
  if (repoMatch) {
    const [, ownerRepo] = repoMatch;
    return {
      type: 'gitlab',
      url: `https://gitlab.com/${ownerRepo}.git`,
    };
  }

  return {
    type: 'gitlab',
    url,
  };
}

export function getCloneUrl(source: ParsedSource): string {
  return source.url;
}
