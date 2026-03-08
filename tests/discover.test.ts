import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { discoverSkills } from '../src/skills/discover.js';

describe('discoverSkills', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `test-discover-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('discovers skills in skills/ subdirectory', () => {
    const skillDir = join(tmpDir, 'skills', 'my-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: My Skill\ndescription: A test skill\n---\n\nContent');

    const skills = discoverSkills(tmpDir);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('My Skill');
    expect(skills[0].description).toBe('A test skill');
  });

  it('discovers root SKILL.md as fallback', () => {
    writeFileSync(join(tmpDir, 'SKILL.md'), '---\nname: Root Skill\ndescription: Root level\n---\n\nContent');

    const skills = discoverSkills(tmpDir);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('Root Skill');
  });

  it('prefers skills/ subdirectory over root', () => {
    const skillDir = join(tmpDir, 'skills', 'sub-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: Sub Skill\n---\nContent');
    writeFileSync(join(tmpDir, 'SKILL.md'), '---\nname: Root Skill\n---\nContent');

    const skills = discoverSkills(tmpDir);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('Sub Skill');
  });

  it('returns empty array when no skills found', () => {
    const skills = discoverSkills(tmpDir);
    expect(skills).toHaveLength(0);
  });
});
