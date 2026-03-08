import { describe, it, expect } from 'vitest';
import { parseSource } from '../src/source-parser.js';

describe('parseSource', () => {
  it('parses GitHub shorthand', () => {
    const result = parseSource('vercel-labs/agent-skills');
    expect(result.type).toBe('github');
    expect(result.url).toBe('https://github.com/vercel-labs/agent-skills.git');
  });

  it('parses full GitHub URL', () => {
    const result = parseSource('https://github.com/owner/repo');
    expect(result.type).toBe('github');
    expect(result.url).toBe('https://github.com/owner/repo.git');
  });

  it('parses GitHub URL with subpath', () => {
    const result = parseSource('https://github.com/owner/repo/tree/main/skills/my-skill');
    expect(result.type).toBe('github');
    expect(result.ref).toBe('main');
    expect(result.subpath).toBe('skills/my-skill');
  });

  it('parses GitLab URL', () => {
    const result = parseSource('https://gitlab.com/org/repo');
    expect(result.type).toBe('gitlab');
  });

  it('parses SSH git URL', () => {
    const result = parseSource('git@github.com:owner/repo.git');
    expect(result.type).toBe('git');
  });

  it('parses local path', () => {
    const result = parseSource('./my-local-skills');
    expect(result.type).toBe('local');
    expect(result.localPath).toBe('./my-local-skills');
  });

  it('throws on invalid source', () => {
    expect(() => parseSource('not-valid')).toThrow();
  });
});
